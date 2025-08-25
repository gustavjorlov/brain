#!/usr/bin/env -S deno run --allow-read --allow-write

/**
 * Package release script for Brain CLI
 * Creates a release directory with all necessary files
 */

import { copy, ensureDir } from "@std/fs";
import { join } from "@std/path";

const VERSION = "0.1.0";
const RELEASE_DIR = `release-v${VERSION}`;

console.log("📦 Packaging Brain CLI release...\n");

// Create release directory
await ensureDir(RELEASE_DIR);

// Copy executables
const executables = [
  "brain-linux",
  "brain-mac",
  "brain-mac-arm64",
];

for (const executable of executables) {
  const src = `bin/${executable}`;
  const dest = join(RELEASE_DIR, executable);

  try {
    await copy(src, dest);
    console.log(`✅ Copied ${executable}`);
  } catch (error) {
    console.log(`❌ Failed to copy ${executable}: ${error.message}`);
  }
}

// Copy documentation
const docs = [
  "README.md",
  "CLAUDE.md",
  "description.md",
];

for (const doc of docs) {
  try {
    await copy(doc, join(RELEASE_DIR, doc));
    console.log(`✅ Copied ${doc}`);
  } catch (error) {
    console.log(`❌ Failed to copy ${doc}: ${error.message}`);
  }
}

// Create installation instructions
const installInstructions = `# Brain CLI v${VERSION} Installation

## Quick Install

### macOS
\`\`\`bash
# Intel Macs
chmod +x brain-mac && sudo mv brain-mac /usr/local/bin/brain

# Apple Silicon Macs  
chmod +x brain-mac-arm64 && sudo mv brain-mac-arm64 /usr/local/bin/brain
\`\`\`

### Linux
\`\`\`bash
chmod +x brain-linux && sudo mv brain-linux /usr/local/bin/brain
\`\`\`

## Verify Installation
\`\`\`bash
brain --version
brain --help
\`\`\`

## Next Steps
1. Navigate to a git repository
2. Set your OpenAI API key: \`brain config set openai-key sk-...\`
3. Save your first context: \`brain save "your current thoughts"\`

See README.md for complete documentation.
`;

await Deno.writeTextFile(join(RELEASE_DIR, "INSTALL.md"), installInstructions);
console.log("✅ Created INSTALL.md");

// Create checksums for verification
const checksums = [];
for (const executable of executables) {
  const filePath = join(RELEASE_DIR, executable);
  try {
    const data = await Deno.readFile(filePath);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join(
      "",
    );
    checksums.push(`${hashHex}  ${executable}`);
    console.log(`✅ Generated checksum for ${executable}`);
  } catch (error) {
    console.log(
      `❌ Failed to generate checksum for ${executable}: ${error.message}`,
    );
  }
}

await Deno.writeTextFile(
  join(RELEASE_DIR, "checksums.txt"),
  checksums.join("\n"),
);
console.log("✅ Created checksums.txt");

console.log(`\n🎉 Release package ready in ${RELEASE_DIR}/`);
console.log("\nRelease contents:");
const entries = [];
for await (const entry of Deno.readDir(RELEASE_DIR)) {
  entries.push(entry.name);
}
entries.sort().forEach((name) => console.log(`  - ${name}`));

console.log(`\n📊 Total files: ${entries.length}`);
console.log("🚀 Ready for distribution!");
