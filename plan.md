Here's the updated comprehensive plan with "brain" as the tool name:

## Phase 1: Technical Setup & Architecture

**1. Project Initialization**

```bash
mkdir brain && cd brain
deno init
```

**2. Project Structure**

```
brain/
├── src/
│   ├── main.ts           # CLI entry point
│   ├── git/              # Git operations
│   │   ├── analyzer.ts
│   │   └── types.ts
│   ├── ai/               # OpenAI integration
│   │   ├── client.ts
│   │   └── prompts.ts
│   ├── storage/          # Local data persistence
│   │   ├── database.ts
│   │   └── models.ts
│   ├── cli/              # Command handling
│   │   ├── commands.ts
│   │   └── parser.ts
│   └── utils/
│       └── config.ts
├── tests/
├── bin/                  # Compiled executables
├── deno.json
└── README.md
```

**3. Dependencies & Build Setup (deno.json)**

```json
{
  "tasks": {
    "dev": "deno run --allow-all src/main.ts",
    "test": "deno test --allow-all tests/",
    "build": "deno compile --allow-read --allow-write --allow-run --allow-net --output bin/brain src/main.ts",
    "build-all": "deno run --allow-all scripts/build-cross-platform.ts",
    "install": "deno install --allow-read --allow-write --allow-run --allow-net --global --name brain src/main.ts",
    "uninstall": "deno uninstall brain"
  },
  "imports": {
    "@std/cli": "jsr:@std/cli@^1.0.0",
    "@std/fs": "jsr:@std/fs@^1.0.0",
    "@std/path": "jsr:@std/path@^1.0.0",
    "@std/testing": "jsr:@std/testing@^1.0.0"
  }
}
```

## Phase 2: TDD Implementation (Feature by Feature)

**4. Core Types & Models (TDD)**

```bash
touch tests/models.test.ts
```

Test-drive the core data structures:

- `GitContext` interface
- `WorkNote` interface
- `AIInterpretation` interface

**5. Git Analyzer Module (TDD)**

```bash
touch tests/git-analyzer.test.ts
```

Test scenarios:

- Parse git log output
- Extract current branch name
- Get file change statistics
- Handle git command errors
- Mock git commands for testing

**6. Storage Layer (TDD)**

```bash
touch tests/storage.test.ts
```

Test cases:

- Save work notes to local storage
- Retrieve notes by timestamp/branch
- Handle storage initialization
- Data serialization/deserialization
- File system permissions

**7. AI Integration (TDD)**

```bash
touch tests/ai-client.test.ts
```

Test scenarios:

- Format prompts correctly
- Handle OpenAI API responses
- Mock API calls for tests
- Error handling (rate limits, network issues)
- Configuration management

## Phase 3: CLI Implementation

**8. Command Parser (TDD)**

```bash
touch tests/cli-parser.test.ts
```

Test cases:

- Parse `save` command with message
- Parse `resume` command
- Parse `list` command
- Handle invalid commands
- Argument validation

**9. Save Command (TDD)**

```bash
touch tests/save-command.test.ts
```

Integration tests:

- Capture git context
- Send to AI for interpretation
- Store enriched context
- Handle errors gracefully

**10. Resume Command (TDD)**

```bash
touch tests/resume-command.test.ts
```

Test scenarios:

- Display latest context
- Format output nicely
- Handle no previous context
- Show git changes since save

## Phase 4: Integration & Polish

**11. CLI Entry Point**

```bash
touch tests/main.test.ts
```

End-to-end tests:

- Full command execution
- Error handling
- Help text
- Version display

**12. Configuration Management**

```bash
touch tests/config.test.ts
```

Test cases:

- OpenAI API key handling
- Default settings
- Config file creation
- Environment variables

## Phase 5: Build & Distribution

**13. Cross-Platform Build Script**

```bash
touch scripts/build-cross-platform.ts
```

Create automated builds for:

- Linux (x86_64)
- macOS (x86_64 & ARM64)

**14. Local Development Installation**

```bash
# During development - test the install process
deno task build
./bin/brain --help

# Install globally for testing
deno task install
brain --version
```

**15. Executable Testing**

```bash
touch tests/executable.test.ts
```

Test the compiled executable:

- Verify global installation works
- Test executable runs without Deno runtime
- Cross-platform compatibility checks
- Performance benchmarks

**16. Distribution Documentation** Update README.md with:

- Installation instructions for end users
- Build instructions for contributors
- Cross-platform compatibility notes
- Uninstall instructions

## Updated Usage Examples

