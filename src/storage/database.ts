import { ensureDir } from "@std/fs";
import { join } from "@std/path";
import type { BrainConfig, WorkNote } from "./models.ts";

interface StoredData {
  workNotes: Record<string, WorkNote>;
}

export class Storage {
  private storagePath: string;
  private configPath: string;
  private dataPath: string;
  private config: BrainConfig | null = null;
  private data: StoredData = { workNotes: {} };

  constructor(storagePath: string) {
    this.storagePath = storagePath;
    this.configPath = join(storagePath, "config.json");
    this.dataPath = join(storagePath, "contexts.json");
  }

  async initialize(): Promise<void> {
    try {
      await ensureDir(this.storagePath);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unknown error";
      throw new Error(`Failed to create storage path: ${message}`);
    }

    await this.loadConfig();
    await this.loadData();
  }

  private async loadConfig(): Promise<void> {
    try {
      const configText = await Deno.readTextFile(this.configPath);
      this.config = JSON.parse(configText);
    } catch {
      // Create default config if file doesn't exist
      this.config = {
        maxCommits: 10,
        aiModel: "gpt-4",
        storagePath: this.storagePath,
        enableAI: true,
      };
      await this.saveConfig();
    }
  }

  private async saveConfig(): Promise<void> {
    if (!this.config) return;

    await Deno.writeTextFile(
      this.configPath,
      JSON.stringify(this.config, null, 2),
    );
  }

  private async loadData(): Promise<void> {
    try {
      const dataText = await Deno.readTextFile(this.dataPath);
      this.data = JSON.parse(dataText);

      // Check if migration is needed and perform it
      const migrationNeeded = this.checkMigrationNeeded();
      if (migrationNeeded) {
        this.performMigration();
        await this.saveData(); // Save migrated data
      }
    } catch {
      // Create empty data structure if file doesn't exist or is corrupted
      this.data = { workNotes: {} };
      await this.saveData();
    }
  }

  private async saveData(): Promise<void> {
    await Deno.writeTextFile(
      this.dataPath,
      JSON.stringify(this.data, null, 2),
    );
  }

  private checkMigrationNeeded(): boolean {
    // Check if any work notes lack repositoryInfo
    return Object.values(this.data.workNotes).some((note) =>
      !(note as unknown as { repositoryInfo?: unknown }).repositoryInfo
    );
  }

  private performMigration(): void {
    const workNotes = this.data.workNotes;
    let migratedCount = 0;

    for (const [_id, note] of Object.entries(workNotes)) {
      const typedNote = note as unknown as {
        repositoryInfo?: { path: string; identifier: string };
        gitContext?: { repositoryPath?: string };
      };

      // Skip notes that already have repositoryInfo
      if (typedNote.repositoryInfo) {
        continue;
      }

      // Add repositoryInfo based on gitContext.repositoryPath
      let repositoryPath = "unknown";
      if (typedNote.gitContext?.repositoryPath) {
        repositoryPath = typedNote.gitContext.repositoryPath;
      }

      typedNote.repositoryInfo = {
        path: repositoryPath,
        identifier: repositoryPath,
      };

      migratedCount++;
    }

    if (migratedCount > 0) {
      console.log(
        `🔄 Migrated ${migratedCount} legacy context(s) to include repository information`,
      );
    }
  }

  getConfig(): BrainConfig {
    if (!this.config) {
      throw new Error("Storage not initialized");
    }
    return { ...this.config };
  }

  async updateConfig(updates: Partial<BrainConfig>): Promise<void> {
    if (!this.config) {
      throw new Error("Storage not initialized");
    }

    this.config = { ...this.config, ...updates };
    await this.saveConfig();
  }

  async saveWorkNote(workNote: WorkNote): Promise<void> {
    this.data.workNotes[workNote.id] = { ...workNote };
    await this.saveData();
  }

  getWorkNote(id: string): WorkNote | null {
    const workNote = this.data.workNotes[id];
    return workNote ? { ...workNote } : null;
  }

  getLatestWorkNote(): WorkNote | null {
    const workNotes = Object.values(this.data.workNotes);

    if (workNotes.length === 0) {
      return null;
    }

    // Sort by timestamp (newest first)
    workNotes.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return { ...workNotes[0] };
  }

  getRecentWorkNotes(limit: number = 5, repositoryId?: string): WorkNote[] {
    let workNotes = Object.values(this.data.workNotes);

    // Filter by repository if specified
    if (repositoryId) {
      workNotes = workNotes.filter((note) =>
        note.repositoryInfo?.identifier === repositoryId
      );
    }

    if (workNotes.length === 0) {
      return [];
    }

    // Sort by timestamp (newest first) and limit results
    workNotes.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return workNotes.slice(0, limit).map((note) => ({ ...note }));
  }

  getAllWorkNotes(): WorkNote[] {
    const workNotes = Object.values(this.data.workNotes);

    // Sort by timestamp (newest first)
    workNotes.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return workNotes.map((note) => ({ ...note }));
  }

  getWorkNotesByRepository(repositoryId: string): WorkNote[] {
    const workNotes = Object.values(this.data.workNotes);

    // Filter by repository identifier
    const filteredNotes = workNotes.filter((note) =>
      note.repositoryInfo?.identifier === repositoryId
    );

    // Sort by timestamp (newest first)
    filteredNotes.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return filteredNotes.map((note) => ({ ...note }));
  }

  getLastWorkNote(repositoryId?: string): WorkNote | null {
    let workNotes = Object.values(this.data.workNotes);

    // Filter by repository if specified
    if (repositoryId) {
      workNotes = workNotes.filter((note) =>
        note.repositoryInfo?.identifier === repositoryId
      );
    }

    if (workNotes.length === 0) {
      return null;
    }

    // Sort by timestamp (newest first)
    workNotes.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return { ...workNotes[0] };
  }

  async deleteWorkNote(id: string): Promise<boolean> {
    if (this.data.workNotes[id]) {
      delete this.data.workNotes[id];
      await this.saveData();
      return true;
    }
    return false;
  }

  getWorkNotesByBranch(branch: string): WorkNote[] {
    const workNotes = Object.values(this.data.workNotes);

    const branchNotes = workNotes.filter((note) =>
      note.gitContext.currentBranch === branch
    );

    // Sort by timestamp (newest first)
    branchNotes.sort((a, b) =>
      new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    return branchNotes.map((note) => ({ ...note }));
  }

  async getStorageStats(): Promise<{
    totalNotes: number;
    storageSize: number;
    oldestNote: string | null;
    newestNote: string | null;
  }> {
    const workNotes = Object.values(this.data.workNotes);

    let storageSize = 0;
    try {
      const configStat = await Deno.stat(this.configPath);
      const dataStat = await Deno.stat(this.dataPath);
      storageSize = configStat.size + dataStat.size;
    } catch {
      // Ignore stat errors
    }

    if (workNotes.length === 0) {
      return {
        totalNotes: 0,
        storageSize,
        oldestNote: null,
        newestNote: null,
      };
    }

    workNotes.sort((a, b) =>
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    return {
      totalNotes: workNotes.length,
      storageSize,
      oldestNote: workNotes[0].timestamp,
      newestNote: workNotes[workNotes.length - 1].timestamp,
    };
  }
}
