#!/usr/bin/env bash
# Tuesday deliverable: "Set up the build toolchain."
#
# Downloads the pinned, prebuilt CPython-3.12.0-WASI interpreter that is the
# base runtime for every plugin. We vendor the binary rather than build it
# from source: producing this yourself requires wasi-sdk 20 + CPython's
# Tools/wasm build scripts, which is a multi-hour build best done once by
# the runtime-language-runtimes project's CI rather than per-developer.
#
# Source: vmware-labs/webassembly-language-runtimes, tag
#   python/3.12.0+20231211-040d5a6
set -euo pipefail

RUNTIME_URL="https://github.com/vmware-labs/webassembly-language-runtimes/releases/download/python/3.12.0%2B20231211-040d5a6/python-3.12.0.wasm"
SHA256_URL="https://github.com/vmware-labs/webassembly-language-runtimes/releases/download/python/3.12.0%2B20231211-040d5a6/python-3.12.0.wasm.sha256sum"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUT_DIR="$SCRIPT_DIR/../runtime"
OUT_FILE="$OUT_DIR/python-3.12.0.wasm"

mkdir -p "$OUT_DIR"
echo "Fetching CPython 3.12.0 WASI runtime..."
curl -sL -o "$OUT_FILE" "$RUNTIME_URL"
curl -sL -o "$OUT_FILE.sha256sum" "$SHA256_URL"

echo "Verifying checksum..."
EXPECTED_SHA="$(awk '{print $1}' "$OUT_FILE.sha256sum")"
ACTUAL_SHA="$(sha256sum "$OUT_FILE" | awk '{print $1}')"
if [ "$EXPECTED_SHA" != "$ACTUAL_SHA" ]; then
    echo "Checksum mismatch! expected=$EXPECTED_SHA actual=$ACTUAL_SHA" >&2
    exit 1
fi

echo "OK -> $OUT_FILE"
