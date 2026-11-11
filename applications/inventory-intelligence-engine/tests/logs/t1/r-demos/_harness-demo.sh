#!/usr/bin/env bash
# Disposable-copy demonstration harness (not part of the repository).
# usage: demo.sh <id> <title> <expected> <plant-commands (run in tests/ of the copy)> [runner args...]
id=$1; title=$2; expected=$3; plant=$4; shift 4
B=/home/claude/t1demo2-base; C=/home/claude/t1demo2-$id; E=/home/claude/t1ev2/demos/$id.txt
rm -rf $C; cp -a $B $C; cd $C/applications/inventory-intelligence-engine/tests
{
echo "# $id: $title"; echo "Expected: $expected"; echo "Run: $(date -u +%FT%TZ)"
echo "Disposable copy: $C  (real repository: /home/claude/chain-genius-consulting, not touched)"
echo "Copy is at demo commit $(git rev-parse --short HEAD) (simulated approved state; approved tag v0.7-tests-approved-1 on stand-in remote /tmp/standin.git)"
echo; echo "## Planted change"; echo "\$ $plant"
} > $E
bash -c "$plant" >> $E 2>&1
{ echo; echo "## git status --porcelain (copy)"; git status --porcelain; echo; echo "## git diff (copy, planted change only)"; git diff | head -60
  echo; echo "## Command"; echo "\$ ${DEMO_ENV:-NODE_PATH=$NODE_PATH} bash tests/run-all.sh $*"; echo; echo "## Output"; } >> $E
(cd .. && env ${DEMO_ENV:-} bash tests/run-all.sh "$@") >> $E 2>&1; rc=$?
{ echo; echo "## Exit code: $rc"; cd /; rm -rf $C; echo "Disposable copy deleted: $([ -d $C ] && echo NO || echo yes)"; } >> $E
echo "$id exit=$rc"
