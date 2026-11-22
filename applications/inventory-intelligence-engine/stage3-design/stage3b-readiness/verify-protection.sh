#!/usr/bin/env bash
# Independent protection check for the Supply Chain Intelligence Engine (Stage 3B readiness, 22 Nov 2026).
#
# HOW TO RUN (no coding needed):
#   Windows: install "Git for Windows", open "Git Bash", then type the three lines below.
#   Linux or Mac: open a terminal and type the same three lines.
#     git clone https://github.com/MB20252025/chain-genius-consulting scie-check
#     cd scie-check
#     bash applications/inventory-intelligence-engine/stage3-design/stage3b-readiness/verify-protection.sh
#   The last line printed is either "RESULT: ALL PROTECTION CHECKS PASSED" or "RESULT: n CHECK(S) FAILED".
#   To check a specific commit instead of the latest development/v0.7, add its hash, for example:
#     bash applications/inventory-intelligence-engine/stage3-design/stage3b-readiness/verify-protection.sh 6b73254
#
# WHAT IT CHECKS (it only reads; it changes nothing on GitHub or in your files):
#   1. Every protected tag and branch in protected-refs-expected.txt still points to its recorded commit on GitHub.
#   2. development/v0.7 still contains the accepted Stage 2 commit (eddf09b), the accepted X1 commit (a4e05e8) and the
#      Tag-6 commit (e65600c) in its history, so no accepted history has been rewritten.
#   3. Every file protected at Tag-6 (each "file" line of tests/checksums.txt inside the Tag-6 tag itself) exists in the
#      checked commit with exactly the SHA-256 that Tag-6 recorded. This uses the tag's own list, so editing the current
#      checksums.txt cannot hide a change.
#   4. Prints any protected file added after Tag-6 (allowed growth, awaiting the next baseline tag).
set -u
cd "$(git rev-parse --show-toplevel)" || { echo "Run this inside the cloned repository."; exit 2; }
A=applications/inventory-intelligence-engine
HERE=$A/stage3-design/stage3b-readiness
TARGET=${1:-origin/development/v0.7}
git fetch -q origin '+refs/heads/*:refs/remotes/origin/*' '+refs/tags/*:refs/tags/*' || { echo "Cannot reach GitHub."; exit 2; }
COMMIT=$(git rev-parse --verify -q "$TARGET^{commit}") || { echo "Unknown commit: $TARGET"; exit 2; }
fails=0; pass=0
ok(){ pass=$((pass+1)); echo "PASS: $1"; }
bad(){ fails=$((fails+1)); echo "FAIL: $1"; }
echo "Checking commit $COMMIT"
echo "--- 1. Protected references on GitHub"
while read -r sha ref; do
  case "$sha" in ''|'#'*) continue;; esac
  got=$(git ls-remote origin "$ref" | cut -f1)
  [ "$got" = "$sha" ] && ok "$ref = $sha" || bad "$ref expected $sha, found ${got:-nothing}"
done < <(git show "$COMMIT:$HERE/protected-refs-expected.txt" 2>/dev/null || cat "$HERE/protected-refs-expected.txt")
echo "--- 2. Accepted history is preserved"
for c in eddf09b43531c3a2226c2e5788246254689ab469 a4e05e8833c6a55987cef8cab5ab38119cb19719 e65600cf7b74f7f25ec73ec24ef9fae1d648c619; do
  if git merge-base --is-ancestor "$c" "$COMMIT" 2>/dev/null; then ok "$(git rev-parse --short "$c") is in the history of the checked commit"; else bad "$c is NOT in the history of the checked commit"; fi
done
echo "--- 3. Files protected at Tag-6 are unchanged"
n=0; nbad=0
while read -r kind h p; do
  [ "$kind" = file ] || continue; n=$((n+1))
  got=$(git show "$COMMIT:$A/$p" 2>/dev/null | sha256sum | cut -d' ' -f1)
  if ! git cat-file -e "$COMMIT:$A/$p" 2>/dev/null; then nbad=$((nbad+1)); bad "$p is MISSING"
  elif [ "$got" != "$h" ]; then nbad=$((nbad+1)); bad "$p changed (Tag-6 $h, now $got)"; fi
done < <(git show "v0.7-tests-approved-6:$A/tests/checksums.txt")
[ "$nbad" -eq 0 ] && ok "all $n files protected at Tag-6 have their Tag-6 SHA-256"
echo "--- 4. Protected files added after Tag-6 (allowed growth, awaiting the next baseline tag)"
comm -13 <(git show "v0.7-tests-approved-6:$A/tests/checksums.txt" | grep '^file ' | sort) <(git show "$COMMIT:$A/tests/checksums.txt" | grep '^file ' | sort) | sed 's/^/  added: /'
echo "--- Summary: $pass passed, $fails failed"
[ "$fails" -eq 0 ] && echo "RESULT: ALL PROTECTION CHECKS PASSED" || echo "RESULT: $fails CHECK(S) FAILED"
exit $([ "$fails" -eq 0 ] && echo 0 || echo 1)
