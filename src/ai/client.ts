import type { GitContext, AIInterpretation } from "../storage/models.ts";

interface OpenAIResponse {
  choices: Array<{
    message: {
      content: string;
    };
  }>;
  error?: {
    message: string;
    type: string;
  };
}

export class AIClient {
  private apiKey: string;
  private model: string;
  private baseUrl = "https://api.openai.com/v1/chat/completions";

  constructor(apiKey: string, model: string = "gpt-4") {
    this.apiKey = apiKey;
    this.model = model;
  }

  generatePrompt(userMessage: string, gitContext: GitContext): string {
    const { currentBranch, recentCommits, workingDirectoryChanges, repositoryPath } = gitContext;

    const commitSummary = recentCommits
      .slice(0, 5) // Limit to recent 5 commits
      .map(commit => `- ${commit.hash.slice(0, 7)}: ${commit.message} (${commit.filesChanged.join(', ')})`)
      .join('\n');

    const workingDirSummary = [
      workingDirectoryChanges.staged.length > 0 ? `Staged: ${workingDirectoryChanges.staged.join(', ')}` : null,
      workingDirectoryChanges.unstaged.length > 0 ? `Unstaged: ${workingDirectoryChanges.unstaged.join(', ')}` : null,
      workingDirectoryChanges.untracked.length > 0 ? `Untracked: ${workingDirectoryChanges.untracked.join(', ')}` : null,
    ].filter(Boolean).join('\n');

    return `You are a senior software developer helping analyze a coding context. A developer has saved their current thoughts along with git repository information.

Developer's Message: "${userMessage}"

Git Context:
- Current Branch: ${currentBranch}
- Repository: ${repositoryPath}

Recent Commits:
${commitSummary || 'No recent commits'}

Working Directory Changes:
${workingDirSummary || 'No changes'}

Please analyze this context and provide insights in JSON format with these exact fields:
{
  "summary": "Brief summary of what the developer is working on",
  "technicalContext": "Technical analysis of the code changes and patterns",
  "suggestedNextSteps": ["Array of specific actionable next steps"],
  "relatedFiles": ["Array of files that might be relevant to continue the work"],
  "confidenceScore": 0.0-1.0 (how confident you are in this analysis)
}

Focus on being practical and actionable. Consider the recent commit patterns, file changes, and the developer's stated concerns.`;
  }

  async analyzeContext(userMessage: string, gitContext: GitContext): Promise<AIInterpretation> {
    if (!this.apiKey || this.apiKey.trim() === "") {
      throw new Error("OpenAI API key is required");
    }

    const prompt = this.generatePrompt(userMessage, gitContext);

    const requestBody = {
      model: this.model,
      messages: [
        {
          role: "user" as const,
          content: prompt,
        }
      ],
      temperature: 0.3,
      max_tokens: 1000,
    };

    try {
      const response = await fetch(this.baseUrl, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${this.apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json() as OpenAIResponse;
        if (response.status === 429) {
          throw new Error("OpenAI API rate limit exceeded. Please try again later.");
        }
        throw new Error(`OpenAI API error (${response.status}): ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json() as OpenAIResponse;

      if (!data.choices || data.choices.length === 0) {
        throw new Error("No response from AI");
      }

      const content = data.choices[0].message.content;

      try {
        const parsed = JSON.parse(content) as AIInterpretation;
        
        // Validate required fields
        if (!parsed.summary || !parsed.technicalContext || !parsed.suggestedNextSteps || !parsed.relatedFiles || typeof parsed.confidenceScore !== 'number') {
          throw new Error("Invalid AI response format: missing required fields");
        }

        // Ensure arrays
        if (!Array.isArray(parsed.suggestedNextSteps) || !Array.isArray(parsed.relatedFiles)) {
          throw new Error("Invalid AI response format: suggestedNextSteps and relatedFiles must be arrays");
        }

        // Validate confidence score range
        if (parsed.confidenceScore < 0 || parsed.confidenceScore > 1) {
          parsed.confidenceScore = Math.max(0, Math.min(1, parsed.confidenceScore));
        }

        return parsed;
      } catch (jsonError) {
        if (jsonError instanceof Error && jsonError.message.includes("Invalid AI response format")) {
          throw jsonError; // Re-throw our validation errors
        }
        throw new Error("Failed to parse AI response: invalid JSON format");
      }

    } catch (error) {
      if (error instanceof Error) {
        // Re-throw our custom errors
        if (error.message.includes("OpenAI API") || error.message.includes("No response") || error.message.includes("Failed to parse")) {
          throw error;
        }
        // Network or other errors
        throw new Error(`Failed to connect to OpenAI API: ${error.message}`);
      }
      throw new Error("Unknown error occurred while calling OpenAI API");
    }
  }

  async testConnection(): Promise<boolean> {
    try {
      // Simple test with minimal context
      const testGitContext: GitContext = {
        currentBranch: "main",
        recentCommits: [],
        workingDirectoryChanges: { staged: [], unstaged: [], untracked: [] },
        repositoryPath: "/test"
      };

      await this.analyzeContext("Connection test", testGitContext);
      return true;
    } catch {
      return false;
    }
  }
}