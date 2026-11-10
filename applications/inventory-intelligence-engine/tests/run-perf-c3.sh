#!/usr/bin/env bash
# Candidate 3 performance run. Usage: bash run-perf-c3.sh <log> <dataset5000.xlsx> <dataset15000.xlsx>  (run from tests/). Desktop = 1280 px Chrome, no throttle.
# "Simulated phone" = 412 px Chrome with 4x CPU slowdown. This is a PROXY on a desktop-class machine, NOT a physical Android test.
cd "$(dirname "$0")" || exit 9; OUT=$1; : > "$OUT"; exec >> "$OUT" 2>&1
echo "# Performance run $(date -u +%FT%TZ). Machine: $(nproc) CPU, $(free -m | awk '/Mem:/{print $2}') MB RAM, Node $(node -v), Chromium via Playwright. Targets: analyse() < 2 s at 5,000 SKUs; tab switch < 300 ms."
for spec in "northstar:150 items (Northstar):fixtures/northstar/Chain_Genius_Project_001_Northstar_Dataset_1.xlsx" "5000:5,000 items (1,667 FG + 3,333 RM):$2" "15000:15,000 items (5,000 FG + 10,000 RM):$3"; do IFS=: read k label f <<< "$spec"
 echo; echo "################ $label"; echo "--- Node engine timing"; node --max-old-space-size=4096 perf-node.js $f 2>&1 | grep -E "XLSX.read|analyse\(\)|run\(\)|^view"
 echo "--- Chrome DESKTOP (1280 px, no throttle)"; VW=1280 node perf-chrome.js $f 1 2>&1 | tr '\r' '\n' | grep -E "import-to-ready|tabs over|CRASHED|Show more|ms script"
 echo "--- Chrome DESKTOP, Summary opened first (cold: nothing cached yet)"; VW=1280 FIRST=Summary node perf-chrome.js $f 1 2>&1 | tr '\r' '\n' | grep -E "^Summary|^MRP|tabs over|CRASHED"
 echo "--- Chrome SIMULATED PHONE (412 px, no throttle)"; VW=412 node perf-chrome.js $f 1 2>&1 | tr '\r' '\n' | grep -E "import-to-ready|tabs over|CRASHED|Show more|ms script"
 echo "--- Chrome SIMULATED PHONE (412 px, 4x CPU slowdown = proxy only)"; VW=412 node perf-chrome.js $f 4 2>&1 | tr '\r' '\n' | grep -E "import-to-ready|tabs over|CRASHED|Show more|ms script"
 echo "--- Chrome SIMULATED PHONE, 4x, Summary opened first (cold)"; VW=412 FIRST=Summary node perf-chrome.js $f 4 2>&1 | tr '\r' '\n' | grep -E "^Summary|^MRP|tabs over|CRASHED"
done; echo; echo DONE
