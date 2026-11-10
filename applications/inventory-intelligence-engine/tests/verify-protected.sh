#!/usr/bin/env bash
# Verifies the protected versions listed in PROTECTED-VERSIONS.txt are unchanged. Run from tests/ with the outputs folder as the parent of the project folder.
cd "$(dirname "$0")/../.." || exit 9; rc=0
chk(){ got=$(git -C "$1" rev-parse "$2^{commit}" 2>/dev/null); [ "$got" = "$3" ] && echo "OK   tag $2 = $3" || { echo "FAIL tag $2 in $1: $got (expected $3)"; rc=1; }; }
chk inventory-intelligence-engine v0.6-candidate-3 5a376d829834af047576e59c09ed1529649583aa
chk inventory-intelligence-engine-c4 v0.6-candidate-4-phase1 61d6c0e37a70748d6a3e3a7fad4d9c9254feb459
chk inventory-intelligence-engine-c4 v0.6-candidate-4-phase1-final 7664564a192cc298763ab9b0a593995219e13639
chk inventory-intelligence-engine-c4-phase2 v0.6-candidate-4-phase2 f663295d6dc8a736ba8cddfc715b698ca84f2038
zc(){ got=$(sha256sum "$1" 2>/dev/null | cut -c1-24); [ "$got" = "$2" ] && echo "OK   $1" || { echo "FAIL $1: $got (expected $2)"; rc=1; }; }
zc inventory-intelligence-engine-v0.6-candidate-3.zip 0630f061d20f4f9b947e8586
zc inventory-intelligence-engine-v0.6-candidate-4-phase1.zip 7882efb9a72ba0ad2885d214
zc inventory-intelligence-engine-v0.6-candidate-4-phase1-final.zip e599240a8cdba81a8fae1e5a
zc inventory-intelligence-engine-v0.6-candidate-4-phase2.zip 8e9395112e171d31a9f16910
for r in inventory-intelligence-engine-c4-phase2 inventory-intelligence-engine-c4-phase3; do for s in v0.5-golden-20261105T101953Z v0.6.0-baseline-20261109T152050Z; do got=$(sha256sum $r/tests/snapshots/$s.json | cut -c1-16); [ "$got" = "7f38bc567da528f1" ] && echo "OK   $r snapshot $s" || { echo "FAIL snapshot $r $s $got"; rc=1; }; done; done
exit $rc
