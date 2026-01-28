#!/bin/bash
# Wrapper script for google-cli
# Usage: google-cli.sh <command> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"

cd "$CLI_DIR" && npx tsx src/cli.ts "$@"
