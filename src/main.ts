#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net

/**
 * Brain CLI - Context management for developers
 * 
 * Captures your current thoughts along with git activity,
 * uses AI to interpret the technical context, and helps
 * you seamlessly resume where you left off.
 */

import { parseArgs } from "@std/cli";

const VERSION = "0.1.0";

function showHelp() {
  console.log(`Brain CLI v${VERSION}

USAGE:
    brain <COMMAND> [OPTIONS]

COMMANDS:
    save <message>     Save current context with your thoughts
    resume             Show last saved context with AI analysis
    list [count]       Show recent contexts (default: 5)
    config             Manage configuration settings
    
OPTIONS:
    -h, --help        Show this help message
    -v, --version     Show version information
    --no-ai          Skip AI analysis (save only)

EXAMPLES:
    brain save "debugging auth middleware - tokens expiring randomly"
    brain resume
    brain list 10
    brain config set openai-key sk-...

For more information, visit: https://github.com/yourname/brain`);
}

function showVersion() {
  console.log(`Brain CLI v${VERSION}`);
}

async function main() {
  const args = parseArgs(Deno.args, {
    boolean: ["help", "version", "no-ai"],
    alias: {
      h: "help",
      v: "version",
    },
  });

  if (args.help) {
    showHelp();
    return;
  }

  if (args.version) {
    showVersion();
    return;
  }

  const command = args._[0]?.toString();

  if (!command) {
    console.error("❌ No command provided");
    showHelp();
    Deno.exit(1);
  }

  switch (command) {
    case "save":
      console.log("🧠 Save command - Not implemented yet");
      break;
    case "resume":
      console.log("🧠 Resume command - Not implemented yet");
      break;
    case "list":
      console.log("🧠 List command - Not implemented yet");
      break;
    case "config":
      console.log("🧠 Config command - Not implemented yet");
      break;
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
