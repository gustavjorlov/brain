import { assertEquals, assertExists } from "@std/assert";
import { Storage } from "../src/storage/database.ts";
import type { RepositoryInfo, WorkNote } from "../src/storage/models.ts";

// Test storage directory
const TEST_STORAGE_PATH = "./test-storage-repo";

// Helper function to create repository info
function createRepositoryInfo(path: string): RepositoryInfo {
  return {
    path,
    identifier: path,
  };
}

// Helper function to create a test WorkNote
function createTestWorkNote(
  id: string,
  message: string,
  repositoryPath: string,
  branch: string = "main",
  timestamp?: string,
): WorkNote {
  return {
    id,
    message,
    timestamp: timestamp || new Date().toISOString(),
    gitContext: {
      currentBranch: branch,
      recentCommits: [],
      workingDirectoryChanges: {
        staged: [],
        unstaged: [],
        untracked: [],
      },
      repositoryPath,
    },
    repositoryInfo: createRepositoryInfo(repositoryPath),
  };
}

// Clean up test storage before and after tests
async function cleanupTestStorage() {
  try {
    await Deno.remove(TEST_STORAGE_PATH, { recursive: true });
  } catch {
    // Directory might not exist, that's fine
  }
}

Deno.test("Storage should save contexts from different repositories", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Create contexts from different repositories
  const contextA = createTestWorkNote(
    "note-repo-a-1",
    "debugging auth in repo A",
    "/Users/dev/project-a",
  );

  const contextB = createTestWorkNote(
    "note-repo-b-1",
    "implementing feature in repo B",
    "/Users/dev/project-b",
  );

  // Save both contexts
  await storage.saveWorkNote(contextA);
  await storage.saveWorkNote(contextB);

  // Both should be retrievable by ID
  const retrievedA = storage.getWorkNote("note-repo-a-1");
  const retrievedB = storage.getWorkNote("note-repo-b-1");

  assertExists(retrievedA);
  assertExists(retrievedB);
  assertEquals(retrievedA.repositoryInfo.identifier, "/Users/dev/project-a");
  assertEquals(retrievedB.repositoryInfo.identifier, "/Users/dev/project-b");

  await cleanupTestStorage();
});

Deno.test("Storage should filter contexts by current repository", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Create multiple contexts from different repositories with specific timestamps
  const contexts = [
    createTestWorkNote(
      "note-a-1",
      "context A1",
      "/Users/dev/project-a",
      "main",
      "2025-01-15T10:00:00Z",
    ),
    createTestWorkNote(
      "note-a-2",
      "context A2",
      "/Users/dev/project-a",
      "main",
      "2025-01-15T11:00:00Z",
    ),
    createTestWorkNote(
      "note-b-1",
      "context B1",
      "/Users/dev/project-b",
      "main",
      "2025-01-15T10:30:00Z",
    ),
    createTestWorkNote(
      "note-b-2",
      "context B2",
      "/Users/dev/project-b",
      "main",
      "2025-01-15T11:30:00Z",
    ),
    createTestWorkNote(
      "note-c-1",
      "context C1",
      "/Users/dev/project-c",
      "main",
      "2025-01-15T12:00:00Z",
    ),
  ];

  // Save all contexts
  for (const context of contexts) {
    await storage.saveWorkNote(context);
  }

  // Test repo-aware retrieval methods (these should be implemented)
  const repoAContexts = storage.getWorkNotesByRepository(
    "/Users/dev/project-a",
  );
  const repoBContexts = storage.getWorkNotesByRepository(
    "/Users/dev/project-b",
  );
  const repoCContexts = storage.getWorkNotesByRepository(
    "/Users/dev/project-c",
  );

  assertEquals(repoAContexts.length, 2);
  assertEquals(repoBContexts.length, 2);
  assertEquals(repoCContexts.length, 1);

  // Verify correct contexts are returned
  assertEquals(repoAContexts[0].message, "context A2"); // Most recent first
  assertEquals(repoAContexts[1].message, "context A1");
  assertEquals(repoBContexts[0].message, "context B2");
  assertEquals(repoCContexts[0].message, "context C1");

  await cleanupTestStorage();
});

