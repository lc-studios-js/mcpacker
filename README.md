# @lc-studios-js/mcpacker

A Minecraft Bedrock addon compiler.

Install:

```bash
pnpm i @lc-studios-js/mcpacker -D
pnpm mcpacker --help
```

Config:

```js
// mcpacker.config.mjs

import { defineConfig } from "@lc-studios-js/mcpacker";

// Follow the information from the typescript language server.
// Sorry, no detailed documentation available at this time!
export default defineConfig((args) => {
  return {
    // Define as many packs as you want:
    packs: [
      {
        type: "behavior",
        name: "BP",
        srcDir: "src/bp",
        outDir: "dist/bp",
        manifest: {
          // Sample: https://github.com/Mojang/bedrock-samples/blob/main/behavior_pack/manifest.json
        },
        // watch: args.watch,
        // scripts: {
        // 	 entry: "src/bp/scripts/main.ts",
        // 	 bundle: true,
        // 	 sourceMap: true,
        // },
      },
    ],
  };
});
```

Run:

```bash
pnpm mcpacker
```

TODO: Write more details
