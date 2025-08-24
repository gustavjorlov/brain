#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run --allow-net

/**
 * Brain CLI - Context management for developers
 * 
 * Captures your current thoughts along with git activity,
 * uses AI to interpret the technical context, and helps
 * you seamlessly resume where you left off.
 */

import { parseArgs } from "@std/cli";
import { BrainCLI } from "./cli/commands.ts";

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
    boolean: ["help", "version", "no-ai", "raw"],
    string: ["since", "branch"],
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

  // Initialize Brain CLI
  const brain = new BrainCLI();
  await brain.initialize();

  switch (command) {
    case "save": {
      const message = args._[1]?.toString();
      if (!message) {
        console.error("❌ Usage: brain save <message>");
        console.log("   Example: brain save \"debugging auth middleware - tokens expiring randomly\"");
        Deno.exit(1);
      }
      await brain.saveCommand(message, { noAi: args["no-ai"] });
      break;
    }
    case "resume":
      await brain.resumeCommand({ 
        raw: args.raw, 
        since: args.since 
      });
      break;
    case "list": {
      const count = parseInt(args._[1]?.toString() || "5", 10);
      if (isNaN(count) || count < 1) {
        console.error("❌ Count must be a positive number");
        Deno.exit(1);
      }
      await brain.listCommand(count, { branch: args.branch });
      break;
    }
    case "config": {
      const action = args._[1]?.toString();
      const key = args._[2]?.toString();
      const value = args._[3]?.toString();
      
      if (!action) {
        console.error("❌ Usage: brain config <set|get|list> [key] [value]");
        Deno.exit(1);
      }
      
      await brain.configCommand(action, key, value);
      break;
    }
    default:
      console.error(`❌ Unknown command: ${command}`);
      showHelp();
      Deno.exit(1);
  }
}

if (import.meta.main) {
  await main();
}
