# Running CompText on Termux (Android ARM64)

CompText runs fully offline on Android via [Termux](https://termux.dev). The full pipeline (all 5 clinical scenarios) executes in ~20 ms on a mid-range phone and the Vite visualizer is reachable from any device on the same Wi-Fi.

---

## Why Termux

- **Edge-AI story**: validate the pipeline on the same hardware class that would run MedGemma at the bedside
- **Offline-first**: after `npm install`, no network is required — the smoke test is deterministic
- **Privacy**: PHI never leaves the device (NURSE scrubbing happens locally, before anything is serialised)

---

## Prerequisites

1. **Termux from [F-Droid](https://f-droid.org/packages/com.termux/)** — the Play Store build is stale and breaks `pkg install`.
2. Android 8+ (ARM64 or ARMv7).
3. ~500 MB free storage for `node_modules` + `packages/core/dist`.

> ⚠️ Do **not** install Termux from the Play Store. It has been unmaintained since 2020 and its package mirrors are broken.

---

## 1-Click Setup

```bash
pkg install -y git
git clone https://github.com/ProfRandom92/comptext-monorepo-X
cd comptext-monorepo-X
npm run setup:termux
```

The setup script (`scripts/setup_termux.sh`) is idempotent and safe to re-run. It:

1. Installs `nodejs-lts`, `git`, `jq`, `bash` via `pkg` (only the missing ones)
2. Runs `termux-setup-storage` so `~/storage` is available
3. Runs `npm install --no-audit --no-fund --prefer-offline` with `SKIP_HUSKY=1`
4. Builds `@comptext/core` (`dist/` with ESM + CJS + DTS)
5. Runs the deterministic smoke test on all 5 clinical scenarios
6. Prints the LAN IP for the visualizer

Expected smoke-test output:

```
✓ stemi        TRI=P1  reduction=91.6%  (1847 → 155 tokens)
✓ sepsis       TRI=P1  reduction=93.7%  (2213 → 140 tokens)
✓ stroke       TRI=P1  reduction=94.4%  (2041 → 114 tokens)
✓ anaphylaxie  TRI=P1  reduction=92.1%  (1742 → 138 tokens)
✓ dm_hypo      TRI=P2  reduction=93.7%  (1963 → 123 tokens)

All 5 scenarios OK in ~20 ms.
```

---

## Manual Setup (step by step)

If you prefer to run the commands yourself:

```bash
# 1. Termux packages
pkg update
pkg install -y nodejs-lts git jq bash
termux-setup-storage    # grant storage permission once

# 2. Clone + install
git clone https://github.com/ProfRandom92/comptext-monorepo-X
cd comptext-monorepo-X
SKIP_HUSKY=1 npm install --no-audit --no-fund --prefer-offline

# 3. Build and smoke-test
npm run build -w packages/core
npm run termux:smoke
```

---

## Running the Visualizer (reachable from another device)

```bash
npm run dev:host
```

This binds Vite to `0.0.0.0:3000`, so you can open the visualizer from **any other device on the same Wi-Fi**:

```
http://localhost:3000          (on the phone itself)
http://<phone-lan-ip>:3000     (from laptop / desktop)
```

`setup_termux.sh` prints the LAN IP at the end. You can re-detect it any time with:

```bash
ip -4 addr show | awk '/inet /{print $2}' | cut -d/ -f1 | grep -v '^127\.'
```

To use a different port:

```bash
PORT=8080 npm run dev:host
```

---

## Running Tests / Benchmark

```bash
# 33 unit tests, ~3 s
npm test

# Full token-reduction benchmark on all 5 scenarios
npm run benchmark
```

Both commands work **fully offline** — tiktoken loads `cl100k_base` from `node_modules`, no network call.

---

## Troubleshooting

### `pkg install nodejs-lts` fails

You installed Termux from the Play Store. Uninstall it and install the F-Droid build instead.

### `npm install` hangs on `husky`

`scripts/setup_termux.sh` sets `SKIP_HUSKY=1` for you. If you call `npm install` directly:

```bash
SKIP_HUSKY=1 npm install --no-audit --no-fund
```

The repo's `prepare` script is `husky || true`, so a missing `.git/hooks` path is non-fatal.

### `EACCES` on `~/.npm`

```bash
rm -rf ~/.npm
npm install --no-audit --no-fund --prefer-offline
```

### Visualizer is not reachable from laptop

1. Confirm phone and laptop are on the **same Wi-Fi SSID**.
2. Android's "Wi-Fi isolation" / "AP isolation" can block LAN traffic — disable it in your router settings.
3. Check the port is actually bound:
   ```bash
   ss -ltnp | grep 3000
   ```
4. Some carriers' hotspot APs block client-to-client traffic. Use your home router.

### `npm run build` runs out of memory

```bash
NODE_OPTIONS="--max-old-space-size=1024" npm run build -w packages/core
```

On low-RAM devices, build one entrypoint at a time:

```bash
cd packages/core && npx tsup src/index.ts --format esm,cjs --dts --out-dir dist
```

### Smoke test reports a PHI leak

This is a safety regression, not a setup issue. Open an issue with the failing scenario ID — the pipeline is supposed to scrub all patient names, birth dates and identifiers before the frame is serialised.

---

## What gets installed

| Package      | Source | Size    | Purpose                 |
| ------------ | ------ | ------- | ----------------------- |
| nodejs-lts   | Termux | ~80 MB  | Node ≥ 18 runtime + npm |
| git          | Termux | ~30 MB  | clone the repo          |
| jq           | Termux | ~2 MB   | optional — for scripts  |
| bash         | Termux | ~4 MB   | setup script shell      |
| node_modules | npm    | ~300 MB | repo dependencies       |
| dist/        | tsup   | ~400 KB | built @comptext/core    |

After `setup_termux.sh` completes, the repo works **entirely offline** — you can put the phone in airplane mode and the smoke test, unit tests, benchmark, and visualizer all still run.

---

## Uninstall

```bash
cd ~
rm -rf comptext-monorepo-X
pkg uninstall -y nodejs-lts   # optional — keep if you use Node elsewhere
```
