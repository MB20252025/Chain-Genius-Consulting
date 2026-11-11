# v0.7 preview deployment log

Documentation only. Not loaded by the application or by any test.

- 11 Nov 2026: Cloudflare Pages project `chain-genius-consulting` connected to the repository by the owner (production branch `main`; preview branch `development/v0.7`; previews behind Cloudflare Access). The previous `development/v0.7` head, `658ba5c`, was pushed before the connection and has no Cloudflare check on GitHub, so this file was added to give Cloudflare a first commit on the branch. Preview status: not yet verified.

## 11 Nov 2026 — first preview deployment: successful (verified by the owner)

| Item | Record |
|---|---|
| Platform | Cloudflare Pages |
| Project | `chain-genius-consulting` |
| Branch | `development/v0.7` |
| Deployed commit | `01b3e4f` |
| Preview URL | https://51be0a01.chain-genius-consulting.pages.dev (this deployment's own address) |
| Deployment status | Successful |
| Preview access | Protected by Cloudflare Access |
| Authentication | Tested successfully by the owner with his authorised email address |
| Application | Loaded after authentication |
| Engine | Inventory Intelligence Engine loaded (on-screen label v0.6, because v0.7 has not changed the interface yet) and displayed the demonstration analysis |
| Manual checks (owner, Android phone) | Dashboard figures, navigation tabs and the demonstration-data warning were visible |

**Scope of this result:** it confirms successful deployment, access protection and initial loading only. It is **not** full functional testing of v0.7, and it does not close D2 (the physical Android test of all 17 tabs).

## Environment separation (as of 11 Nov 2026)

- **GitHub Pages** (public website, including the live v0.6 app) remains in place and is served from `main`. Unchanged by this work.
- **Cloudflare production** remains on `main`.
- **Cloudflare preview** for `development/v0.7` is a temporary, Access-protected development preview, separate from both. It holds only fictional demonstration data and no keys or credentials.
- `main`, `release/v0.6` and tag `v0.6` remain at `8117c72` (checked on GitHub, 11 Nov 2026).
