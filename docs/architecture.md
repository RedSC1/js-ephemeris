# Binding boundary

The npm workspace contains three distributable packages. `js-ephemeris` owns the
runtime, Wasm, time and calendar services. It has no JavaScript dependency on
`js-bazi` or `js-ziwei`; each optional package declares a matching core peer
dependency and augments the existing context only when imported.

The core's `extension-host` subpath shares lifecycle/transport capabilities and
calendar identity checks with the official extensions. It does not instantiate
another runtime. Each child remains registered with its owning core context,
so closure and cross-context calendar guards continue to work across packages.
All three packages use the same Wasm binary, including its embedded default Ziwei
tables; this split changes JavaScript API/package ownership, not the C++ binary.

```text
JS / TypeScript facade
  → internal record/ownership adapter
  → existing version-1 C++ Wasm bridge
  → Taiyin C ABI 11
  → existing core algorithms and routing
```

This package does not import either existing lite repository. The C++ checkout is a build input. Core changes are confined to the opt-in Wasm experiment: loader-environment selection (`web` by default, `web,node` here), additional field-wise astronomy/variable/callback adapters, explicit exports and an optional native oracle target. Native API/ABI and algorithms are unchanged.

`Ephemeris.initialize()` owns a fresh Emscripten instance, with contexts borrowing that instance. Contexts own their calendars and extension facades; extension facades borrow a calendar and own their chart handles. Owner closure closes descendants in dependency order. A calendar cannot be closed while a BaZi/Ziwei facade still borrows it. An object from another context is not accepted as a calendar dependency.

The transport uses private allocations and field-wise numeric records, not JavaScript interpretations of native struct offsets. Heap views are reacquired after calls/allocations that can grow memory. Outputs are copied before allocations are freed. Missing contact JD fractions become `null`; other non-applicable numeric geometry can remain `NaN` according to the C++ API. Normalizing a calendar rounding carry calls the C++ calendar rather than inventing a second calendar policy.

Runtime-owned Shen Sha catalogs/contexts and Ziwei data catalogs live outside astronomy contexts. A Ziwei context copies a compiled catalog snapshot, so a shared catalog can reload or close without changing existing charts. A custom catalog's TOML bytes are copied to a private MEMFS directory; failed reload restores the old file bundle and compiled snapshot. JSON rule modules remain immutable additions, not overrides of built-in options.

Shen Sha callback tokens are stored per Wasm instance. Each derived catalog/context retains the corresponding JS predicate references, even after its source closes. Evaluation pins the participating rules and rejects recursive evaluation/closure through them; callback exceptions are transported back and rethrown as the original JS value. Async predicates are invalid. Runtime closure is rejected while a callback/native operation is active. Normal owner shutdown destroys astronomy descendants first, then runtime-owned catalogs and Shen Sha contexts in reverse creation order.

Input flags, result flags and fatal status remain distinct. Uint64 masks require safe nonnegative integer numbers or in-range bigint values, validated before combining flags; masks are split into low/high uint32 values for transport. Successful position batches return the union of every row's result flags, including unknown unsigned high bits. Fatal errors are decoded before constructing user-facing data objects. Failed batch calls preserve diagnostics for all targets.

Configuration setters, including mutable time-policy setters, reject callback reentry while that context has an active calculation. Read-only nested time conversions remain supported, and inactive contexts can be configured independently. Rejected mutations leave the native configuration and the cached JS TDB model unchanged.

Record schemas are generated from the C++ bridge packers and C headers. Eclipse signatures are generated with the Dart-facing method names. To regenerate after a bridge change:

```sh
node scripts/generate-records.mjs /path/to/taiyin-ephemeris
node scripts/generate-eclipse.mjs /path/to/taiyin-ephemeris
node scripts/generate-astronomy.mjs /path/to/taiyin-ephemeris --js-only
npm run format
npm test
npm run test:integration
```

The generator validates the expected bridge operation count; it is not a general C++ parser. Astronomy's `--js-only` refreshes the JS files without writing into the core checkout; omit it only when intentionally regenerating the C++ bridge too. Inspect generated diffs and rerun real Wasm tests when the bridge changes.

The astronomy generator additionally produces a finite 107-operation adapter and concrete public service signatures from C ABI headers. Its generated signature is checked before astronomy calls and runtime metadata decoding (`registeredDataSources` and `capabilities`), rejecting mismatched JS/Wasm artifacts. Variable-size star/observed batches retain per-entry diagnostics and copy all output; uint64 source item counts and capabilities are split into two words and exposed as bigint. Synchronous target/ayanamsha/house callbacks copy input before calling JS and reacquire the heap view afterward; callback exceptions are consumed only after reply allocations have been freed. These registrations are runtime-owned and cannot be changed during evaluation.

## Bundlers and Workers

The default ESM loader in `assets/` is imported by URL and instantiates a fresh
Emscripten module in Node, browsers and Workers. It does not require a DOM.
Explicitly supplied legacy `.js` loaders retain the classic-script/CommonJS
path. Data files never become executable script.

For an environment that already imports the factory, inject it:

```js
const eph = await Ephemeris.initialize({
  wasmModuleUri: new URL("/assets/taiyin_web.mjs", location.href),
  moduleFactory: (options) => createTaiyinModule(options),
});
```

Both module and classic Workers can use the default ESM loader. A classic
Worker imports the public JS API with dynamic `import()`. An explicitly supplied
legacy classic loader still needs an injected factory in Workers. Loader and
Wasm asset deployment remains application/build-tool policy; no Vite/Webpack
plugin is assumed. See [installed-package testing](packaging.md).

One instance is single-threaded; contexts are not transferable thread-safe handles. For parallel CPU work, create one runtime per Worker. There is no SharedArrayBuffer/pthread build in this first version and no COOP/COEP requirement just for the current single-threaded runtime. Node's asynchronous initializer does not turn subsequent synchronous calculations into parallel tasks.

Closing handles releases their C++ resources. WebAssembly linear memory itself is reclaimed by JavaScript garbage collection after the runtime and its facade references become unreachable; `close()` cannot shrink the WebAssembly memory object.
