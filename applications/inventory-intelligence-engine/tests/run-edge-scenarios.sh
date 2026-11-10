#!/usr/bin/env bash
# Usage: bash run-edge-scenarios.sh <timestamp>   (run from tests/). Same method as run-supplier-scenarios.sh, for the edge-case and structurally different workbooks.
# Each scenario: dump app output, verify independently with verify_sup.py (pandas), compare with the stored verified output.
cd "$(dirname "$0")" || exit 9; TS=${1:-$(date -u +%Y%m%dT%H%M%SZ)}; rc=0
for s in edge/dupexact edge/dupkey edge/overrec edge/multiline edge/splitline edge/posupconflict edge/partial edge/overshort edge/combined structure/willow; do n=$(basename $s); d=$(dirname $s); L=logs/verify-$n-$TS.log; D=logs/supplier-dump-$n-$TS.json; X=fixtures/$d/supplier-output-$n.json
  { echo "# scenario: $n"; echo "# workbook: fixtures/$d/scenario-$n.xlsx"; echo "# started: $(date -u +%FT%TZ)"
    node dump_sup.js fixtures/$d/scenario-$n.xlsx $D; echo "# dump exit code: $?"
    python3 verify_sup.py fixtures/$d/scenario-$n.xlsx $D $n; v=$?; echo "# verifier exit code: $v"
    if cmp -s $D $X; then echo "IDENTICAL to $X"; c=0; else echo "DIFFERENT from stored output $X"; c=1; fi
    echo "# overall: $([ $v -eq 0 ] && [ $c -eq 0 ] && echo PASS || echo FAIL)"; } > $L 2>&1
  echo "$n  $(tail -1 $L)"; [ "$(tail -1 $L)" = "# overall: PASS" ] || rc=1
done; exit $rc
