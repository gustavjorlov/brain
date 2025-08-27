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

// Read version from deno.json
async function getVersion(): Promise<string> {
  try {
    // First try to find deno.json relative to the current working directory
    try {
      const denoConfig = await Deno.readTextFile("deno.json");
      const config = JSON.parse(denoConfig);
      if (config.version) return config.version;
    } catch {
      // If that fails, try relative to the source file location
      const denoConfigPath = new URL("../deno.json", import.meta.url);
      const denoConfig = await Deno.readTextFile(denoConfigPath);
      const config = JSON.parse(denoConfig);
      if (config.version) return config.version;
    }
    return "unknown";
  } catch {
    return "unknown";
  }
}

const VERSION = await getVersion();

function showHelp() {
  console.log(`🧠 Brain CLI v${VERSION} - Context management for developers

USAGE:
    brain <COMMAND> [OPTIONS]

COMMANDS:
    save <message>     Capture current context with your thoughts and git analysis
    resume             Show your last saved context with AI insights
    list [count]       Show recent contexts (default: 5) 
    config <action>    Manage configuration settings

COMMAND OPTIONS:
    save:
        --no-ai        Skip AI analysis (faster, works offline)
    
    resume:
        --raw          Show raw JSON data instead of formatted output
        --since <time> Show contexts since specific time (not yet implemented)
    
    list:
        --branch <name> Filter contexts by git branch
    
    config:
        set <key> <value>  Set configuration value
        get <key>          Get configuration value  
        list               Show all configuration

GLOBAL OPTIONS:
    -h, --help         Show this help message
    -v, --version      Show version information

EXAMPLES:
    # Save your current context
    brain save "debugging auth middleware - tokens expiring randomly"
    brain save "refactoring user API" --no-ai
    
    # Resume your work
    brain resume
    brain resume --raw
    
    # Browse your contexts
    brain list
    brain list 10
    brain list --branch feature/auth
    
    # Configure Brain
    brain config set openai-key sk-your-key-here
    brain config set ai-model gpt-3.5-turbo
    brain config list

SETUP:
    1. Ensure you're in a git repository
    2. Set your OpenAI API key: brain config set openai-key sk-...
    3. Start capturing context: brain save "your current thoughts"

STORAGE:
    All data is stored locally in ~/.config/brain/
    - No cloud storage or data sharing
    - Works completely offline (except AI features)

For more information and updates:
    https://github.com/anthropics/brain-cli`);
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

  // Check for first-time setup (only for interactive commands)
  if (["save", "resume", "list"].includes(command)) {
    await brain.checkFirstTimeSetup();
  }

  switch (command) {
    case "save": {
      const message = args._[1]?.toString();
      if (!message) {
        console.error("❌ Usage: brain save <message>");
        console.log(
          '   Example: brain save "debugging auth middleware - tokens expiring randomly"',
        );
        Deno.exit(1);
      }
      await brain.saveCommand(message, { noAi: args["no-ai"] });
      break;
    }
    case "resume":
      await brain.resumeCommand({
        raw: args.raw,
        since: args.since,
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
