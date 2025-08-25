# Brain CLI v0.1.0 Installation

## Quick Install

### macOS

```bash
# Intel Macs
chmod +x brain-mac && sudo mv brain-mac /usr/local/bin/brain

# Apple Silicon Macs  
chmod +x brain-mac-arm64 && sudo mv brain-mac-arm64 /usr/local/bin/brain
```

### Linux

```bash
chmod +x brain-linux && sudo mv brain-linux /usr/local/bin/brain
```

## Verify Installation

```bash
brain --version
brain --help
```

## Next Steps

1. Navigate to a git repository
2. Set your OpenAI API key: `brain config set openai-key sk-...`
3. Save your first context: `brain save "your current thoughts"`

See README.md for complete documentation.
