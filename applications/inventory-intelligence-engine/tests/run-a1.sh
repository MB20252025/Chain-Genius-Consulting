#!/usr/bin/env bash
# v0.7 A1 tests. Usage (from tests/): NODE_PATH=<node_modules with xlsx, jsdom, acorn> bash run-a1.sh
cd "$(dirname "$0")" || exit 9; rc=0
for tz in UTC Europe/London; do for t in test-a1-static test-a1-sync-path test-a1-wrapper test-a1-state test-a1-escaping; do out=$(TZ=$tz node $t.js 2>&1); c=$?; echo "TZ=$tz $t | exit $c | $(echo "$out" | tail -1)"; [ $c -eq 0 ] || { rc=1; echo "$out" | grep '^FAIL' | head -10; }; done; done
echo "# run-a1 overall exit $rc"; exit $rc
