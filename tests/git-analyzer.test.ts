import { assertEquals, assertRejects } from "@std/assert";
import { GitAnalyzer } from "../src/git/analyzer.ts";

// Mock git command output for testing
const mockGitLogOutput =
  `abc123§Fix auth middleware timing§2025-01-15T10:30:00Z§John Doe§auth/middleware.js,tests/auth.test.js
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
  const _originalRunCommand = analyzer.runCommand;
  analyzer.runCommand = (command: string[]) => {
    if (command.includes("--show-current")) {
      return Promise.resolve({ stdout: "", stderr: "", success: false });
    }
    if (command.includes("branch")) {
      return Promise.resolve({
        stdout: mockGitBranchOutput,
        stderr: "",
        success: true,
      });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const branch = await analyzer.getCurrentBranch();
  assertEquals(branch, "feature/auth-improvements");

  // Restore original method
  analyzer.runCommand = _originalRunCommand;
});

Deno.test("GitAnalyzer.getCurrentBranch should handle detached HEAD", async () => {
  const analyzer = new GitAnalyzer();
  const detachedHeadOutput = `* (HEAD detached at abc123)
  main
  develop`;

  analyzer.runCommand = (command: string[]) => {
    if (command.includes("--show-current")) {
      return Promise.resolve({ stdout: "", stderr: "", success: false });
    }
    if (command.includes("branch")) {
      return Promise.resolve({
        stdout: detachedHeadOutput,
        stderr: "",
        success: true,
      });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const branch = await analyzer.getCurrentBranch();
  assertEquals(branch, "(HEAD detached at abc123)");
});

Deno.test("GitAnalyzer.getRecentCommits should parse git log output", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command: string[]) => {
    if (command.includes("log")) {
      return Promise.resolve({
        stdout: mockGitLogOutput,
        stderr: "",
        success: true,
      });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const commits = await analyzer.getRecentCommits(3);
  assertEquals(commits.length, 3);
  assertEquals(commits[0].hash, "abc123");
  assertEquals(commits[0].message, "Fix auth middleware timing");
  assertEquals(commits[0].author, "John Doe");
  assertEquals(commits[0].filesChanged, [
    "auth/middleware.js",
    "tests/auth.test.js",
  ]);
  assertEquals(commits[1].hash, "def456");
  assertEquals(commits[2].hash, "ghi789");
});

Deno.test("GitAnalyzer.getWorkingDirectoryChanges should parse git status output", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command: string[]) => {
    if (command.includes("status")) {
      return Promise.resolve({
        stdout: mockGitStatusOutput,
        stderr: "",
        success: true,
      });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const changes = await analyzer.getWorkingDirectoryChanges();
  assertEquals(changes.staged, ["auth/middleware.js", "tests/new-test.js"]);
  assertEquals(changes.unstaged, ["config/jwt.js"]);
  assertEquals(changes.untracked, ["debug.log", "temp.txt"]);
});

Deno.test("GitAnalyzer.getRepositoryPath should return repository root path", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command: string[]) => {
    if (command.includes("--show-toplevel")) {
      return Promise.resolve({
        stdout: "/Users/dev/project\n",
        stderr: "",
        success: true,
      });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const repoPath = await analyzer.getRepositoryPath();
  assertEquals(repoPath, "/Users/dev/project");
});

Deno.test("GitAnalyzer.analyze should combine all git information", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command: string[]) => {
    if (command.includes("--show-current")) {
      return Promise.resolve({ stdout: "", stderr: "", success: false });
    }
    if (command.includes("branch")) {
      return Promise.resolve({
        stdout: mockGitBranchOutput,
        stderr: "",
        success: true,
      });
    }
    if (command.includes("log")) {
      return Promise.resolve({
        stdout: mockGitLogOutput,
        stderr: "",
        success: true,
      });
    }
    if (command.includes("status")) {
      return Promise.resolve({
        stdout: mockGitStatusOutput,
        stderr: "",
        success: true,
      });
    }
    if (command.includes("--show-toplevel")) {
      return Promise.resolve({
        stdout: "/Users/dev/project\n",
        stderr: "",
        success: true,
      });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const gitContext = await analyzer.analyze(10);

  assertEquals(gitContext.currentBranch, "feature/auth-improvements");
  assertEquals(gitContext.recentCommits.length, 3);
  assertEquals(gitContext.workingDirectoryChanges.staged.length, 2);
  assertEquals(gitContext.repositoryPath, "/Users/dev/project");
});

Deno.test("GitAnalyzer should handle git command failures gracefully", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = () => {
    return Promise.resolve({
      stdout: "",
      stderr: "fatal: not a git repository",
      success: false,
    });
  };

  await assertRejects(
    () => analyzer.getCurrentBranch(),
    Error,
    "not a git repository",
  );
});

Deno.test("GitAnalyzer should validate maxCommits parameter", async () => {
  const analyzer = new GitAnalyzer();

  await assertRejects(
    () => analyzer.getRecentCommits(0),
    Error,
    "maxCommits must be positive",
  );

  await assertRejects(
    () => analyzer.getRecentCommits(-5),
    Error,
    "maxCommits must be positive",
  );
});

Deno.test("GitAnalyzer should handle empty git log output", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command: string[]) => {
    if (command.includes("log")) {
      return Promise.resolve({ stdout: "", stderr: "", success: true });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const commits = await analyzer.getRecentCommits(5);
  assertEquals(commits.length, 0);
});

Deno.test("GitAnalyzer should handle clean working directory", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command: string[]) => {
    if (command.includes("status")) {
      return Promise.resolve({ stdout: "", stderr: "", success: true });
    }
    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const changes = await analyzer.getWorkingDirectoryChanges();
  assertEquals(changes.staged, []);
  assertEquals(changes.unstaged, []);
  assertEquals(changes.untracked, []);
});

Deno.test("GitAnalyzer.getRepositoryRoot should get absolute repository root path", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command) => {
    if (command.includes("--show-toplevel")) {
      return Promise.resolve({
        stdout: "/Users/dev/my-project\n",
        stderr: "",
        success: true,
      });
    }
    throw new Error(`Unexpected command: ${command.join(" ")}`);
  };

  const root = await analyzer.getRepositoryRoot();
  assertEquals(root, "/Users/dev/my-project");
});

Deno.test("GitAnalyzer.getRepositoryRoot should handle git command failure", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = () => {
    return Promise.resolve({
      stdout: "",
      stderr: "fatal: not a git repository",
      success: false,
    });
  };

  await assertRejects(
    () => analyzer.getRepositoryRoot(),
    Error,
    "Not a git repository",
  );
});

Deno.test("GitAnalyzer.getRepositoryIdentifier should normalize repository path", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command) => {
    if (command.includes("--show-toplevel")) {
      return Promise.resolve({
        stdout: "/Users/dev/my-project/\n", // Note trailing slash
        stderr: "",
        success: true,
      });
    }
    throw new Error(`Unexpected command: ${command.join(" ")}`);
  };

  const identifier = await analyzer.getRepositoryIdentifier();
  assertEquals(identifier, "/Users/dev/my-project"); // No trailing slash
});

Deno.test("GitAnalyzer.getRepositoryIdentifier should handle symlinks consistently", async () => {
  const analyzer = new GitAnalyzer();

  analyzer.runCommand = (command) => {
    if (command.includes("--show-toplevel")) {
      return Promise.resolve({
        stdout: "/Users/dev/symlinked-project\n",
        stderr: "",
        success: true,
      });
    }
    throw new Error(`Unexpected command: ${command.join(" ")}`);
  };

  const identifier = await analyzer.getRepositoryIdentifier();
  assertEquals(identifier, "/Users/dev/symlinked-project");
});

Deno.test("GitAnalyzer should update analyze() to include enhanced repository info", async () => {
  const analyzer = new GitAnalyzer();

  let commandCount = 0;
  analyzer.runCommand = (command: string[]) => {
    commandCount++;

    if (
      command.includes("--show-current") || command.includes("symbolic-ref")
    ) {
      return Promise.resolve({
        stdout: "feature/enhanced-repo\n",
        stderr: "",
        success: true,
      });
    }

    if (command.includes("log")) {
      return Promise.resolve({
        stdout:
          "abc123§Fix repository identification§2025-01-15 10:30:00 +0000§John Doe§src/git/analyzer.ts\n",
        stderr: "",
        success: true,
      });
    }

    if (command.includes("status")) {
      return Promise.resolve({
        stdout: "M  src/git/analyzer.ts\n?? tests/new-test.ts\n",
        stderr: "",
        success: true,
      });
    }

    if (command.includes("--show-toplevel")) {
      return Promise.resolve({
        stdout: "/Users/dev/enhanced-project\n",
        stderr: "",
        success: true,
      });
    }

    return Promise.resolve({ stdout: "", stderr: "", success: false });
  };

  const context = await analyzer.analyze(5);

  assertEquals(context.currentBranch, "feature/enhanced-repo");
  assertEquals(context.repositoryPath, "/Users/dev/enhanced-project");
  assertEquals(context.recentCommits.length, 1);
  assertEquals(
    context.recentCommits[0].message,
    "Fix repository identification",
  );
});

Deno.test("GitAnalyzer should handle repository path edge cases", async () => {
  const analyzer = new GitAnalyzer();

  // Test with various path formats
  const testCases = [
    { input: "/Users/dev/project\n", expected: "/Users/dev/project" },
    { input: "/Users/dev/project/\n", expected: "/Users/dev/project" },
    { input: "/Users/dev/project\n\n", expected: "/Users/dev/project" },
    { input: "  /Users/dev/project  \n", expected: "/Users/dev/project" },
  ];

  for (const testCase of testCases) {
    analyzer.runCommand = (command) => {
      if (command.includes("--show-toplevel")) {
        return Promise.resolve({
          stdout: testCase.input,
          stderr: "",
          success: true,
        });
      }
      throw new Error(`Unexpected command: ${command.join(" ")}`);
    };

    const identifier = await analyzer.getRepositoryIdentifier();
    assertEquals(
      identifier,
      testCase.expected,
      `Failed for input: ${JSON.stringify(testCase.input)}`,
    );
  }
});
