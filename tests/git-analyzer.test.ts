import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { GitAnalyzer } from "../src/git/analyzer.ts";
import type { GitContext } from "../src/storage/models.ts";

// Mock git command output for testing
const mockGitLogOutput = `abc123§Fix auth middleware timing§2025-01-15T10:30:00Z§John Doe§auth/middleware.js,tests/auth.test.js
def456§Add debug logging to validateToken§2025-01-15T09:15:00Z§John Doe§auth/middleware.js
ghi789§Update JWT configuration§2025-01-15T08:00:00Z§Jane Smith§config/jwt.js`;

const mockGitStatusOutput = `M  auth/middleware.js
A  tests/new-test.js
 M config/jwt.js
?? debug.log
?? temp.txt`;

const mockGitBranchOutput = `  main
* feature/auth-improvements
  develop`;

Deno.test("GitAnalyzer.getCurrentBranch should parse git branch output", async () => {
  const analyzer = new GitAnalyzer();
  
  // Mock the git command execution
  const originalRunCommand = analyzer.runCommand;
  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("--show-current")) {
      return { stdout: "", stderr: "", success: false };
    }
    if (command.includes("branch")) {
      return { stdout: mockGitBranchOutput, stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const branch = await analyzer.getCurrentBranch();
  assertEquals(branch, "feature/auth-improvements");

  // Restore original method
  analyzer.runCommand = originalRunCommand;
});

Deno.test("GitAnalyzer.getCurrentBranch should handle detached HEAD", async () => {
  const analyzer = new GitAnalyzer();
  const detachedHeadOutput = `* (HEAD detached at abc123)
  main
  develop`;

  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("--show-current")) {
      return { stdout: "", stderr: "", success: false };
    }
    if (command.includes("branch")) {
      return { stdout: detachedHeadOutput, stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const branch = await analyzer.getCurrentBranch();
  assertEquals(branch, "(HEAD detached at abc123)");
});

Deno.test("GitAnalyzer.getRecentCommits should parse git log output", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("log")) {
      return { stdout: mockGitLogOutput, stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const commits = await analyzer.getRecentCommits(3);
  assertEquals(commits.length, 3);
  assertEquals(commits[0].hash, "abc123");
  assertEquals(commits[0].message, "Fix auth middleware timing");
  assertEquals(commits[0].author, "John Doe");
  assertEquals(commits[0].filesChanged, ["auth/middleware.js", "tests/auth.test.js"]);
  assertEquals(commits[1].hash, "def456");
  assertEquals(commits[2].hash, "ghi789");
});

Deno.test("GitAnalyzer.getWorkingDirectoryChanges should parse git status output", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("status")) {
      return { stdout: mockGitStatusOutput, stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const changes = await analyzer.getWorkingDirectoryChanges();
  assertEquals(changes.staged, ["auth/middleware.js", "tests/new-test.js"]);
  assertEquals(changes.unstaged, ["config/jwt.js"]);
  assertEquals(changes.untracked, ["debug.log", "temp.txt"]);
});

Deno.test("GitAnalyzer.getRepositoryPath should return current working directory", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("rev-parse")) {
      return { stdout: "/Users/dev/project/.git\n", stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const repoPath = await analyzer.getRepositoryPath();
  assertEquals(repoPath, "/Users/dev/project");
});

Deno.test("GitAnalyzer.analyze should combine all git information", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("--show-current")) {
      return { stdout: "", stderr: "", success: false };
    }
    if (command.includes("branch")) {
      return { stdout: mockGitBranchOutput, stderr: "", success: true };
    }
    if (command.includes("log")) {
      return { stdout: mockGitLogOutput, stderr: "", success: true };
    }
    if (command.includes("status")) {
      return { stdout: mockGitStatusOutput, stderr: "", success: true };
    }
    if (command.includes("rev-parse")) {
      return { stdout: "/Users/dev/project/.git\n", stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const gitContext = await analyzer.analyze(10);
  
  assertEquals(gitContext.currentBranch, "feature/auth-improvements");
  assertEquals(gitContext.recentCommits.length, 3);
  assertEquals(gitContext.workingDirectoryChanges.staged.length, 2);
  assertEquals(gitContext.repositoryPath, "/Users/dev/project");
});

Deno.test("GitAnalyzer should handle git command failures gracefully", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = async () => {
    return { stdout: "", stderr: "fatal: not a git repository", success: false };
  };

  await assertRejects(
    () => analyzer.getCurrentBranch(),
    Error,
    "not a git repository"
  );
});

Deno.test("GitAnalyzer should validate maxCommits parameter", async () => {
  const analyzer = new GitAnalyzer();

  await assertRejects(
    () => analyzer.getRecentCommits(0),
    Error,
    "maxCommits must be positive"
  );

  await assertRejects(
    () => analyzer.getRecentCommits(-5),
    Error,
    "maxCommits must be positive"
  );
});

Deno.test("GitAnalyzer should handle empty git log output", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("log")) {
      return { stdout: "", stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const commits = await analyzer.getRecentCommits(5);
  assertEquals(commits.length, 0);
});

Deno.test("GitAnalyzer should handle clean working directory", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = async (command: string[]) => {
    if (command.includes("status")) {
      return { stdout: "", stderr: "", success: true };
    }
    return { stdout: "", stderr: "", success: false };
  };

  const changes = await analyzer.getWorkingDirectoryChanges();
  assertEquals(changes.staged, []);
  assertEquals(changes.unstaged, []);
  assertEquals(changes.untracked, []);
});