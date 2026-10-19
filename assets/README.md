# Generated Wasm assets

Run `npm run build:wasm -- /path/to/taiyin-ephemeris` to generate
`taiyin_web.js` and `taiyin_web.wasm` here. Both are ignored build artifacts.

Keep the files together when deploying a browser application. The adjacent
`package.json` marks the Emscripten loader as CommonJS for Node; it does not
affect normal classic-script loading in a browser. The binding's public ESM
entry point is `dist/index.js`, not this generated loader.

No precise ephemeris dataset or fixed-star catalog is bundled in this folder.
