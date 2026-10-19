# Generated Wasm assets

Run `npm run build:wasm -- /path/to/taiyin-ephemeris` to generate
`taiyin_web.mjs` and `taiyin_web.wasm` here. Both are ignored build artifacts.

Keep the files together when deploying a browser application. The ESM loader
is shared by Node, browsers and module Workers. The adjacent `package.json`
only supports explicitly supplied legacy CommonJS `.js` loaders; it does not
change the generated `.mjs` module. The public API entry is `dist/index.js`.

`npm run build:package` builds from the hash-verified public core archive,
checks the compiler/protocol, and generates `build-info.json` and SDK notices
in `licenses/`. Ordinary `npm pack` rejects missing or altered verified inputs.

No precise ephemeris dataset or fixed-star catalog is bundled in this folder.
