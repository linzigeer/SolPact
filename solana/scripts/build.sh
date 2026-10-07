#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Use a project-local builder when the installed Solana CLI predates the
# sbpf target rename. Do not change the user's global Solana installation.
if [[ -x .tools/bin/cargo-build-sbf ]]; then
  export PATH="$PWD/.tools/bin:$PATH"
fi
solpact_builder_version="$(cargo-build-sbf --version 2>/dev/null || true)"
if [[ "${solpact_builder_version%%$'\n'*}" != 'cargo-build-sbf 4.4.0' ]]; then
  printf '%s\n' 'Run corepack pnpm setup:tools to install the pinned project-local SBF builder.' >&2
  exit 1
fi
# Anchor 0.31.1 also forwards build arguments to its IDL cargo-test step.
# Build the SBF and IDL separately so SBF-only flags cannot reach cargo test.
anchor build --no-idl -- --tools-version v1.54 --arch v0 -- --locked
anchor idl build -o target/idl/solpact.json -t target/types/solpact.ts -- --locked
