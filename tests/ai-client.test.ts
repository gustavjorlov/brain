import { assertEquals, assertRejects, assertStringIncludes } from "@std/assert";
import { AIClient } from "../src/ai/client.ts";
import type { AIInterpretation, GitContext } from "../src/storage/models.ts";

// Mock OpenAI API response
const mockOpenAIResponse = {
  choices: [
    {
      message: {
        content: JSON.stringify({
          summary: "Working on authentication flow issues with token expiry",
          technicalContext:
            "Recent commits show modifications to auth middleware and token validation logic",
          suggestedNextSteps: [
            "Check token expiry configuration in config/jwt.js",
            "Review async/await handling in middleware",
            "Add timing logs to track token lifecycle",
          ],
          relatedFiles: [
            "auth/middleware.js",
            "config/jwt.js",
            "tests/auth.test.js",
          ],
          confidenceScore: 0.85,
        }),
      },
    },
  ],
};

const mockGitContext: GitContext = {
  currentBranch: "feature/auth-improvements",
  recentCommits: [
    {
      hash: "abc123",
      message: "Fix auth middleware timing",
      timestamp: "2025-01-15T10:30:00Z",
      author: "John Doe",
      filesChanged: ["auth/middleware.js", "tests/auth.test.js"],
    },
  ],
  workingDirectoryChanges: {
    staged: ["auth/middleware.js"],
    unstaged: ["config/jwt.js"],
    untracked: ["debug.log"],
  },
  repositoryPath: "/Users/dev/project",
};

Deno.test("AIClient should generate correct prompt format", () => {
  const client = new AIClient("test-key");
  const userMessage = "debugging auth middleware - tokens expiring randomly";

  const prompt = client.generatePrompt(userMessage, mockGitContext);

  assertStringIncludes(
    prompt,
    "debugging auth middleware - tokens expiring randomly",
  );
  assertStringIncludes(prompt, "feature/auth-improvements");
  assertStringIncludes(prompt, "Fix auth middleware timing");
  assertStringIncludes(prompt, "auth/middleware.js");
  assertStringIncludes(prompt, "staged");
  assertStringIncludes(prompt, "JSON format");
});

Deno.test("AIClient should validate API key", () => {
  const client = new AIClient("");

  assertRejects(
    () => client.analyzeContext("test message", mockGitContext),
    Error,
    "OpenAI API key is required",
  );
});

Deno.test("AIClient should handle successful OpenAI response", async () => {
  const client = new AIClient("test-key");

  // Mock the fetch function
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify(mockOpenAIResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  const result = await client.analyzeContext(
    "debugging auth middleware",
    mockGitContext,
  );

  assertEquals(
    result.summary,
    "Working on authentication flow issues with token expiry",
  );
  assertEquals(result.suggestedNextSteps.length, 3);
  assertEquals(result.confidenceScore, 0.85);
  assertEquals(result.relatedFiles, [
    "auth/middleware.js",
    "config/jwt.js",
    "tests/auth.test.js",
  ]);

  // Restore original fetch
  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should handle OpenAI API errors", async () => {
  const client = new AIClient("test-key");

  // Mock fetch to return error
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "Invalid API key",
          type: "invalid_request_error",
        },
      }),
      {
        status: 401,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  await assertRejects(
    () => client.analyzeContext("test message", mockGitContext),
    Error,
    "OpenAI API error",
  );

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should handle network errors", async () => {
  const client = new AIClient("test-key");

  // Mock fetch to throw network error
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    throw new Error("Network error");
  };

  await assertRejects(
    () => client.analyzeContext("test message", mockGitContext),
    Error,
    "Failed to connect to OpenAI API",
  );

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should handle invalid JSON response", async () => {
  const client = new AIClient("test-key");

  // Mock fetch to return invalid JSON in content
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: "Invalid JSON content here",
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  await assertRejects(
    () => client.analyzeContext("test message", mockGitContext),
    Error,
    "Failed to parse AI response",
  );

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should handle missing choices in response", async () => {
  const client = new AIClient("test-key");

  // Mock fetch to return response without choices
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(JSON.stringify({}), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await assertRejects(
    () => client.analyzeContext("test message", mockGitContext),
    Error,
    "No response from AI",
  );

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should use correct OpenAI API parameters", async () => {
  const client = new AIClient("test-key", "gpt-3.5-turbo");

  let capturedBody: string | null = null;
  let capturedUrl: string | null = null;
  let capturedMethod: string | null = null;

  // Mock fetch to capture the request
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedUrl = input.toString();
    capturedMethod = init?.method || "GET";
    capturedBody = init?.body as string || null;

    return new Response(JSON.stringify(mockOpenAIResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await client.analyzeContext("test message", mockGitContext);

  assertEquals(capturedUrl, "https://api.openai.com/v1/chat/completions");
  assertEquals(capturedMethod, "POST");

  const requestBody = JSON.parse(capturedBody || "{}");
  assertEquals(requestBody.model, "gpt-3.5-turbo");
  assertEquals(requestBody.temperature, 0.3);
  assertEquals(requestBody.max_tokens, 1000);

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should use default model when not specified", async () => {
  const client = new AIClient("test-key"); // No model specified

  let capturedBody: string | null = null;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    capturedBody = init?.body as string || null;
    return new Response(JSON.stringify(mockOpenAIResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await client.analyzeContext("test message", mockGitContext);

  const requestBody = JSON.parse(capturedBody || "{}");
  assertEquals(requestBody.model, "gpt-4");

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should handle rate limiting", async () => {
  const client = new AIClient("test-key");

  // Mock fetch to return rate limit error
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        error: {
          message: "Rate limit exceeded",
          type: "rate_limit_exceeded",
        },
      }),
      {
        status: 429,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  await assertRejects(
    () => client.analyzeContext("test message", mockGitContext),
    Error,
    "rate limit",
  );

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should validate required fields in AI response", async () => {
  const client = new AIClient("test-key");

  // Mock response with missing required fields
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async () => {
    return new Response(
      JSON.stringify({
        choices: [
          {
            message: {
              content: JSON.stringify({
                summary: "Test summary",
                // Missing other required fields
              }),
            },
          },
        ],
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  };

  await assertRejects(
    () => client.analyzeContext("test message", mockGitContext),
    Error,
    "Invalid AI response format",
  );

  globalThis.fetch = originalFetch;
});

Deno.test("AIClient should include authorization header", async () => {
  const client = new AIClient("sk-test-key-123");

  let capturedHeaders: Record<string, string> = {};

  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (input: RequestInfo | URL, init?: RequestInit) => {
    const headers = init?.headers;
    if (headers) {
      if (headers instanceof Headers) {
        headers.forEach((value, key) => capturedHeaders[key] = value);
      } else {
        capturedHeaders = { ...headers as Record<string, string> };
      }
    }
    return new Response(JSON.stringify(mockOpenAIResponse), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  };

  await client.analyzeContext("test message", mockGitContext);

  assertEquals(capturedHeaders["Authorization"], "Bearer sk-test-key-123");
  assertEquals(capturedHeaders["Content-Type"], "application/json");

  globalThis.fetch = originalFetch;
});
