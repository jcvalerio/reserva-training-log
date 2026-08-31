---
description: Branch, verify, commit and open a PR the way this repo expects
---

Take the work currently in the tree (or the task described in `$ARGUMENTS`) and land it as a pull request.

This exists because the app is driven from a phone as often as from the terminal, and a PR is the only artifact that is reviewable from one. The preview deployment it produces is the point: this project has shipped a bug that every local check passed and a real device caught within minutes.

## 1. Branch

Never commit straight to `main` for code. Branch from an up-to-date `main`:

```
git fetch origin main && git switch -c <type>/<short-kebab-summary> origin/main
```

`<type>` is the conventional-commit type the work actually is — `fix`, `feat`, `refactor`, `perf`, `test`, `chore`. Keep the summary short and specific: `fix/completed-session-add-set`, not `fix/bug`.

**Docs-only changes are the exception** and go straight to `main`. Routing an implementation-log entry through a PR is ceremony with no reader.

If the work is already committed on `main` and not yet pushed, move it: branch from `origin/main`, cherry-pick, then reset `main` back.

## 2. Verify before committing, not after

```
nvm use v24.18.0
npm run lint && npm run typecheck && npm run test && npm run build
```

All four must pass. CI runs the same four on the PR, but it is a backstop — do not open a PR expecting CI to tell you something you could have learned in ninety seconds.

If you changed `src/db/schema.ts`, update `docs/architecture/data-model.md` in the same PR, and run `npm run db:generate` to confirm the migration is what you expect.

## 3. Commit

Conventional commits, signed (1Password handles the signature — if it fails with `failed to fill whole buffer` the vault is locked, and the fix is unlocking it, never `--no-gpg-sign`).

Write the message the way this repo's history does: what was wrong, the root cause, what was **deliberately not** done and why. A reader six months out needs the reasoning, not a restatement of the diff.

## 4. Open the PR

```
gh pr create --title "<same as the commit subject>" --body "..."
```

The body carries the same reasoning as the commit, plus what a reviewer on a phone needs:

- **What and why** — the root cause, not the symptom.
- **What to check on the preview** — the specific screens, at 390×844. Be concrete: "open a completed session, tap *Agregar una serie que falta*, save, confirm it lands in that session's week on /progreso." This is the most valuable section; write it for someone holding a phone in a gym.
- **Deliberately not done** — the scope you refused, so nobody re-opens it.
- **Known gaps** — anything untested or unverified. State it; do not let a reviewer discover it.

## 5. Hand back links

Report the **PR URL and the Vercel preview URL** together. From a phone those two links are the entire review surface, so a PR without a preview link is half-finished. If the preview build failed, say so and why rather than reporting the PR as ready.

## Standing rules

- **Never merge your own PR without being asked.** Opening it is the deliverable; merging is the user's call, and merging deploys to production.
- Merging to `main` auto-deploys. Treat a merge as a deploy: do not merge while a session may be in progress (`status = 'active'`), and say so if you cannot check.
- One PR per vertical slice. If you find a second unrelated problem, note it in the PR body or file an issue — do not widen the branch.
- Update `docs/product/implementation-log.md` in the same PR when the work is worth recording, which is most of the time.