Deno.test("Storage should get recent contexts filtered by repository", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Create multiple contexts with specific timestamps
  const contexts = [
    createTestWorkNote(
      "note-a-1",
      "old context A",
      "/Users/dev/project-a",
      "main",
      "2025-01-15T10:00:00Z",
    ),
    createTestWorkNote(
      "note-b-1",
      "old context B",
      "/Users/dev/project-b",
      "main",
      "2025-01-15T10:30:00Z",
    ),
    createTestWorkNote(
      "note-a-2",
      "new context A",
      "/Users/dev/project-a",
      "main",
      "2025-01-15T11:00:00Z",
    ),
    createTestWorkNote(
      "note-b-2",
      "new context B",
      "/Users/dev/project-b",
      "main",
      "2025-01-15T11:30:00Z",
    ),
  ];

  // Save all contexts
  for (const context of contexts) {
    await storage.saveWorkNote(context);
  }

  // Test repository-aware recent notes retrieval
  const recentA = storage.getRecentWorkNotes(2, "/Users/dev/project-a");
  const recentB = storage.getRecentWorkNotes(1, "/Users/dev/project-b");

  assertEquals(recentA.length, 2);
  assertEquals(recentB.length, 1);

  // Should be in reverse chronological order (newest first)
  assertEquals(recentA[0].message, "new context A");
  assertEquals(recentA[1].message, "old context A");
  assertEquals(recentB[0].message, "new context B");

  await cleanupTestStorage();
});

Deno.test("Storage should get latest context filtered by repository", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Create contexts from different repositories with specific timestamps
  const contexts = [
    createTestWorkNote(
      "note-a-1",
      "first context A",
      "/Users/dev/project-a",
      "main",
      "2025-01-15T10:00:00Z",
    ),
    createTestWorkNote(
      "note-b-1",
      "first context B",
      "/Users/dev/project-b",
      "main",
      "2025-01-15T10:30:00Z",
    ),
    createTestWorkNote(
      "note-a-2",
      "latest context A",
      "/Users/dev/project-a",
      "main",
      "2025-01-15T11:00:00Z",
    ),
  ];

  for (const context of contexts) {
    await storage.saveWorkNote(context);
  }

  // Test repository-aware latest note retrieval
  const latestA = storage.getLastWorkNote("/Users/dev/project-a");
  const latestB = storage.getLastWorkNote("/Users/dev/project-b");

  assertExists(latestA);
  assertExists(latestB);
  assertEquals(latestA.message, "latest context A");
  assertEquals(latestB.message, "first context B");

  await cleanupTestStorage();
});

Deno.test("Storage should handle same repo identification across different working directories", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Same repository, different path representations
  const repoRoot = "/Users/dev/project";
  const repoSubdir = "/Users/dev/project"; // Git analyzer should normalize to root

  const context1 = createTestWorkNote(
    "note-1",
    "from root",
    repoRoot,
  );

  const context2 = createTestWorkNote(
    "note-2",
    "from subdir",
    repoSubdir,
  );

  await storage.saveWorkNote(context1);
  await storage.saveWorkNote(context2);

  // Both should be found when querying for the repository
  const repoContexts = storage.getWorkNotesByRepository(repoRoot);
  assertEquals(repoContexts.length, 2);

  await cleanupTestStorage();
});

Deno.test("Storage should return empty array for repository with no contexts", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Add context for one repo
  const context = createTestWorkNote(
    "note-1",
    "context",
    "/Users/dev/project-a",
  );
  await storage.saveWorkNote(context);

  // Query different repo should return empty
  const emptyResults = storage.getWorkNotesByRepository("/Users/dev/project-b");
  assertEquals(emptyResults.length, 0);

  const noLatest = storage.getLastWorkNote("/Users/dev/project-b");
  assertEquals(noLatest, null);

  await cleanupTestStorage();
});

Deno.test("Storage should handle cross-repo isolation correctly", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Create contexts with similar content but different repos
  const contextA = createTestWorkNote(
    "note-a",
    "debugging auth middleware",
    "/Users/dev/project-a",
  );

  const contextB = createTestWorkNote(
    "note-b",
    "debugging auth middleware", // Same message, different repo
    "/Users/dev/project-b",
  );

  await storage.saveWorkNote(contextA);
  await storage.saveWorkNote(contextB);

  // Each repo should only see its own context
  const repoA = storage.getWorkNotesByRepository("/Users/dev/project-a");
  const repoB = storage.getWorkNotesByRepository("/Users/dev/project-b");

  assertEquals(repoA.length, 1);
  assertEquals(repoB.length, 1);
  assertEquals(repoA[0].id, "note-a");
  assertEquals(repoB[0].id, "note-b");

  // Latest for each repo should be different
  const latestA = storage.getLastWorkNote("/Users/dev/project-a");
  const latestB = storage.getLastWorkNote("/Users/dev/project-b");

  assertEquals(latestA?.id, "note-a");
  assertEquals(latestB?.id, "note-b");

  await cleanupTestStorage();
});
