import { assertEquals, assertStringIncludes } from "@std/assert";
import { BrainCLI } from "../src/cli/commands.ts";

// Test storage directories for simulating different workstation setups
const TEST_STORAGE_E2E = "./test-storage-e2e";

// Mock repository paths to simulate different projects
const REPO_A_PATH = "/Users/dev/project-frontend";
const REPO_B_PATH = "/Users/dev/project-backend";
const REPO_C_PATH = "/Users/dev/personal-blog";

// Clean up test storage
async function cleanupTestStorage() {
  try {
    await Deno.remove(TEST_STORAGE_E2E, { recursive: true });
  } catch {
    // Directory might not exist, that's fine
  }
}

// Helper to capture console output
function captureConsoleOutput(): [() => string, () => void] {
  const originalLog = console.log;
  let output = "";

  const startCapture = () => {
    output = "";
    console.log = (...args: unknown[]) => {
      output += args.join(" ") + "\n";
    };
  };

  const stopCaptureAndGet = () => {
    console.log = originalLog;
    return output;
  };

  startCapture();
  return [stopCaptureAndGet, startCapture];
}

// Helper to create a BrainCLI instance with mocked git analyzer for specific repo
function createMockedBrainCLI(
  repositoryPath: string,
  branch = "main",
): BrainCLI {
  const brain = new BrainCLI(TEST_STORAGE_E2E);

  // Mock git analyzer to return specific repository context
  brain.gitAnalyzer.analyze = () => Promise.resolve({
    currentBranch: branch,
    recentCommits: [
      {
        hash: "abc123",
        message: `Recent work in ${repositoryPath}`,
        timestamp: new Date().toISOString(),
        author: "Developer",
        filesChanged: ["src/main.ts"],
      },
    ],
    workingDirectoryChanges: {
      staged: [],
      unstaged: ["src/main.ts"],
      untracked: [],
    },
    repositoryPath,
  });

  return brain;
}

