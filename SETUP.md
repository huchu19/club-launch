# Setup — do this yourself before starting Claude Code (≈30 min)

Claude Code can do almost everything, but it can't create accounts or paste secrets for you.

## 1. Accounts and keys
1. GitHub: create an empty public repo, e.g. `club-launch` (no README).
2. Sanity: sign in at sanity.io/manage, create a project, dataset `production`, set dataset visibility to **Private**.
   Create two API tokens: one **Viewer** (read) and one **Editor** (write). Add CORS origins `http://localhost:3000` and your Vercel URL later (allow credentials).
3. Google AI Studio: create a free Gemini API key. Check the free-tier rate limits for the Flash model you'll use and note them.
4. Vercel: sign in with GitHub. You'll import the repo after M0 pushes.

## 2. Local folder
```bash
mkdir club-launch && cd club-launch
git init && git branch -M main
git remote add origin https://github.com/huchu19/club-launch.git
# copy every file from this kit into the folder (keep the docs/ and .claude/ paths)
cp .env.example .env.local   # then fill in the real values
```
Optional but useful: clone your portfolio next to it (`../portfolio`) so Claude Code can read your real design tokens.

## 3. Run Claude Code in bypass mode — safely
`--dangerously-skip-permissions` lets Claude run every command without asking. Anthropic recommends using it only in an isolated environment.
- Best: open the folder in a VS Code **Dev Container** (Node LTS image) and run Claude Code inside it.
- Minimum: a dedicated folder, a git commit before each session, no other projects or secrets reachable from it.
- `.claude/settings.json` in this kit adds deny rules (no reading `.env.local`, no force-push, no `rm -rf`), which still apply in bypass mode.

```bash
claude --dangerously-skip-permissions
```
Then paste the contents of `MASTER_PROMPT.md`.

## 4. When Claude Code stops for you
It will pause at human checkpoints (listed in `docs/PLAN.md`), e.g. importing the repo into Vercel, adding env vars to Vercel and GitHub Actions secrets, and the Sanity webhook. Do the step, then reply "done".
