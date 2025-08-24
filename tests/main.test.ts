import { assertEquals, assertStringIncludes } from "@std/assert";

const CLI_PATH = "src/main.ts";

async function runCLI(args: string[]): Promise<{ stdout: string; stderr: string; success: boolean }> {
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
  assertStringIncludes(result.stdout, "Brain CLI v0.1.0");
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
  assertStringIncludes(result.stdout, "Brain CLI v0.1.0");
  assertStringIncludes(result.stdout, "USAGE:");
});

Deno.test("CLI shows version with --version flag", async () => {
  const result = await runCLI(["--version"]);
  
  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "Brain CLI v0.1.0");
  assertEquals(result.stdout.trim(), "Brain CLI v0.1.0");
});

Deno.test("CLI shows version with -v flag", async () => {
  const result = await runCLI(["-v"]);
  
  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "Brain CLI v0.1.0");
});

Deno.test("CLI shows error and help when no command provided", async () => {
  const result = await runCLI([]);
  
  assertEquals(result.success, false);
  assertStringIncludes(result.stderr, "❌ No command provided");
  assertStringIncludes(result.stdout, "Brain CLI v0.1.0");
  assertStringIncludes(result.stdout, "USAGE:");
});

Deno.test("CLI shows error for unknown command", async () => {
  const result = await runCLI(["unknown"]);
  
  assertEquals(result.success, false);
  assertStringIncludes(result.stderr, "❌ Unknown command: unknown");
  assertStringIncludes(result.stdout, "Brain CLI v0.1.0");
});

Deno.test("CLI recognizes save command (not implemented)", async () => {
  const result = await runCLI(["save", "test message"]);
  
  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "🧠 Save command - Not implemented yet");
});

Deno.test("CLI recognizes resume command (not implemented)", async () => {
  const result = await runCLI(["resume"]);
  
  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "🧠 Resume command - Not implemented yet");
});

Deno.test("CLI recognizes list command (not implemented)", async () => {
  const result = await runCLI(["list"]);
  
  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "🧠 List command - Not implemented yet");
});

Deno.test("CLI recognizes config command (not implemented)", async () => {
  const result = await runCLI(["config"]);
  
  assertEquals(result.success, true);
  assertStringIncludes(result.stdout, "🧠 Config command - Not implemented yet");
});
