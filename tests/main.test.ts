import { assertEquals, assertStringIncludes } from "@std/assert";

const CLI_PATH = "src/main.ts";

async function runCLI(
  args: string[],
): Promise<{ stdout: string; stderr: string; success: boolean }> {
  const cmd = new Deno.Command("deno", {
    args: ["run", "--allow-all", CLI_PATH, ...args],
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

Deno.test("CLI shows help with --help flag", async () => {
  const result = await runCLI(["--help"]);

  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "Brain CLI v2.0.1");
  assertStringIncludes(result.stdout, "USAGE:");
  assertStringIncludes(result.stdout, "COMMANDS:");
  assertStringIncludes(result.stdout, "save <message>");
  assertStringIncludes(result.stdout, "resume");
  assertStringIncludes(result.stdout, "list");
  assertStringIncludes(result.stdout, "config");
  assertStringIncludes(result.stdout, "OPTIONS:");
  assertStringIncludes(result.stdout, "--help");
  assertStringIncludes(result.stdout, "--version");
  assertStringIncludes(result.stdout, "--no-ai");
  assertStringIncludes(result.stdout, "EXAMPLES:");
});

Deno.test("CLI shows help with -h flag", async () => {
  const result = await runCLI(["-h"]);

  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "Brain CLI v2.0.1");
  assertStringIncludes(result.stdout, "USAGE:");
});

Deno.test("CLI shows version with --version flag", async () => {
  const result = await runCLI(["--version"]);

  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "Brain CLI v2.0.1");
  assertEquals(result.stdout.trim(), "Brain CLI v2.0.1");
});

Deno.test("CLI shows version with -v flag", async () => {
  const result = await runCLI(["-v"]);

  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "Brain CLI v2.0.1");
});

Deno.test("CLI shows error and help when no command provided", async () => {
  const result = await runCLI([]);

  assertEquals(result.success, false);
  assertStringIncludes(result.stderr, "❌ No command provided");
  assertStringIncludes(result.stdout, "Brain CLI v2.0.1");
  assertStringIncludes(result.stdout, "USAGE:");
});

Deno.test("CLI shows error for unknown command", async () => {
  const result = await runCLI(["unknown"]);

  assertEquals(result.success, false);
  assertStringIncludes(result.stderr, "❌ Unknown command: unknown");
  assertStringIncludes(result.stdout, "Brain CLI v2.0.1");
});

Deno.test("CLI executes save command successfully", async () => {
  const result = await runCLI(["save", "test message"]);

  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "🧠 Analyzing current context");
  assertStringIncludes(result.stdout, "✅ Context saved successfully");
});

Deno.test("CLI executes resume command successfully", async () => {
  const result = await runCLI(["resume"]);

  assertEquals(result.success, true);
  // Should show either a saved context or "No previous context found"
  const hasContext = result.stdout.includes("Last saved:") ||
    result.stdout.includes("No previous context found");
  assertEquals(hasContext, true);
});

Deno.test("CLI executes list command successfully", async () => {
  const result = await runCLI(["list"]);

  assertEquals(result.success, true);
  // Should show either contexts or "No contexts found"
  const hasOutput = result.stdout.includes("Recent contexts:") ||
    result.stdout.includes("No contexts found");
  assertEquals(hasOutput, true);
});

Deno.test("CLI executes config command successfully", async () => {
  const result = await runCLI(["config", "list"]);

  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "Current configuration:");
  assertStringIncludes(result.stdout, "openai-key:");
  assertStringIncludes(result.stdout, "ai-model:");
});

Deno.test("CLI shows error for save command without message", async () => {
  const result = await runCLI(["save"]);

  assertEquals(result.success, false);
  assertStringIncludes(result.stderr, "❌ Usage: brain save <message>");
});

Deno.test("CLI shows error for invalid config command", async () => {
  const result = await runCLI(["config"]);

  assertEquals(result.success, false);
  assertStringIncludes(result.stderr, "❌ Usage: brain config");
});
