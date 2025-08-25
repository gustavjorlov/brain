# 🧠 Brain CLI

**Context management for developers with busy family lives.**

Brain CLI solves the context-switching problem by capturing your current
thoughts along with git activity, using AI to interpret the technical context,
and helping you seamlessly resume where you left off—even hours or days later.

## The Problem

You're debugging auth middleware timing issues, your 6-year-old needs help, and
when you return to your code 2 hours later, you've completely forgotten your
debugging strategy and current theories about the bug.

## The Solution

```bash
# When interrupted
brain save "auth timing issues - think tokens expire too fast"

# When you return
brain resume
# Shows your thoughts + AI analysis + suggested next steps
```

## Installation

### Option 1: Download Pre-built Binary (Recommended)

```bash
# macOS (Intel)
curl -L https://github.com/anthropics/brain-cli/releases/latest/download/brain-mac -o brain
chmod +x brain && sudo mv brain /usr/local/bin/

# macOS (Apple Silicon)  
curl -L https://github.com/anthropics/brain-cli/releases/latest/download/brain-mac-arm64 -o brain
chmod +x brain && sudo mv brain /usr/local/bin/

# Linux
curl -L https://github.com/anthropics/brain-cli/releases/latest/download/brain-linux -o brain
chmod +x brain && sudo mv brain /usr/local/bin/

# Windows
# Download brain.exe from releases and add to PATH
```

### Option 2: Install from Source (Requires Deno)

```bash
# Clone and build
git clone https://github.com/anthropics/brain-cli.git
cd brain-cli
deno task build

# Copy to PATH
sudo cp bin/brain /usr/local/bin/
```

## Quick Start

1. **Navigate to a git repository**
   ```bash
   cd your-project
   ```

2. **Set up your OpenAI API key** (optional but recommended)
   ```bash
   brain config set openai-key sk-your-key-here
   ```

3. **Save your first context**
   ```bash
   brain save "debugging user authentication flow"
   ```

4. **Resume when you return**
   ```bash
   brain resume
   ```

## Commands

### `brain save <message>`

Captures your current thinking with git context analysis.

```bash
brain save "debugging auth middleware - tokens expiring randomly"
brain save "refactoring user service, worried about breaking existing API" 
brain save "stuck on async race condition in payment flow" --no-ai
```

**What it captures:**

- Your message with timestamp
- Current git branch and recent commits
- Working directory status (staged/unstaged/untracked files)
- AI analysis and suggestions (if configured)

### `brain resume`

Shows your last saved context with AI analysis and current git status.

```bash
brain resume
brain resume --raw  # Show raw JSON data
```

**Example output:**

```
🧠 Last saved: 2 hours ago on feature/auth-improvements

💭 Your thoughts: "debugging auth middleware - tokens expiring randomly"

🤖 AI Analysis:
   Working on authentication flow issues with token expiry

📋 Technical Context:
   Recent commits show modifications to auth middleware and token validation logic

🎯 Suggested Next Steps:
   1. Check token expiry configuration in config/jwt.js
   2. Review async/await handling in middleware  
   3. Add timing logs to track token lifecycle

📁 Related Files:
   auth/middleware.js, config/jwt.js, tests/auth.test.js

📊 Current Status:
   Branch: feature/auth-improvements
   Staged: auth/middleware.js
   Unstaged: config/jwt.js
```

### `brain list [count]`

Shows recent context entries.

```bash
brain list              # Shows last 5 entries
brain list 10           # Shows last 10 entries  
brain list --branch feature/auth  # Filter by branch
```

### `brain config`

Manage configuration settings.

```bash
# Set configuration
brain config set openai-key sk-your-key-here
brain config set max-commits 15
brain config set ai-model gpt-3.5-turbo

# View configuration  
brain config list
brain config get openai-key
```

## Configuration

Brain stores all configuration in `~/.config/brain/config.json`.

**Available settings:**

| Key           | Description                                    | Default   |
| ------------- | ---------------------------------------------- | --------- |
| `openai-key`  | Your OpenAI API key (required for AI features) | (not set) |
| `max-commits` | Number of recent commits to analyze            | 10        |
| `ai-model`    | OpenAI model to use                            | gpt-4     |
| `enable-ai`   | Enable/disable AI analysis                     | true      |

## Data Storage

**All data is stored locally** in `~/.config/brain/`:

- `config.json` - Your settings
- `contexts.json` - Saved contexts with git data
- **No cloud storage or data sharing**
- Works completely offline (except AI features)

## Requirements

- **Git repository** (Brain analyzes git context)
- **OpenAI API key** (optional, for AI analysis)
- **Internet connection** (only for AI features)

## Use Cases

**Perfect for developers who:**

- Get interrupted frequently (family, meetings, context switching)
- Work on complex debugging that spans multiple sessions
- Want to track their problem-solving approach over time
- Need AI assistance to understand their own context after time away

**Example scenarios:**

- Debugging race conditions that take days to solve
- Complex refactoring with many moving parts
- Learning new codebases where context is crucial
- Working on features that require deep problem understanding

## Advanced Usage

### Branch-based Workflows

```bash
# Work on feature branch
git checkout feature/payment-flow
brain save "implementing stripe webhook validation"

# Switch to hotfix
git checkout hotfix/auth-bug  
brain save "urgent: login failing for enterprise users"

# Resume work on feature
git checkout feature/payment-flow
brain resume  # Shows your payment flow context

# See all feature work
brain list --branch feature/payment-flow
```

### Offline Usage

```bash
# Disable AI for offline work
brain save "working offline on data structures" --no-ai
brain config set enable-ai false
```

### Raw Data Access

```bash
# Export context as JSON
brain resume --raw > context-backup.json

# Pipe to other tools
brain list --raw | jq '.[] | select(.gitContext.currentBranch == "main")'
```

## Troubleshooting

### Common Issues

**❌ "Not in a git repository"**

```bash
cd your-project  # Navigate to git repo
# OR
git init  # Initialize new repo
```

**❌ AI features not working**

```bash
# Check configuration
brain config list

# Set API key
brain config set openai-key sk-your-key-here

# Test with --no-ai flag
brain save "test message" --no-ai
```

**❌ Permission errors**

```bash
# Check storage directory
ls -la ~/.config/brain/

# Reset permissions if needed
chmod -R 755 ~/.config/brain/
```

## Development

### Building from Source

```bash
# Prerequisites: Deno 1.40+
curl -fsSL https://deno.land/install.sh | sh

# Clone and build
git clone https://github.com/anthropics/brain-cli.git
cd brain-cli

# Run tests
deno task test

# Build for current platform
deno task build

# Build for all platforms
deno task build-all
```

### Running Tests

```bash
deno task test  # All tests
deno test tests/main.test.ts  # Specific test file
```

The codebase has **50/50 tests passing** with comprehensive coverage of all
components.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for new functionality
4. Ensure all tests pass: `deno task test`
5. Submit a pull request

## License

MIT License - see LICENSE file for details.

## Support

- **Issues**: [GitHub Issues](https://github.com/anthropics/brain-cli/issues)
- **Discussions**:
  [GitHub Discussions](https://github.com/anthropics/brain-cli/discussions)

---

**Brain CLI** - Never lose your context again. 🧠✨
