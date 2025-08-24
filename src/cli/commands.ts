import { GitAnalyzer } from "../git/analyzer.ts";
import { Storage } from "../storage/database.ts";
import { AIClient } from "../ai/client.ts";
import type { WorkNote, BrainConfig } from "../storage/models.ts";
import { join } from "@std/path";

// Default storage path
const getDefaultStoragePath = (): string => {
  const homeDir = Deno.env.get("HOME") || Deno.env.get("USERPROFILE") || "/tmp";
  return join(homeDir, ".config", "brain");
};

// Generate unique ID for work notes
const generateId = (): string => {
  return `note-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

// Format timestamp for display
const formatTimestamp = (timestamp: string): string => {
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
  } else if (diffHours > 0) {
    return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`;
  } else {
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    return `${diffMinutes} minute${diffMinutes === 1 ? '' : 's'} ago`;
  }
};

export class BrainCLI {
  private storage: Storage;
  private gitAnalyzer: GitAnalyzer;
  private aiClient: AIClient | null = null;

  constructor(storagePath?: string) {
    this.storage = new Storage(storagePath || getDefaultStoragePath());
    this.gitAnalyzer = new GitAnalyzer();
  }

  async initialize(): Promise<void> {
    await this.storage.initialize();
    const config = await this.storage.getConfig();
    
    if (config.openaiApiKey && config.enableAI) {
      this.aiClient = new AIClient(config.openaiApiKey, config.aiModel);
    }
  }

  async saveCommand(message: string, options: { noAi?: boolean } = {}): Promise<void> {
    try {
      // Check if we're in a git repository
      const gitContext = await this.gitAnalyzer.analyze(10);
      
      console.log("🧠 Analyzing current context...");
      
      const timestamp = new Date().toISOString();
      const workNote: WorkNote = {
        id: generateId(),
        message,
        timestamp,
        gitContext,
      };

      // Get AI interpretation if enabled and available
      const config = await this.storage.getConfig();
      if (!options.noAi && config.enableAI && this.aiClient) {
        try {
          console.log("🤖 Getting AI analysis...");
          const aiInterpretation = await this.aiClient.analyzeContext(message, gitContext);
          workNote.aiInterpretation = aiInterpretation;
        } catch (aiError) {
          console.log("⚠️  AI analysis failed, saving context without AI interpretation");
          if (aiError instanceof Error) {
            console.log(`   ${aiError.message}`);
          }
        }
      }

      // Save the work note
      await this.storage.saveWorkNote(workNote);
      
      console.log("✅ Context saved successfully");
      console.log(`   Branch: ${gitContext.currentBranch}`);
      console.log(`   Recent commits: ${gitContext.recentCommits.length}`);
      console.log(`   Working directory changes: ${
        gitContext.workingDirectoryChanges.staged.length + 
        gitContext.workingDirectoryChanges.unstaged.length + 
        gitContext.workingDirectoryChanges.untracked.length
      }`);

      if (workNote.aiInterpretation) {
        console.log(`   AI analysis: ✅ (confidence: ${Math.round(workNote.aiInterpretation.confidenceScore * 100)}%)`);
      }

    } catch (error) {
      if (error instanceof Error) {
        if (error.message.includes("not a git repository")) {
          console.error("❌ Error: Not in a git repository");
          console.log("   Brain requires a git repository to analyze context.");
          Deno.exit(1);
        } else {
          console.error(`❌ Error saving context: ${error.message}`);
          Deno.exit(1);
        }
      }
    }
  }

