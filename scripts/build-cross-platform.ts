#!/usr/bin/env -S deno run --allow-run --allow-read --allow-write

const targets = [
  { platform: "x86_64-unknown-linux-gnu", suffix: "-linux" },
  { platform: "x86_64-apple-darwin", suffix: "-mac" },
  { platform: "aarch64-apple-darwin", suffix: "-mac-arm64" },
  { platform: "x86_64-pc-windows-msvc", suffix: ".exe" },
];

console.log("🔨 Building Brain CLI for all platforms...\n");

for (const target of targets) {
  const output = `bin/brain${target.suffix}`;
  const cmd = new Deno.Command("deno", {
    args: [
      "compile",
      "--allow-read", "--allow-write", "--allow-run", "--allow-net", "--allow-env",
      "--target", target.platform,
      "--output", output,
      "src/main.ts"
    ],
  });
  
  console.log(`Building for ${target.platform}...`);
  const result = await cmd.output();
  
  if (result.success) {
    console.log(`✅ Built ${output}`);
  } else {
    console.error(`❌ Failed to build ${output}`);
    const decoder = new TextDecoder();
    if (result.stderr.length > 0) {
      console.error(decoder.decode(result.stderr));
    }
  }
}

console.log("\n🎉 Cross-platform build complete!");
console.log("\nBuilt executables:");
for (const target of targets) {
  console.log(`  - bin/brain${target.suffix}`);
}