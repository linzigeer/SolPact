#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
cargo install cargo-build-sbf --version 4.4.0 --locked --root .tools
