## Application Description

**Brain** is a CLI tool that solves the context-switching problem for developers
with busy family lives. When you're deep in debugging or development and need to
suddenly switch to family time, you lose your mental context about what you were
thinking and what to try next. Brain captures your current thoughts along with
your git activity, uses AI to interpret the technical context, and helps you
seamlessly resume where you left off - even hours or days later.

**Core Problem:** You're debugging auth middleware timing issues, your
6-year-old needs help, and when you return to your code 2 hours later, you've
completely forgotten your debugging strategy and current theories about the bug.

**Solution:** `brain save "auth timing issues - think tokens expire too fast"`
captures your thoughts + recent git activity. Later, `brain resume` shows your
original thoughts plus AI analysis of your code changes and suggested next
steps.

---

## CLI Documentation

### Installation

```bash
# Install globally
deno install --allow-read --allow-write --allow-run --allow-net --global --name brain https://github.com/yourname/brain/raw/main/src/main.ts

# Or download executable and add to PATH
curl -L https://github.com/yourname/brain/releases/latest/download/brain-linux -o brain
chmod +x brain && sudo mv brain /usr/local/bin/
```

### Commands

#### `brain save <message>`

Captures your current thinking with git context analysis.

```bash
brain save "debugging auth middleware - tokens expiring randomly"
brain save "refactoring user service, worried about breaking existing API"
brain save "stuck on async race condition in payment flow"
```

**What it does:**

- Records your message with timestamp
- Analyzes recent git commits on current branch
- Sends context to AI for interpretation
- Stores enriched context locally

#### `brain resume`

Shows your last saved context with AI analysis.

```bash
brain resume
```

**Example output:**

```
Last saved: 2 hours ago on feature/auth-improvements

Your thoughts: "debugging auth middleware - tokens expiring randomly"

AI Analysis:
You've been working on authentication flow issues. Recent commits show:
• Modified auth/middleware.js (3 times in last day)
• Updated token validation logic  
• Added debug logging to validateToken()

Suggested next steps:
• Check token expiry configuration in config/jwt.js
• Review async/await handling in middleware
• Add timing logs to track token lifecycle

Current git status: 1 file staged, auth/middleware.js has unstaged changes
```

#### `brain list [count]`

Shows recent context entries.

```bash
brain list          # Shows last 5 entries
brain list 10       # Shows last 10 entries
```

**Example output:**

```
Recent contexts:

[2 hours ago] feature/auth-improvements
  "debugging auth middleware - tokens expiring randomly"

[1 day ago] feature/user-dashboard  
  "pagination component not rendering correctly on mobile"

[3 days ago] main
  "preparing for deployment - need to update env configs"
```

#### `brain config`

Manage configuration settings.

```bash
brain config set openai-key sk-...           # Set OpenAI API key
brain config set max-commits 15              # Number of commits to analyze  
brain config get openai-key                  # View current API key
brain config list                            # Show all settings
```

### Options

#### Global Options

```bash
brain --help        # Show help
brain --version     # Show version
brain -v           # Verbose output
brain --no-ai      # Skip AI analysis (save only)
```

#### Command-Specific Options

```bash
brain save "message" --branch-only          # Only analyze current branch (default)
brain save "message" --no-files             # Skip file change analysis
brain resume --raw                          # Show raw data without formatting
brain resume --since="2 days ago"           # Show context from specific timeframe
brain list --branch=feature/auth            # Filter by branch
```

### Configuration

**Config file location:** `~/.config/brain/config.json`

**Required setup:**

```bash
brain config set openai-key your-api-key-here
```

**Optional settings:**

```bash
brain config set max-commits 10             # Default: 10
brain config set storage-path ~/.brain      # Default: ~/.config/brain/data
brain config set ai-model gpt-4             # Default: gpt-4
```

### Data Storage

All data stored locally in `~/.config/brain/`:

- `config.json` - User settings
- `data/contexts.json` - Saved contexts
- No cloud storage, no data sharing

### Requirements

- Git repository (must be run inside a git repo)
- OpenAI API key
- Internet connection (for AI analysis)

### Error Handling

```bash
brain save "test"                    # ❌ Error: Not in a git repository
brain resume                         # ❌ Error: No previous context found  
brain config set openai-key         # ❌ Error: OpenAI API key required
```

This documentation gives you clear specifications to implement against and
serves as test scenarios for your TDD approach!
