#!/bin/bash
# Wrapper script for gmail-cli
# Usage: gmail-cli.sh <command> [options]

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLI_DIR="$(dirname "$SCRIPT_DIR")"

cd "$CLI_DIR" && npx tsx src/cli.ts "$@"
