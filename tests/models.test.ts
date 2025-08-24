import { assertEquals, assertExists } from "@std/assert";
import type { GitContext, WorkNote, AIInterpretation, BrainConfig } from "../src/storage/models.ts";

Deno.test("GitContext interface should contain required fields", () => {
  const gitContext: GitContext = {
    currentBranch: "feature/auth-improvements",
    recentCommits: [
      {
        hash: "abc123",
        message: "Fix auth middleware timing",
        timestamp: "2025-01-15T10:30:00Z",
        author: "John Doe",
        filesChanged: ["auth/middleware.js", "tests/auth.test.js"]
      }
    ],
    workingDirectoryChanges: {
      staged: ["auth/middleware.js"],
      unstaged: ["config/jwt.js"],
      untracked: ["debug.log"]
    },
    repositoryPath: "/Users/dev/project"
  };

  assertEquals(gitContext.currentBranch, "feature/auth-improvements");
  assertEquals(gitContext.recentCommits.length, 1);
  assertEquals(gitContext.recentCommits[0].hash, "abc123");
  assertEquals(gitContext.workingDirectoryChanges.staged.length, 1);
  assertExists(gitContext.repositoryPath);
});

Deno.test("WorkNote interface should contain user message and git context", () => {
  const workNote: WorkNote = {
    id: "note-123",
    message: "debugging auth middleware - tokens expiring randomly",
    timestamp: "2025-01-15T10:30:00Z",
    gitContext: {
      currentBranch: "feature/auth-improvements",
      recentCommits: [],
      workingDirectoryChanges: {
        staged: [],
        unstaged: [],
        untracked: []
      },
      repositoryPath: "/Users/dev/project"
    },
    aiInterpretation: undefined
  };

  assertEquals(workNote.message, "debugging auth middleware - tokens expiring randomly");
  assertEquals(workNote.gitContext.currentBranch, "feature/auth-improvements");
  assertEquals(workNote.aiInterpretation, undefined);
  assertExists(workNote.id);
  assertExists(workNote.timestamp);
});

Deno.test("AIInterpretation interface should contain analysis and suggestions", () => {
  const aiInterpretation: AIInterpretation = {
    summary: "Working on authentication flow issues with token expiry",
    technicalContext: "Recent commits show modifications to auth middleware and token validation logic",
    suggestedNextSteps: [
      "Check token expiry configuration in config/jwt.js",
      "Review async/await handling in middleware",
      "Add timing logs to track token lifecycle"
    ],
    relatedFiles: ["auth/middleware.js", "config/jwt.js", "tests/auth.test.js"],
    confidenceScore: 0.85
  };

  assertEquals(aiInterpretation.summary, "Working on authentication flow issues with token expiry");
  assertEquals(aiInterpretation.suggestedNextSteps.length, 3);
  assertEquals(aiInterpretation.confidenceScore, 0.85);
  assertExists(aiInterpretation.technicalContext);
  assertExists(aiInterpretation.relatedFiles);
});

Deno.test("BrainConfig interface should contain all settings", () => {
  const config: BrainConfig = {
    openaiApiKey: "sk-test-key-123",
    maxCommits: 10,
    aiModel: "gpt-4",
    storagePath: "~/.config/brain/data",
    enableAI: true
  };

  assertEquals(config.openaiApiKey, "sk-test-key-123");
  assertEquals(config.maxCommits, 10);
  assertEquals(config.aiModel, "gpt-4");
  assertEquals(config.enableAI, true);
  assertExists(config.storagePath);
});

Deno.test("WorkNote with AIInterpretation should be complete context", () => {
  const completeWorkNote: WorkNote = {
    id: "note-456",
    message: "refactoring user service API endpoints",
    timestamp: "2025-01-15T11:00:00Z",
    gitContext: {
      currentBranch: "refactor/user-api",
      recentCommits: [
        {
          hash: "def456",
          message: "Extract user validation logic",
          timestamp: "2025-01-15T10:45:00Z",
          author: "Jane Smith",
          filesChanged: ["services/user.js", "validators/user.js"]
        }
      ],
      workingDirectoryChanges: {
        staged: ["services/user.js"],
        unstaged: ["tests/user.test.js"],
        untracked: []
      },
      repositoryPath: "/Users/dev/project"
    },
    aiInterpretation: {
      summary: "Refactoring user service to improve maintainability",
      technicalContext: "Extracting validation logic into separate module",
      suggestedNextSteps: [
        "Update unit tests for new validator module",
        "Check API documentation for breaking changes"
      ],
      relatedFiles: ["services/user.js", "validators/user.js", "tests/user.test.js"],
      confidenceScore: 0.92
    }
  };

  assertExists(completeWorkNote.aiInterpretation);
  assertEquals(completeWorkNote.aiInterpretation?.summary, "Refactoring user service to improve maintainability");
  assertEquals(completeWorkNote.gitContext.recentCommits.length, 1);
  assertEquals(completeWorkNote.aiInterpretation?.confidenceScore, 0.92);
});