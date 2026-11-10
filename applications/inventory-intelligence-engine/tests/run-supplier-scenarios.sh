#!/usr/bin/env bash
# Usage: bash run-supplier-scenarios.sh <timestamp>   (run from the tests/ directory; needs node, python3+pandas+openpyxl, NODE_PATH for xlsx)
cd "$(dirname "$0")" || exit 9; TS=${1:-$(date -u +%Y%m%dT%H%M%SZ)}; rc=0
for s in s0 nopo allfuture three unknown nohist; do
  L=logs/verify-$s-$TS.log; D=logs/supplier-dump-$s-$TS.json
  { echo "# scenario: $s"; echo "# workbook: fixtures/suppliers/scenario-$s.xlsx"; echo "# started: $(date -u +%FT%TZ)"
    echo "## 1. app output dumped from the workbook"; node dump_sup.js fixtures/suppliers/scenario-$s.xlsx $D; echo "# dump exit code: $?"
    echo "## 2. independent Python verification (separate logic, reads the raw workbook)"; python3 verify_sup.py fixtures/suppliers/scenario-$s.xlsx $D $s; v=$?; echo "# verifier exit code: $v"
    echo "## 3. fresh app output vs stored expected output"; if cmp -s $D fixtures/suppliers/supplier-output-$s.json; then echo "IDENTICAL to fixtures/suppliers/supplier-output-$s.json"; c=0; else echo "DIFFERENT from stored expected output"; diff <(python3 -m json.tool $D) <(python3 -m json.tool fixtures/suppliers/supplier-output-$s.json) | head -20; c=1; fi
    echo "# finished: $(date -u +%FT%TZ)"; echo "# overall: $([ $v -eq 0 ] && [ $c -eq 0 ] && echo PASS || echo FAIL)"; } > $L 2>&1
  tail -1 $L | sed "s/^/$s  /"; grep -E "^(PASS|FAIL) " $L | cut -c1-160; [ "$(tail -1 $L)" = "# overall: PASS" ] || rc=1
done; exit $rc
