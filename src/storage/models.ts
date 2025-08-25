/**
 * Core data types and interfaces for Brain CLI
 */

export interface GitCommit {
  hash: string;
  message: string;
  timestamp: string;
  author: string;
  filesChanged: string[];
}

export interface WorkingDirectoryChanges {
  staged: string[];
  unstaged: string[];
  untracked: string[];
}

export interface GitContext {
  currentBranch: string;
  recentCommits: GitCommit[];
  workingDirectoryChanges: WorkingDirectoryChanges;
  repositoryPath: string;
}

export interface AIInterpretation {
  summary: string;
  technicalContext: string;
  suggestedNextSteps: string[];
  relatedFiles: string[];
  confidenceScore: number;
}

export interface WorkNote {
  id: string;
  message: string;
  timestamp: string;
  gitContext: GitContext;
  aiInterpretation?: AIInterpretation;
}

export interface BrainConfig {
  openaiApiKey?: string;
  maxCommits: number;
  aiModel: string;
  storagePath: string;
  enableAI: boolean;
}
