import { assertEquals, assertExists } from "@std/assert";
import { Storage } from "../src/storage/database.ts";
import type { WorkNote } from "../src/storage/models.ts";

// Test storage directory
const TEST_MIGRATION_STORAGE = "./test-migration-storage";

// Legacy WorkNote interface (before repository info was added)
interface LegacyWorkNote {
  id: string;
  message: string;
  timestamp: string;
  gitContext: {
    currentBranch: string;
    recentCommits: unknown[];
    workingDirectoryChanges: {
      staged: string[];
      unstaged: string[];
      untracked: string[];
    };
    repositoryPath: string;
  };
  aiInterpretation?: unknown;
  // Notice: no repositoryInfo field
}

// Clean up test storage
async function cleanupTestStorage() {
  try {
    await Deno.remove(TEST_MIGRATION_STORAGE, { recursive: true });
  } catch {
    // Directory might not exist, that's fine
  }
}

// Helper to create legacy storage data
async function createLegacyStorageData() {
  const storage = new Storage(TEST_MIGRATION_STORAGE);
  await storage.initialize();

  // Create legacy contexts without repositoryInfo
  const legacyContexts: LegacyWorkNote[] = [
    {
      id: "legacy-note-1",
      message: "debugging auth in old format",
      timestamp: "2025-01-15T10:00:00Z",
      gitContext: {
        currentBranch: "main",
        recentCommits: [],
        workingDirectoryChanges: {
          staged: [],
          unstaged: [],
          untracked: [],
        },
        repositoryPath: "/Users/dev/legacy-project-a",
      },
    },
    {
      id: "legacy-note-2",
      message: "implementing feature in old format",
      timestamp: "2025-01-15T11:00:00Z",
      gitContext: {
        currentBranch: "feature/auth",
        recentCommits: [],
        workingDirectoryChanges: {
          staged: [],
          unstaged: [],
          untracked: [],
        },
        repositoryPath: "/Users/dev/legacy-project-b",
      },
    },
  ];

  // Directly write legacy data to storage file (bypassing current interface)
  const legacyData = {
    workNotes: legacyContexts.reduce((acc, note) => {
      acc[note.id] = note;
      return acc;
    }, {} as Record<string, LegacyWorkNote>),
  };

  const dataPath = `${TEST_MIGRATION_STORAGE}/contexts.json`;
  await Deno.writeTextFile(dataPath, JSON.stringify(legacyData, null, 2));
}

// Helper to add legacy data to existing storage without overwriting
async function addLegacyDataToExistingStorage() {
  const dataPath = `${TEST_MIGRATION_STORAGE}/contexts.json`;

  // Read existing data
  let existingData;
  try {
    const dataText = await Deno.readTextFile(dataPath);
    existingData = JSON.parse(dataText);
  } catch {
    existingData = { workNotes: {} };
  }

  // Create legacy contexts
  const legacyContexts: LegacyWorkNote[] = [
    {
      id: "legacy-note-1",
      message: "debugging auth in old format",
      timestamp: "2025-01-15T10:00:00Z",
      gitContext: {
        currentBranch: "main",
        recentCommits: [],
        workingDirectoryChanges: {
          staged: [],
          unstaged: [],
          untracked: [],
        },
        repositoryPath: "/Users/dev/legacy-project-a",
      },
    },
    {
      id: "legacy-note-2",
      message: "implementing feature in old format",
      timestamp: "2025-01-15T11:00:00Z",
      gitContext: {
        currentBranch: "feature/auth",
        recentCommits: [],
        workingDirectoryChanges: {
          staged: [],
          unstaged: [],
          untracked: [],
        },
        repositoryPath: "/Users/dev/legacy-project-b",
      },
    },
  ];

  // Merge legacy contexts with existing data
  for (const legacyContext of legacyContexts) {
    existingData.workNotes[legacyContext.id] = legacyContext;
  }

  // Write merged data back
  await Deno.writeTextFile(dataPath, JSON.stringify(existingData, null, 2));
}

Deno.test("Storage should detect and migrate legacy contexts without repositoryInfo", async () => {
  await cleanupTestStorage();

  // Create legacy storage data
  await createLegacyStorageData();

  // Initialize storage - this should trigger migration
  const storage = new Storage(TEST_MIGRATION_STORAGE);
  await storage.initialize();

  // All legacy contexts should now have repositoryInfo
  const allNotes = storage.getAllWorkNotes();
  assertEquals(allNotes.length, 2);

  for (const note of allNotes) {
    assertExists(note.repositoryInfo);
    assertExists(note.repositoryInfo.path);
    assertExists(note.repositoryInfo.identifier);

    // Repository info should be derived from gitContext.repositoryPath
    assertEquals(note.repositoryInfo.path, note.gitContext.repositoryPath);
    assertEquals(
      note.repositoryInfo.identifier,
      note.gitContext.repositoryPath,
    );
  }

  await cleanupTestStorage();
});

