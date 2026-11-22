#!/usr/bin/env bash
# Spot-check runner (22 Nov 2026). Runs each test file directly, as run-all.sh does (node <file>, TZ=UTC, cwd = tests/),
# in a throwaway copy of the fresh clone at 43b6b55. Saves raw output; reports the LAST "N passed, M failed" line,
# which is the runner's own parse rule (run-all.sh line 37).
cd "$1"; OUT=$2; shift 2
printf '%-24s %-32s %8s %8s %6s %5s %s\n' test file expected actual failed exit result
for spec in "$@"; do n=${spec%%:*}; rest=${spec#*:}; f=${rest%%:*}; e=${rest#*:}
  TZ=UTC NODE_PATH=/home/claude/testdeps/node_modules timeout 900 node "$f" > "$OUT/$n.out" 2>&1; rc=$?
  last=$(grep -oE '(^|[[:space:]])[0-9]+ passed, [0-9]+ failed' "$OUT/$n.out" | tail -1 | tr -s ' ')
  p=$(echo "$last" | awk '{print $1}'); fl=$(echo "$last" | awk '{print $3}')
  r=MISMATCH; [ "$p" = "$e" ] && [ "$fl" = 0 ] && [ $rc = 0 ] && r=MATCH
  printf '%-24s %-32s %8s %8s %6s %5s %s\n' "$n" "$f" "$e" "${p:--}" "${fl:--}" "$rc" "$r"
done