Deno.test("End-to-End: Complete workflow across multiple repositories", async () => {
  await cleanupTestStorage();

  // === Scenario: Developer working on 3 different projects ===

  // Step 1: Developer starts working on frontend project
  const frontendBrain = createMockedBrainCLI(REPO_A_PATH, "feature/auth");
  await frontendBrain.initialize();

  // Save some contexts in frontend project (with small delay to ensure different timestamps)
  await frontendBrain.saveCommand("implementing OAuth login flow", {
    noAi: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
  await frontendBrain.saveCommand("debugging token refresh logic", {
    noAi: true,
  });

  // Step 2: Developer switches to backend project (different repository)
  const backendBrain = createMockedBrainCLI(REPO_B_PATH, "develop");
  await backendBrain.initialize();

  // Save contexts in backend project
  await backendBrain.saveCommand("adding user authentication endpoint", {
    noAi: true,
  });
  await new Promise((resolve) => setTimeout(resolve, 10)); // Small delay
  await backendBrain.saveCommand("implementing JWT token validation", {
    noAi: true,
  });

  // Step 3: Developer works on personal blog (third repository)
  const blogBrain = createMockedBrainCLI(REPO_C_PATH, "main");
  await blogBrain.initialize();

  // Save context in blog project
  await blogBrain.saveCommand("writing article about repository patterns", {
    noAi: true,
  });

  // === Verification: Each repository should only see its own contexts ===

  // Frontend project resume should only show frontend contexts
  const [getFrontendOutput] = captureConsoleOutput();
  await frontendBrain.resumeCommand();
  const frontendOutput = getFrontendOutput();

  assertStringIncludes(frontendOutput, "debugging token refresh logic"); // Latest frontend context
  assertEquals(frontendOutput.includes("authentication endpoint"), false); // Not backend
  assertEquals(frontendOutput.includes("repository patterns"), false); // Not blog

  // Backend project resume should only show backend contexts
  const [getBackendOutput] = captureConsoleOutput();
  await backendBrain.resumeCommand();
  const backendOutput = getBackendOutput();

  assertStringIncludes(backendOutput, "implementing JWT token validation"); // Latest backend context
  assertEquals(backendOutput.includes("OAuth login flow"), false); // Not frontend
  assertEquals(backendOutput.includes("repository patterns"), false); // Not blog

  // Blog project resume should only show blog contexts
  const [getBlogOutput] = captureConsoleOutput();
  await blogBrain.resumeCommand();
  const blogOutput = getBlogOutput();

  assertStringIncludes(blogOutput, "writing article about repository patterns"); // Blog context
  assertEquals(blogOutput.includes("OAuth login flow"), false); // Not frontend
  assertEquals(blogOutput.includes("authentication endpoint"), false); // Not backend

  await cleanupTestStorage();
});

Deno.test("End-to-End: List command filtering across repositories", async () => {
  await cleanupTestStorage();

  // Setup: Create contexts in multiple repositories with specific timestamps
  const frontendBrain = createMockedBrainCLI(REPO_A_PATH, "main");
  await frontendBrain.initialize();

  const backendBrain = createMockedBrainCLI(REPO_B_PATH, "main");
  await backendBrain.initialize();

  // Add multiple contexts to each repository
  await frontendBrain.saveCommand("frontend context 1", { noAi: true });
  await backendBrain.saveCommand("backend context 1", { noAi: true });
  await frontendBrain.saveCommand("frontend context 2", { noAi: true });
  await backendBrain.saveCommand("backend context 2", { noAi: true });
  await frontendBrain.saveCommand("frontend context 3", { noAi: true });

  // Frontend list should only show frontend contexts (3 total)
  const [getFrontendList] = captureConsoleOutput();
  await frontendBrain.listCommand(10);
  const frontendList = getFrontendList();

  assertStringIncludes(frontendList, "frontend context 1");
  assertStringIncludes(frontendList, "frontend context 2");
  assertStringIncludes(frontendList, "frontend context 3");
  assertEquals(frontendList.includes("backend context"), false);

  // Backend list should only show backend contexts (2 total)
  const [getBackendList] = captureConsoleOutput();
  await backendBrain.listCommand(10);
  const backendList = getBackendList();

  assertStringIncludes(backendList, "backend context 1");
  assertStringIncludes(backendList, "backend context 2");
  assertEquals(backendList.includes("frontend context"), false);

  await cleanupTestStorage();
});

Deno.test("End-to-End: Legacy data migration with repository isolation", async () => {
  await cleanupTestStorage();

  // Setup: Create legacy storage data (simulating old Brain CLI installation)
  const legacyData = {
    workNotes: {
      "legacy-1": {
        id: "legacy-1",
        message: "old context without repo info",
        timestamp: "2025-01-15T10:00:00Z",
        gitContext: {
          currentBranch: "main",
          recentCommits: [],
          workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
          repositoryPath: "/Users/dev/legacy-project",
        },
        // No repositoryInfo field - this is legacy format
      },
      "legacy-2": {
        id: "legacy-2",
        message: "another old context",
        timestamp: "2025-01-15T11:00:00Z",
        gitContext: {
          currentBranch: "develop",
          recentCommits: [],
          workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
          repositoryPath: "/Users/dev/other-legacy-project",
        },
        // No repositoryInfo field
      },
    },
  };

  // Ensure directory exists and write legacy data directly
  await Deno.mkdir(TEST_STORAGE_E2E, { recursive: true });
  const dataPath = `${TEST_STORAGE_E2E}/contexts.json`;
  await Deno.writeTextFile(dataPath, JSON.stringify(legacyData, null, 2));

  // Step 1: Initialize Brain CLI in one of the legacy project repositories
  // This should trigger migration
  const legacyBrain = createMockedBrainCLI("/Users/dev/legacy-project", "main");

  const [getMigrationOutput] = captureConsoleOutput();
  await legacyBrain.initialize();
  const migrationOutput = getMigrationOutput();

  // Should see migration message
  assertStringIncludes(migrationOutput, "Migrated 2 legacy context(s)");

  // Step 2: Resume should only show contexts from current repository after migration
  const [getResumeOutput] = captureConsoleOutput();
  await legacyBrain.resumeCommand();
  const resumeOutput = getResumeOutput();

  assertStringIncludes(resumeOutput, "old context without repo info"); // From same repo
  assertEquals(resumeOutput.includes("another old context"), false); // From different repo

  // Step 3: Switch to the other legacy repository
  const otherLegacyBrain = createMockedBrainCLI(
    "/Users/dev/other-legacy-project",
    "develop",
  );
  await otherLegacyBrain.initialize();

  const [getOtherResumeOutput] = captureConsoleOutput();
  await otherLegacyBrain.resumeCommand();
  const otherResumeOutput = getOtherResumeOutput();

  assertStringIncludes(otherResumeOutput, "another old context"); // From this repo
  assertEquals(
    otherResumeOutput.includes("old context without repo info"),
    false,
  ); // From different repo

  await cleanupTestStorage();
});

Deno.test("End-to-End: Mixed old and new contexts with repository isolation", async () => {
  await cleanupTestStorage();

  // Step 1: Start with modern Brain CLI usage in one repository
  const modernBrain = createMockedBrainCLI(REPO_A_PATH, "main");
  await modernBrain.initialize();

  await modernBrain.saveCommand("modern context in repo A", { noAi: true });

  // Step 2: Simulate discovering old legacy data (maybe from backup restore)
  const legacyNote = {
    id: "legacy-note-mixed",
    message: "legacy context in repo A",
    timestamp: "2024-12-15T10:00:00Z", // Older than modern context
    gitContext: {
      currentBranch: "main",
      recentCommits: [],
      workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
      repositoryPath: REPO_A_PATH, // Same repository
    },
    // No repositoryInfo - legacy format
  };

  // Add legacy data to existing storage
  const dataPath = `${TEST_STORAGE_E2E}/contexts.json`;
  const dataText = await Deno.readTextFile(dataPath);
  const existingData = JSON.parse(dataText);
  existingData.workNotes[legacyNote.id] = legacyNote;
  await Deno.writeTextFile(dataPath, JSON.stringify(existingData, null, 2));

  // Step 3: Re-initialize to trigger migration
  const brainAfterMigration = createMockedBrainCLI(REPO_A_PATH, "main");

  const [getMigrationOutput] = captureConsoleOutput();
  await brainAfterMigration.initialize();
  const migrationOutput = getMigrationOutput();

  assertStringIncludes(migrationOutput, "Migrated 1 legacy context(s)");

  // Step 4: List should show both contexts from the same repository (chronologically ordered)
  const [getListOutput] = captureConsoleOutput();
  await brainAfterMigration.listCommand(5);
  const listOutput = getListOutput();

  assertStringIncludes(listOutput, "modern context in repo A"); // Modern context
  assertStringIncludes(listOutput, "legacy context in repo A"); // Migrated legacy context

  // Step 5: Resume should show the most recent context (modern one)
  const [getResumeOutput] = captureConsoleOutput();
  await brainAfterMigration.resumeCommand();
  const resumeOutput = getResumeOutput();

  assertStringIncludes(resumeOutput, "modern context in repo A"); // Most recent

  await cleanupTestStorage();
});

Deno.test("End-to-End: Repository isolation when git repository detection fails", async () => {
  await cleanupTestStorage();

  // Step 1: Create contexts in multiple repositories
  const repoABrain = createMockedBrainCLI(REPO_A_PATH, "main");
  await repoABrain.initialize();
  await repoABrain.saveCommand("context in repo A", { noAi: true });

  await new Promise((resolve) => setTimeout(resolve, 50)); // Ensure different timestamps

  const repoBBrain = createMockedBrainCLI(REPO_B_PATH, "main");
  await repoBBrain.initialize();
  await repoBBrain.saveCommand("context in repo B", { noAi: true });

  // Step 2: Simulate being outside any git repository
  const noGitBrain = new BrainCLI(TEST_STORAGE_E2E);
  await noGitBrain.initialize();

  // Mock git analyzer to fail (not in git repository)
  noGitBrain.gitAnalyzer.analyze = () => {
    return Promise.reject(new Error("Not a git repository"));
  };

  // Step 3: Resume outside git repository should show most recent context globally
  const [getGlobalResumeOutput] = captureConsoleOutput();
  await noGitBrain.resumeCommand();
  const globalResumeOutput = getGlobalResumeOutput();

  // Should show the most recent context regardless of repository (repo B context)
  assertStringIncludes(globalResumeOutput, "context in repo B");

  // Step 4: List outside git repository should show all contexts
  const [getGlobalListOutput] = captureConsoleOutput();
  await noGitBrain.listCommand(5);
  const globalListOutput = getGlobalListOutput();

  assertStringIncludes(globalListOutput, "context in repo A");
  assertStringIncludes(globalListOutput, "context in repo B");

  await cleanupTestStorage();
});
