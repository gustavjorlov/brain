import { assertEquals, assertStringIncludes } from "@std/assert";
import { BrainCLI } from "../src/cli/commands.ts";
import type { RepositoryInfo, WorkNote } from "../src/storage/models.ts";

// Test storage directories
const TEST_STORAGE_A = "./test-storage-cli-a";
const TEST_STORAGE_B = "./test-storage-cli-b";

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

// Clean up test storage
async function cleanupTestStorage() {
  for (const path of [TEST_STORAGE_A, TEST_STORAGE_B]) {
    try {
      await Deno.remove(path, { recursive: true });
    } catch {
      // Directory might not exist, that's fine
    }
  }
}

Deno.test("CLI resumeCommand should filter contexts by current repository", async () => {
  await cleanupTestStorage();

  // Create BrainCLI with mock git analyzer
  const brain = new BrainCLI(TEST_STORAGE_A);
  await brain.initialize();

  // Mock git analyzer to return specific repository
  brain.gitAnalyzer.analyze = () => Promise.resolve({
    currentBranch: "main",
    recentCommits: [],
    workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
    repositoryPath: "/Users/dev/project-a",
  });

  // Add contexts from different repositories
  const contextA = createTestWorkNote(
    "note-a-1",
    "context from repo A",
    "/Users/dev/project-a",
    "main",
    "2025-01-15T10:00:00Z",
  );

  const contextB = createTestWorkNote(
    "note-b-1",
    "context from repo B",
    "/Users/dev/project-b",
    "main",
    "2025-01-15T11:00:00Z", // This is newer but shouldn't show
  );

  await brain.storage.saveWorkNote(contextA);
  await brain.storage.saveWorkNote(contextB);

  // Capture console output
  const originalLog = console.log;
  let output = "";
  console.log = (...args: unknown[]) => {
    output += args.join(" ") + "\n";
  };

  try {
    await brain.resumeCommand();

    // Should show context from repo A only, not the newer context from repo B
    assertStringIncludes(output, "context from repo A");
    assertEquals(output.includes("context from repo B"), false);
  } finally {
    console.log = originalLog;
  }

  await cleanupTestStorage();
});

Deno.test("CLI listCommand should filter contexts by current repository", async () => {
  await cleanupTestStorage();

  const brain = new BrainCLI(TEST_STORAGE_B);
  await brain.initialize();

  // Mock git analyzer to return specific repository
  brain.gitAnalyzer.analyze = () => Promise.resolve({
    currentBranch: "main",
    recentCommits: [],
    workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
    repositoryPath: "/Users/dev/project-b",
  });

  // Add multiple contexts from different repositories
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
  ];

  for (const context of contexts) {
    await brain.storage.saveWorkNote(context);
  }

  // Capture console output
  const originalLog = console.log;
  let output = "";
  console.log = (...args: unknown[]) => {
    output += args.join(" ") + "\n";
  };

  try {
    await brain.listCommand(5);

    // Should only show contexts from repo B
    assertStringIncludes(output, "context B1");
    assertStringIncludes(output, "context B2");
    assertEquals(output.includes("context A1"), false);
    assertEquals(output.includes("context A2"), false);
  } finally {
    console.log = originalLog;
  }

  await cleanupTestStorage();
});

Deno.test("CLI should show appropriate messages when no contexts found for repository", async () => {
  await cleanupTestStorage();

  const brain = new BrainCLI(TEST_STORAGE_A);
  await brain.initialize();

  // Mock git analyzer to return specific repository
  brain.gitAnalyzer.analyze = () => Promise.resolve({
    currentBranch: "main",
    recentCommits: [],
    workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
    repositoryPath: "/Users/dev/empty-project",
  });

  // Add a context from different repository
  const contextOther = createTestWorkNote(
    "note-other-1",
    "context from other repo",
    "/Users/dev/other-project",
  );
  await brain.storage.saveWorkNote(contextOther);

  // Capture console output
  const originalLog = console.log;
  let output = "";
  console.log = (...args: unknown[]) => {
    output += args.join(" ") + "\n";
  };

  try {
    // Test resume command
    output = "";
    await brain.resumeCommand();
    assertStringIncludes(
      output,
      "No previous context found for this repository",
    );

    // Test list command
    output = "";
    await brain.listCommand(5);
    assertStringIncludes(output, "No contexts found for this repository");
  } finally {
    console.log = originalLog;
  }

  await cleanupTestStorage();
});

Deno.test("CLI should fallback to global behavior when not in git repository", async () => {
  await cleanupTestStorage();

  const brain = new BrainCLI(TEST_STORAGE_A);
  await brain.initialize();

  // Mock git analyzer to throw error (simulating not in git repo)
  brain.gitAnalyzer.analyze = () => {
    return Promise.reject(new Error("Not a git repository"));
  };

  // Add contexts from different repositories
  const contexts = [
    createTestWorkNote(
      "note-a-1",
      "context from repo A",
      "/Users/dev/project-a",
      "main",
      "2025-01-15T10:00:00Z",
    ),
    createTestWorkNote(
      "note-b-1",
      "context from repo B",
      "/Users/dev/project-b",
      "main",
      "2025-01-15T11:00:00Z", // This is newer
    ),
  ];

  for (const context of contexts) {
    await brain.storage.saveWorkNote(context);
  }

  // Capture console output
  const originalLog = console.log;
  let output = "";
  console.log = (...args: unknown[]) => {
    output += args.join(" ") + "\n";
  };

  try {
    // Test resume command - should show most recent regardless of repo
    output = "";
    await brain.resumeCommand();
    assertStringIncludes(output, "context from repo B"); // Most recent

    // Test list command - should show all contexts
    output = "";
    await brain.listCommand(5);
    assertStringIncludes(output, "context from repo A");
    assertStringIncludes(output, "context from repo B");
  } finally {
    console.log = originalLog;
  }

  await cleanupTestStorage();
});