  async resumeCommand(options: { raw?: boolean, since?: string } = {}): Promise<void> {
    try {
      const latestNote = await this.storage.getLatestWorkNote();
      
      if (!latestNote) {
        console.log("📝 No previous context found");
        console.log("   Use 'brain save \"your message\"' to capture your first context.");
        return;
      }

      const timeAgo = formatTimestamp(latestNote.timestamp);
      
      if (options.raw) {
        console.log(JSON.stringify(latestNote, null, 2));
        return;
      }

      console.log(`\n🧠 Last saved: ${timeAgo} on ${latestNote.gitContext.currentBranch}\n`);
      
      console.log(`💭 Your thoughts: "${latestNote.message}"\n`);

      if (latestNote.aiInterpretation) {
        const ai = latestNote.aiInterpretation;
        console.log("🤖 AI Analysis:");
        console.log(`   ${ai.summary}\n`);
        
        console.log("📋 Technical Context:");
        console.log(`   ${ai.technicalContext}\n`);
        
        if (ai.suggestedNextSteps.length > 0) {
          console.log("🎯 Suggested Next Steps:");
          ai.suggestedNextSteps.forEach((step, index) => {
            console.log(`   ${index + 1}. ${step}`);
          });
          console.log("");
        }

        if (ai.relatedFiles.length > 0) {
          console.log("📁 Related Files:");
          console.log(`   ${ai.relatedFiles.join(', ')}\n`);
        }
        
        console.log(`🎲 Confidence: ${Math.round(ai.confidenceScore * 100)}%\n`);
      }

      // Show current git status
      try {
        const currentGitContext = await this.gitAnalyzer.analyze(5);
        console.log("📊 Current Status:");
        console.log(`   Branch: ${currentGitContext.currentBranch}`);
        
        const { staged, unstaged, untracked } = currentGitContext.workingDirectoryChanges;
        if (staged.length > 0) {
          console.log(`   Staged: ${staged.join(', ')}`);
        }
        if (unstaged.length > 0) {
          console.log(`   Unstaged: ${unstaged.join(', ')}`);
        }
        if (untracked.length > 0) {
          console.log(`   Untracked: ${untracked.join(', ')}`);
        }
        if (staged.length === 0 && unstaged.length === 0 && untracked.length === 0) {
          console.log("   Working directory clean");
        }
      } catch {
        console.log("   (Unable to read current git status)");
      }

    } catch (error) {
      console.error(`❌ Error retrieving context: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Deno.exit(1);
    }
  }

  async listCommand(count = 5, options: { branch?: string } = {}): Promise<void> {
    try {
      let notes: WorkNote[];
      
      if (options.branch) {
        notes = await this.storage.getWorkNotesByBranch(options.branch);
        notes = notes.slice(0, count);
      } else {
        notes = await this.storage.getRecentWorkNotes(count);
      }

      if (notes.length === 0) {
        if (options.branch) {
          console.log(`📝 No contexts found for branch: ${options.branch}`);
        } else {
          console.log("📝 No contexts found");
        }
        console.log("   Use 'brain save \"your message\"' to capture your first context.");
        return;
      }

      const title = options.branch 
        ? `Recent contexts on ${options.branch}:` 
        : "Recent contexts:";
        
      console.log(`\n📚 ${title}\n`);

      notes.forEach((note, index) => {
        const timeAgo = formatTimestamp(note.timestamp);
        const aiIndicator = note.aiInterpretation ? " 🤖" : "";
        
        console.log(`[${timeAgo}] ${note.gitContext.currentBranch}${aiIndicator}`);
        console.log(`  "${note.message}"`);
        
        if (index < notes.length - 1) {
          console.log("");
        }
      });

    } catch (error) {
      console.error(`❌ Error listing contexts: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Deno.exit(1);
    }
  }

  async configCommand(action: string, key?: string, value?: string): Promise<void> {
    try {
      const config = await this.storage.getConfig();

      switch (action) {
        case "set":
          if (!key || !value) {
            console.error("❌ Usage: brain config set <key> <value>");
            console.log("   Available keys: openai-key, max-commits, ai-model, enable-ai");
            Deno.exit(1);
          }

          const updates: Partial<BrainConfig> = {};
          
          switch (key) {
            case "openai-key":
              updates.openaiApiKey = value;
              break;
            case "max-commits":
              const maxCommits = parseInt(value, 10);
              if (isNaN(maxCommits) || maxCommits < 1) {
                console.error("❌ max-commits must be a positive number");
                Deno.exit(1);
              }
              updates.maxCommits = maxCommits;
              break;
            case "ai-model":
              updates.aiModel = value;
              break;
            case "enable-ai":
              if (value !== "true" && value !== "false") {
                console.error("❌ enable-ai must be 'true' or 'false'");
                Deno.exit(1);
              }
              updates.enableAI = value === "true";
              break;
            default:
              console.error(`❌ Unknown config key: ${key}`);
              console.log("   Available keys: openai-key, max-commits, ai-model, enable-ai");
              Deno.exit(1);
          }

          await this.storage.updateConfig(updates);
          console.log(`✅ Updated ${key}: ${value}`);
          
          // Reinitialize AI client if API key was updated
          if (key === "openai-key" || key === "ai-model") {
            await this.initialize();
          }
          break;

        case "get":
          if (!key) {
            console.error("❌ Usage: brain config get <key>");
            Deno.exit(1);
          }

          let displayValue: string;
          switch (key) {
            case "openai-key":
              displayValue = config.openaiApiKey ? "***" + config.openaiApiKey.slice(-4) : "(not set)";
              break;
            case "max-commits":
              displayValue = config.maxCommits.toString();
              break;
            case "ai-model":
              displayValue = config.aiModel;
              break;
            case "enable-ai":
              displayValue = config.enableAI.toString();
              break;
            default:
              console.error(`❌ Unknown config key: ${key}`);
              Deno.exit(1);
          }
          
          console.log(`${key}: ${displayValue}`);
          break;

        case "list":
          console.log("\n⚙️  Current configuration:\n");
          console.log(`openai-key: ${config.openaiApiKey ? "***" + config.openaiApiKey.slice(-4) : "(not set)"}`);
          console.log(`max-commits: ${config.maxCommits}`);
          console.log(`ai-model: ${config.aiModel}`);
          console.log(`enable-ai: ${config.enableAI}`);
          console.log(`storage-path: ${config.storagePath}`);
          break;

        default:
          console.error("❌ Usage: brain config <set|get|list> [key] [value]");
          Deno.exit(1);
      }

    } catch (error) {
      console.error(`❌ Error managing config: ${error instanceof Error ? error.message : 'Unknown error'}`);
      Deno.exit(1);
    }
  }
}