**Core CLI Commands:**

```bash
# Quick context capture
brain save "trying to figure out why JWT validation fails intermittently"

# Resume with AI analysis  
brain resume

# View recent context history
brain list
```

## Sample Build Script

**`scripts/build-cross-platform.ts`:**

```typescript
const targets = [
  { platform: "x86_64-unknown-linux-gnu", suffix: "-linux" },
  { platform: "x86_64-apple-darwin", suffix: "-mac" },
  { platform: "aarch64-apple-darwin", suffix: "-mac-arm64" },
];

for (const target of targets) {
  const output = `bin/brain${target.suffix}`;
  const cmd = new Deno.Command("deno", {
    args: [
      "compile",
      "--allow-read",
      "--allow-write",
      "--allow-run",
      "--allow-net",
      "--target",
      target.platform,
      "--output",
      output,
      "src/main.ts",
    ],
  });

  console.log(`Building for ${target.platform}...`);
  const result = await cmd.output();

  if (result.success) {
    console.log(`✅ Built ${output}`);
  } else {
    console.error(`❌ Failed to build ${output}`);
  }
}
```

## Development Workflow

**TDD Cycle with Executable Testing:**

1. Write failing test
2. Write minimal code to pass
3. Refactor
4. Run `deno test`
5. Build and test executable: `deno task build && ./bin/brain`
6. Install and test globally when ready: `deno task install`

**Release Process:**

1. All tests pass
2. Build cross-platform executables: `deno task build-all`
3. Test executables on different platforms
4. Tag release and distribute binaries

Perfect! "brain" is much more concise and intuitive -
`brain save "debugging auth"` and `brain resume` feel natural to type.

## Phase 6: Repository Context Isolation

**Issue**: Context leakage between different repositories - `brain resume` shows contexts from all repos instead of just the current one.

**Strategy**: Use repository path-based identification (Option 1) for robust, unique identification.

**17. Repository-Aware Data Models**

Update core interfaces to include repository identification:

```typescript
// src/storage/models.ts updates
interface RepositoryInfo {
  path: string;              // Absolute repository root path  
  identifier: string;        // Computed unique identifier (normalized path)
}

interface WorkNote {
  id: string;
  message: string;
  timestamp: string;
  gitContext: GitContext;
  repositoryInfo: RepositoryInfo;  // NEW FIELD
  aiInterpretation?: AIInterpretation;
}
```

**18. Repository-Aware Storage Tests (TDD)**

```bash
touch tests/storage-repo-isolation.test.ts
```

Critical test scenarios:
- Save contexts from different repository paths
- Retrieve contexts filtered by current repository only
- Cross-repo isolation (repo A contexts don't appear in repo B)
- Same repo identification across different working directories
- Migration of existing contexts without repository info
- Handle repository moves/renames gracefully

**19. Enhanced Git Analyzer**

```bash
# Update tests/git-analyzer.test.ts
```

Add repository identification methods:
- `getRepositoryRoot()`: Get absolute path to repository root
- `getRepositoryIdentifier()`: Compute unique repo identifier  
- Update `analyze()` to include repository info

**20. Repository-Aware Storage Layer**

```bash
# Update tests/storage.test.ts
```

Enhanced storage methods:
- `getRecentWorkNotes(limit: number, repositoryId?: string): WorkNote[]`
- `getLastWorkNote(repositoryId?: string): WorkNote | null`
- `getWorkNotesByRepository(repositoryId: string): WorkNote[]`
- `migrateExistingContexts(): Promise<void>`

**21. CLI Repository Integration Tests**

```bash
touch tests/cli-repo-integration.test.ts
```

End-to-end repository isolation tests:
- `brain save` in different repositories
- `brain resume` shows only current repo contexts  
- `brain list` filters by current repository
- Switching between repos maintains proper isolation
- Migration messages for existing data

**22. Data Migration Strategy**

Handle backward compatibility:
1. Detect contexts without repository info
2. Attempt to infer repository from existing `repositoryPath` 
3. Mark legacy contexts with computed repository identifier
4. Provide migration status/warnings to user

**Key Test Cases:**

```bash
# Cross-repo isolation test
cd /repo-a && brain save "context A" && cd /repo-b && brain resume
# Should NOT show "context A"

# Same repo, different paths test  
cd /repo-a && brain save "test" && cd /repo-a/subdir && brain resume
# Should show "test"

# Repository identification test
mv /repo-a /repo-a-renamed && cd /repo-a-renamed && brain resume
# Should work with path normalization
```
