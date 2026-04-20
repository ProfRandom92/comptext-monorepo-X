#!/usr/bin/env bash
# ──────────────────────────────────────────────────────────────────────────────
# CompText monorepo — 1-Click Setup for Termux (Android ARM64)
#
# What this script does:
#   1. Installs the Termux packages the repo needs (Node.js LTS, git, jq, bash)
#   2. Requests storage access so ~/storage is available
#   3. Bootstraps the workspace (npm install, builds @comptext/core)
#   4. Runs a deterministic smoke test (pipeline on all 5 scenarios)
#   5. Prints the LAN URL for the Vite visualizer on port 3000
#
# Safe to re-run. Idempotent. Works offline once dependencies are cached.
# Requires: Termux app from F-Droid (the Play Store build is stale).
# ──────────────────────────────────────────────────────────────────────────────

set -euo pipefail

# ── Colors (respected only when stdout is a TTY) ──────────────────────────────
if [ -t 1 ]; then
  BOLD="$(printf '\033[1m')"; GREEN="$(printf '\033[32m')"
  YELLOW="$(printf '\033[33m')"; RED="$(printf '\033[31m')"; NC="$(printf '\033[0m')"
else
  BOLD=""; GREEN=""; YELLOW=""; RED=""; NC=""
fi

log()  { printf "%s▸ %s%s\n" "$BOLD" "$1" "$NC"; }
ok()   { printf "%s✓ %s%s\n" "$GREEN" "$1" "$NC"; }
warn() { printf "%s! %s%s\n" "$YELLOW" "$1" "$NC"; }
err()  { printf "%s✗ %s%s\n" "$RED" "$1" "$NC" >&2; }

# ── 0. Detect Termux ──────────────────────────────────────────────────────────
IS_TERMUX=0
if [ -n "${PREFIX:-}" ] && [ -d "$PREFIX" ] && echo "$PREFIX" | grep -q "com.termux"; then
  IS_TERMUX=1
fi

if [ "$IS_TERMUX" -eq 0 ]; then
  warn "Not running inside Termux — skipping pkg install, proceeding with npm-only setup."
fi

# ── 1. Termux packages ────────────────────────────────────────────────────────
if [ "$IS_TERMUX" -eq 1 ]; then
  log "Checking Termux packages (nodejs-lts, git, jq, bash)…"
  NEED_INSTALL=""
  for p in nodejs-lts git jq bash; do
    # `pkg list-installed` is slow; prefer checking the binary directly.
    case "$p" in
      nodejs-lts) command -v node >/dev/null 2>&1 || NEED_INSTALL="$NEED_INSTALL $p" ;;
      git)        command -v git  >/dev/null 2>&1 || NEED_INSTALL="$NEED_INSTALL $p" ;;
      jq)         command -v jq   >/dev/null 2>&1 || NEED_INSTALL="$NEED_INSTALL $p" ;;
      bash)       command -v bash >/dev/null 2>&1 || NEED_INSTALL="$NEED_INSTALL $p" ;;
    esac
  done

  if [ -n "$NEED_INSTALL" ]; then
    log "Installing:$NEED_INSTALL"
    pkg install -y $NEED_INSTALL
  else
    ok "All Termux packages already installed."
  fi

  # Optional but convenient — don't fail if storage already granted.
  if [ ! -d "$HOME/storage" ]; then
    log "Requesting storage access (you will see an Android permission prompt)…"
    termux-setup-storage || warn "termux-setup-storage not available, skipping."
  fi
fi

# ── 2. Node version check ─────────────────────────────────────────────────────
if ! command -v node >/dev/null 2>&1; then
  err "node is not on PATH. Install nodejs-lts via 'pkg install nodejs-lts' and re-run."
  exit 1
fi

NODE_MAJOR="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$NODE_MAJOR" -lt 18 ]; then
  err "Node.js >= 18 required (found $(node -v)). Upgrade with 'pkg upgrade nodejs-lts'."
  exit 1
fi
ok "Node.js $(node -v) (npm $(npm -v))"

# ── 3. Repo root detection ────────────────────────────────────────────────────
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
ok "Repo root: $ROOT"

# ── 4. npm install ────────────────────────────────────────────────────────────
# Skip husky during install (it tries to run in .git hooks which breaks on
# fresh clones where .git hooks path hasn't been set yet).
export CI="${CI:-}"
export SKIP_HUSKY=1

if [ ! -d node_modules ] || [ ! -d packages/core/node_modules ]; then
  log "Installing dependencies (this is the only step that needs network)…"
  npm install --no-audit --no-fund --prefer-offline
  ok "Dependencies installed."
else
  ok "node_modules already present — skipping npm install."
fi

# ── 5. Build @comptext/core ───────────────────────────────────────────────────
log "Building @comptext/core…"
npm run build -w packages/core --silent
ok "Core package built (dist/ ready)."

# ── 6. Smoke test ─────────────────────────────────────────────────────────────
log "Running deterministic smoke test (all 5 clinical scenarios)…"
node scripts/termux-smoke.mjs
ok "Smoke test passed."

# ── 7. LAN hint for the visualizer ────────────────────────────────────────────
LAN_IP=""
if command -v ip >/dev/null 2>&1; then
  LAN_IP="$(ip -4 addr show 2>/dev/null | awk '/inet /{print $2}' | cut -d/ -f1 | grep -Ev '^(127\.|169\.254\.)' | head -n 1 || true)"
fi
if [ -z "$LAN_IP" ] && command -v ifconfig >/dev/null 2>&1; then
  LAN_IP="$(ifconfig 2>/dev/null | awk '/inet /{print $2}' | grep -Ev '^(127\.|169\.254\.)' | head -n 1 || true)"
fi

printf "\n%s═══════════════════════════════════════════════════════════════%s\n" "$BOLD" "$NC"
printf "%s  CompText is ready on this device.%s\n" "$GREEN" "$NC"
printf "%s═══════════════════════════════════════════════════════════════%s\n\n" "$BOLD" "$NC"

cat <<EOF
Next steps:

  • Run the visualizer (reachable from any device on the same Wi-Fi):
      npm run dev:host
    Then open:
      http://localhost:3000
$([ -n "$LAN_IP" ] && echo "      http://$LAN_IP:3000        (from your phone browser)")

  • Run the full test suite (33 tests, ~3s):
      npm test

  • Run the token-reduction benchmark:
      npm run benchmark

  • Re-run this setup any time:
      npm run setup:termux

Troubleshooting: docs/TERMUX.md
EOF
