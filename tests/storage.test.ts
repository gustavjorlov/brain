import { assertEquals, assertExists, assertRejects } from "@std/assert";
import { Storage } from "../src/storage/database.ts";
import type { BrainConfig, WorkNote } from "../src/storage/models.ts";
import { ensureDir } from "@std/fs";
import { join } from "@std/path";

// Test storage directory
const TEST_STORAGE_PATH = "./test-storage";
const TEST_CONFIG_PATH = join(TEST_STORAGE_PATH, "config.json");
const TEST_DATA_PATH = join(TEST_STORAGE_PATH, "contexts.json");

// Clean up test storage before and after tests
async function cleanupTestStorage() {
  try {
    await Deno.remove(TEST_STORAGE_PATH, { recursive: true });
  } catch {
    // Ignore errors if directory doesn't exist
  }
}

Deno.test("Storage should initialize with default config", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  const config = await storage.getConfig();
  assertEquals(config.maxCommits, 10);
  assertEquals(config.aiModel, "gpt-4");
  assertEquals(config.enableAI, true);
  assertEquals(config.storagePath, TEST_STORAGE_PATH);
  assertEquals(config.openaiApiKey, undefined);

  await cleanupTestStorage();
});

Deno.test("Storage should save and retrieve work notes", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  const workNote: WorkNote = {
    id: "test-note-1",
    message: "debugging auth middleware",
    timestamp: "2025-01-15T10:30:00Z",
    gitContext: {
      currentBranch: "feature/auth",
      recentCommits: [],
      workingDirectoryChanges: {
        staged: [],
        unstaged: [],
        untracked: [],
      },
      repositoryPath: "/test/repo",
    },
  };

  await storage.saveWorkNote(workNote);

  const retrieved = await storage.getWorkNote("test-note-1");
  assertEquals(retrieved?.id, "test-note-1");
  assertEquals(retrieved?.message, "debugging auth middleware");
  assertEquals(retrieved?.gitContext.currentBranch, "feature/auth");

  await cleanupTestStorage();
});

Deno.test("Storage should return null for non-existent work note", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  const result = await storage.getWorkNote("non-existent");
  assertEquals(result, null);

  await cleanupTestStorage();
});

Deno.test("Storage should get latest work note", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  const note1: WorkNote = {
    id: "note-1",
    message: "first note",
    timestamp: "2025-01-15T10:00:00Z",
    gitContext: {
      currentBranch: "main",
      recentCommits: [],
      workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
      repositoryPath: "/test",
    },
  };

  const note2: WorkNote = {
    id: "note-2",
    message: "second note",
    timestamp: "2025-01-15T11:00:00Z",
    gitContext: {
      currentBranch: "feature/test",
      recentCommits: [],
      workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
      repositoryPath: "/test",
    },
  };

  await storage.saveWorkNote(note1);
  await storage.saveWorkNote(note2);

  const latest = await storage.getLatestWorkNote();
  assertEquals(latest?.id, "note-2");
  assertEquals(latest?.message, "second note");

  await cleanupTestStorage();
});

Deno.test("Storage should return null when no work notes exist", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  const latest = await storage.getLatestWorkNote();
  assertEquals(latest, null);

  await cleanupTestStorage();
});

Deno.test("Storage should get recent work notes with limit", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Create 5 work notes
  for (let i = 1; i <= 5; i++) {
    const note: WorkNote = {
      id: `note-${i}`,
      message: `message ${i}`,
      timestamp: `2025-01-15T1${i}:00:00Z`,
      gitContext: {
        currentBranch: "main",
        recentCommits: [],
        workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
        repositoryPath: "/test",
      },
    };
    await storage.saveWorkNote(note);
  }

  const recent = await storage.getRecentWorkNotes(3);
  assertEquals(recent.length, 3);

  // Should be in reverse chronological order (newest first)
  assertEquals(recent[0].id, "note-5");
  assertEquals(recent[1].id, "note-4");
  assertEquals(recent[2].id, "note-3");

  await cleanupTestStorage();
});

Deno.test("Storage should update config", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  await storage.updateConfig({
    openaiApiKey: "sk-test-key",
    maxCommits: 15,
    aiModel: "gpt-3.5-turbo",
    enableAI: false,
  });

  const config = await storage.getConfig();
  assertEquals(config.openaiApiKey, "sk-test-key");
  assertEquals(config.maxCommits, 15);
  assertEquals(config.aiModel, "gpt-3.5-turbo");
  assertEquals(config.enableAI, false);

  await cleanupTestStorage();
});

Deno.test("Storage should persist config across instances", async () => {
  await cleanupTestStorage();

  // First instance
  const storage1 = new Storage(TEST_STORAGE_PATH);
  await storage1.initialize();
  await storage1.updateConfig({ openaiApiKey: "sk-persistent-key" });

  // Second instance should load the same config
  const storage2 = new Storage(TEST_STORAGE_PATH);
  await storage2.initialize();
  const config = await storage2.getConfig();

  assertEquals(config.openaiApiKey, "sk-persistent-key");

  await cleanupTestStorage();
});

Deno.test("Storage should handle concurrent access safely", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Simulate concurrent saves
  const promises = [];
  for (let i = 0; i < 10; i++) {
    const note: WorkNote = {
      id: `concurrent-note-${i}`,
      message: `concurrent message ${i}`,
      timestamp: `2025-01-15T10:${i.toString().padStart(2, "0")}:00Z`,
      gitContext: {
        currentBranch: "concurrent-test",
        recentCommits: [],
        workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
        repositoryPath: "/test",
      },
    };
    promises.push(storage.saveWorkNote(note));
  }

  await Promise.all(promises);

  const recent = await storage.getRecentWorkNotes(10);
  assertEquals(recent.length, 10);

  await cleanupTestStorage();
});

Deno.test("Storage should validate storage path permissions", async () => {
  await cleanupTestStorage();

  const storage = new Storage("/invalid/read-only/path");

  await assertRejects(
    () => storage.initialize(),
    Error,
    "storage path",
  );
});

Deno.test("Storage should handle corrupted data files gracefully", async () => {
  await cleanupTestStorage();

  const storage = new Storage(TEST_STORAGE_PATH);
  await storage.initialize();

  // Write invalid JSON to contexts file
  await ensureDir(TEST_STORAGE_PATH);
  await Deno.writeTextFile(TEST_DATA_PATH, "invalid json content");

  // Should create new empty data structure and continue
  const workNote: WorkNote = {
    id: "recovery-test",
    message: "testing recovery",
    timestamp: "2025-01-15T10:30:00Z",
    gitContext: {
      currentBranch: "main",
      recentCommits: [],
      workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
      repositoryPath: "/test",
    },
  };

  await storage.saveWorkNote(workNote);
  const retrieved = await storage.getWorkNote("recovery-test");
  assertExists(retrieved);

  await cleanupTestStorage();
});
