# Git workflow

**Remote:** `https://github.com/DST-Dashboard/Mams-Hospital.git` · **Default branch:** `main` (protected).

## First push (once, by whoever has the zip)
```bash
cd Mams-Hospital
git init -b main
git add .
git commit -m "chore: initial scaffold (standalone OHTMS)"
git remote add origin https://github.com/DST-Dashboard/Mams-Hospital.git
git push -u origin main
```
Then on GitHub → Settings → Branches → protect `main`: require PR, require the CI check, require review, no force-push. Edit `.github/CODEOWNERS` and replace the two placeholder handles.

## Daily flow
```bash
git switch main && git pull
git switch -c fe/alerts-table        # prefixes: fe/ be/ shared/ docs/ fix/
# …work, commit small…
git push -u origin fe/alerts-table   # open PR → the OTHER person reviews
```
- Branch prefix = your lane. One task ID per branch: `fe/fe-06-alert-table`.
- **Conventional commits:** `feat(alerts): …` `fix(api): …` `chore:` `docs:` `test:` `refactor:`.
- PR small (< ~400 lines). Squash-merge. Delete branch.
- Contract changes: separate PR labelled `contract`, merged **before** the implementation PRs.
- Rebase on `main` before opening the PR. Never rewrite shared history.

## Avoiding conflicts
| File | Rule |
|---|---|
| `package.json` / lock | Add deps only in a PR that says why; the other person pulls immediately. |
| `src/contracts/*` | Edit only via contract PRs. |
| `src/lib/types.ts` | Frontend appends; backend changes only with a contract PR. |
| `tailwind.config.ts`, `tokens.css` | Frontend; tell backend only if class names change. |
| `.env.example` | Append-only; document each variable. |
| `var/*.db`, `data/raw/*.json`, `.env` | Never committed (gitignored). Share the raw dataset out of band. |

## Releases
Tag `v0.1.0` at end of each sprint demo (`git tag -a v0.1.0 -m "Sprint 1 demo"`).
