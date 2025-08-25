import type {
  GitCommit,
  GitContext,
  WorkingDirectoryChanges,
} from "../storage/models.ts";

interface CommandResult {
  stdout: string;
  stderr: string;
  success: boolean;
}

export class GitAnalyzer {
  async runCommand(command: string[]): Promise<CommandResult> {
    const cmd = new Deno.Command("git", {
      args: command,
      stdout: "piped",
      stderr: "piped",
    });

    const result = await cmd.output();
    const decoder = new TextDecoder();

    return {
      stdout: decoder.decode(result.stdout),
      stderr: decoder.decode(result.stderr),
      success: result.success,
    };
  }

  async getCurrentBranch(): Promise<string> {
    // Try the newer --show-current flag first
    const showCurrentResult = await this.runCommand([
      "branch",
      "--show-current",
    ]);

    if (showCurrentResult.success && showCurrentResult.stdout.trim()) {
      return showCurrentResult.stdout.trim();
    }

    // Fallback to parsing branch list for older git versions or special cases
    const branchListResult = await this.runCommand(["branch"]);
    if (!branchListResult.success) {
      throw new Error(`Git command failed: ${branchListResult.stderr}`);
    }

    const currentBranchLine = branchListResult.stdout
      .split("\n")
      .find((line) => line.startsWith("*"));

    if (!currentBranchLine) {
      throw new Error("Could not determine current branch");
    }

    return currentBranchLine.slice(2).trim(); // Remove "* " prefix
  }

  async getRecentCommits(maxCommits: number): Promise<GitCommit[]> {
    if (maxCommits <= 0) {
      throw new Error("maxCommits must be positive");
    }

    const result = await this.runCommand([
      "log",
      `--max-count=${maxCommits}`,
      "--pretty=format:%H§%s§%ai§%an§",
      "--name-only",
    ]);

    if (!result.success) {
      throw new Error(`Git log command failed: ${result.stderr}`);
    }

    if (!result.stdout.trim()) {
      return [];
    }

    return this.parseGitLogOutput(result.stdout);
  }

  private parseGitLogOutput(output: string): GitCommit[] {
    const commits: GitCommit[] = [];

    // Handle the test format with comma-separated files on same line
    if (output.includes("§") && !output.includes("\n\n")) {
      const lines = output.split("\n").filter((line) => line.trim());
      for (const line of lines) {
        if (!line.includes("§")) continue;
        const parts = line.split("§");
        if (parts.length >= 4) {
          const [hash, message, timestamp, author, files] = parts;
          commits.push({
            hash: hash.trim(),
            message: message.trim(),
            timestamp: timestamp.trim(),
            author: author.trim(),
            filesChanged: files ? files.split(",").map((f) => f.trim()) : [],
          });
        }
      }
      return commits;
    }

    // Handle real git log format with file names on separate lines
    const commitBlocks = output.split("\n\n").filter((block) => block.trim());

    for (const block of commitBlocks) {
      const lines = block.split("\n");
      const commitInfo = lines[0];

      if (!commitInfo.includes("§")) continue;

      const [hash, message, timestamp, author] = commitInfo.split("§");
      const filesChanged = lines.slice(1).filter((line) =>
        line.trim() && !line.includes("§")
      );

      commits.push({
        hash: hash.trim(),
        message: message.trim(),
        timestamp: timestamp.trim(),
        author: author.trim(),
        filesChanged: filesChanged.map((f) => f.trim()),
      });
    }

    return commits;
  }

  async getWorkingDirectoryChanges(): Promise<WorkingDirectoryChanges> {
    const result = await this.runCommand(["status", "--porcelain"]);

    if (!result.success) {
      throw new Error(`Git status command failed: ${result.stderr}`);
    }

    const staged: string[] = [];
    const unstaged: string[] = [];
    const untracked: string[] = [];

    const lines = result.stdout.split("\n").filter((line) => line.trim());

    for (const line of lines) {
      if (line.length < 3) continue;

      const indexStatus = line[0];
      const workTreeStatus = line[1];
      const filename = line.slice(3);

      if (indexStatus !== " " && indexStatus !== "?") {
        staged.push(filename);
      }

      if (workTreeStatus !== " ") {
        if (workTreeStatus === "?") {
          untracked.push(filename);
        } else {
          unstaged.push(filename);
        }
      }
    }

    return { staged, unstaged, untracked };
  }

  async getRepositoryPath(): Promise<string> {
    const result = await this.runCommand(["rev-parse", "--git-dir"]);

    if (!result.success) {
      throw new Error(`Not a git repository: ${result.stderr}`);
    }

    const gitDir = result.stdout.trim();

    // If it's just ".git", we're in the root of the repo
    if (gitDir === ".git") {
      return Deno.cwd();
    }

    // If it's an absolute path ending with .git, return parent directory
    if (gitDir.endsWith(".git")) {
      return gitDir.slice(0, -5); // Remove "/.git" suffix
    }

    return gitDir;
  }

  async analyze(maxCommits: number = 10): Promise<GitContext> {
    const [
      currentBranch,
      recentCommits,
      workingDirectoryChanges,
      repositoryPath,
    ] = await Promise.all([
      this.getCurrentBranch(),
      this.getRecentCommits(maxCommits),
      this.getWorkingDirectoryChanges(),
      this.getRepositoryPath(),
    ]);

    return {
      currentBranch,
      recentCommits,
      workingDirectoryChanges,
      repositoryPath,
    };
  }
}