Deno.test("Storage should preserve existing contexts with repositoryInfo during migration", async () => {
  await cleanupTestStorage();

  // Create mixed storage: some with repositoryInfo, some without
  const storage = new Storage(TEST_MIGRATION_STORAGE);
  await storage.initialize();

  // Add a modern context with repositoryInfo
  const modernNote: WorkNote = {
    id: "modern-note-1",
    message: "modern context with repo info",
    timestamp: "2025-01-15T12:00:00Z",
    gitContext: {
      currentBranch: "main",
      recentCommits: [],
      workingDirectoryChanges: {
        staged: [],
        unstaged: [],
        untracked: [],
      },
      repositoryPath: "/Users/dev/modern-project",
    },
    repositoryInfo: {
      path: "/Users/dev/modern-project",
      identifier: "/Users/dev/modern-project",
    },
  };

  await storage.saveWorkNote(modernNote);

  // Add legacy data manually (without overwriting existing modern context)
  await addLegacyDataToExistingStorage();

  // Re-initialize storage to trigger migration
  const migratedStorage = new Storage(TEST_MIGRATION_STORAGE);
  await migratedStorage.initialize();

  // Should have 3 contexts total (1 modern + 2 migrated)
  const allNotes = migratedStorage.getAllWorkNotes();
  assertEquals(allNotes.length, 3);

  // Modern note should be unchanged
  const modernNoteAfter = migratedStorage.getWorkNote("modern-note-1");
  assertExists(modernNoteAfter);
  assertEquals(modernNoteAfter.message, "modern context with repo info");
  assertEquals(
    modernNoteAfter.repositoryInfo.path,
    "/Users/dev/modern-project",
  );

  // Legacy notes should be migrated
  const legacyNote1 = migratedStorage.getWorkNote("legacy-note-1");
  assertExists(legacyNote1);
  assertEquals(legacyNote1.message, "debugging auth in old format");
  assertExists(legacyNote1.repositoryInfo);
  assertEquals(legacyNote1.repositoryInfo.path, "/Users/dev/legacy-project-a");

  await cleanupTestStorage();
});

Deno.test("Storage should handle contexts with missing gitContext.repositoryPath", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_MIGRATION_STORAGE);
  await storage.initialize();

  // Create a context with missing repositoryPath (very old format)
  const veryLegacyContext = {
    id: "very-legacy-note-1",
    message: "very old context format",
    timestamp: "2025-01-15T09:00:00Z",
    gitContext: {
      currentBranch: "main",
      recentCommits: [],
      workingDirectoryChanges: {
        staged: [],
        unstaged: [],
        untracked: [],
      },
      // Missing repositoryPath
    },
  };

  // Write directly to storage
  const legacyData = {
    workNotes: {
      [veryLegacyContext.id]: veryLegacyContext,
    },
  };

  const dataPath = `${TEST_MIGRATION_STORAGE}/contexts.json`;
  await Deno.writeTextFile(dataPath, JSON.stringify(legacyData, null, 2));

  // Re-initialize storage
  const migratedStorage = new Storage(TEST_MIGRATION_STORAGE);
  await migratedStorage.initialize();

  // Context should be migrated with default repository info
  const migratedNote = migratedStorage.getWorkNote("very-legacy-note-1");
  assertExists(migratedNote);
  assertExists(migratedNote.repositoryInfo);
  assertEquals(migratedNote.repositoryInfo.path, "unknown");
  assertEquals(migratedNote.repositoryInfo.identifier, "unknown");

  await cleanupTestStorage();
});

Deno.test("Storage should preserve data integrity during migration", async () => {
  await cleanupTestStorage();

  // Create legacy data with various edge cases
  await createLegacyStorageData();

  // Initialize and migrate
  const storage = new Storage(TEST_MIGRATION_STORAGE);
  await storage.initialize();

  // Verify all original data is preserved
  const note1 = storage.getWorkNote("legacy-note-1");
  assertExists(note1);
  assertEquals(note1.message, "debugging auth in old format");
  assertEquals(note1.timestamp, "2025-01-15T10:00:00Z");
  assertEquals(note1.gitContext.currentBranch, "main");
  assertEquals(note1.gitContext.repositoryPath, "/Users/dev/legacy-project-a");

  const note2 = storage.getWorkNote("legacy-note-2");
  assertExists(note2);
  assertEquals(note2.message, "implementing feature in old format");
  assertEquals(note2.gitContext.currentBranch, "feature/auth");
  assertEquals(note2.gitContext.repositoryPath, "/Users/dev/legacy-project-b");

  // Repository-aware queries should work correctly after migration
  const projectANotes = storage.getWorkNotesByRepository(
    "/Users/dev/legacy-project-a",
  );
  assertEquals(projectANotes.length, 1);
  assertEquals(projectANotes[0].id, "legacy-note-1");

  const projectBNotes = storage.getWorkNotesByRepository(
    "/Users/dev/legacy-project-b",
  );
  assertEquals(projectBNotes.length, 1);
  assertEquals(projectBNotes[0].id, "legacy-note-2");

  await cleanupTestStorage();
});
