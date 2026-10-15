# MAD Petstore

A hands-on course for the MAD Framework. You make the decisions; a MAD agent team builds a small
pet-shop app, reviews it, tests it and ships it to your own cloud account. You then tear it down.
It takes about 3 hours, and Claude guides you through every step.

**What you build:** a web app for the staff of Paws & Co, a pet shop. Staff can list pets by
status (available, pending, sold) and add a pet when one arrives. The app is built from the
[Swagger Petstore](https://petstore.swagger.io/): its pet API, cut down to what the shop needs,
is the contract the team builds to.

New to MAD? Click through the [MAD Sandbox](https://maitri-services.github.io/mad-petstore-reference/)
first (15–20 min, nothing to install). It simulates this exact run.

## 1. Create your copy

**[→ Create your copy of mad-petstore](https://github.com/new?template_owner=Maitri-Services&template_name=mad-petstore-template)**

Pick your own account as the owner, name the repo, keep it **Private**, and click
**Create repository**. Use the template; do not fork. If the link shows a 404, ask your
facilitator for access.

## 2. Install the tools

- git, [`gh`](https://cli.github.com/) (run `gh auth login`), Docker, `jq`, tmux (optional)
- `br` (Beads) 0.2.16
- Node 24 and Python 3
- Terraform 1.x and your cloud's CLI (`aws`, `az` or `gcloud`), logged in to your own account
- Read access to `Maitri-Services/mad-standards` (ask your facilitator)
- Claude Code with the MAD plugin. Inside `claude`:

  ```text
  /plugin marketplace add Maitri-Services/mad-framework
  /plugin install mad-teams@mad-teams
  ```

If you also use another MAD overlay (for example `op-agent-team`), turn it off for this repo in
`.claude/settings.local.json`: `{ "enabledPlugins": { "op-agent-team@op-agent-team": false } }`.

## 3. Clone and prepare

```bash
git clone <your repo URL> && cd <your repo>
git switch -c develop && git push -u origin develop
(cd course && npm ci) && (cd e2e && npm ci) && (cd tests/e2e-reference && npm ci)
```

## 4. Start the course

```bash
claude "start"
```

Claude welcomes you, explains the course, and takes you through it one step at a time. It tells
you what to type, explains what was built after each step, and checks your work. Ask it
"where am I?" or type `/course` at any time.

The steps you will go through:

1. **Set up MAD**: `/agent-team-setup`
2. **Architecture**: `/mad-plan` asks for your stack, cloud and region
3. **Spec and plan**: `/mad-plan` asks you the questions only you can answer
4. **Beads**: the plan becomes a backlog
5. **Team run**: `/spawn-team` and `/start`; agents build, a reviewer agent reviews every PR
6. **QA**: the QA agent tests the app; you decide which bugs are real
7. **Release**: you merge `develop` into `main`, and only you can
8. **Deploy**: you deploy to your cloud account
9. **Teardown**: you remove everything from your cloud

## 5. When you are done

Run the app on your machine (see below), then check your cloud console is empty after teardown.

## Run it on your machine

The app is on `develop`, and on `main` after the release.

```bash
git checkout develop && git pull
docker compose --profile app up -d --build   # first build takes a few minutes
```

Open http://localhost:3000 (the API is at http://localhost:8000). The database migration runs
when the API starts.

Stop it, keeping the database running:

```bash
docker compose --profile app stop api web
```

Stop and remove everything: `docker compose --profile app down`.

No Docker? Follow the README in `api/` and in `web/`: the team writes the native run steps for the
stack you chose.

---

### For facilitators

- **Checks:** `course/checks/S02.sh` … `S09.sh` grade a stage (exit 0 = pass); `course/checks/check-all.sh [S##]`
  runs them all, or up to a stage. The guide runs them for the learner.
- **Catch-up:** `course/skip.sh S04|S05|S06` fast-forwards a stuck stage from the private reference repo.
- **Dashboard:** `(cd course && npm run dashboard)` shows the beads board and PRs on http://localhost:4310.
- **The guide:** `CLAUDE.md` turns the lead session into the course guide; `/course` shows progress.
- **Repo map:** `docs/raw-intent.md` (MAD Stage 1, all the team gets), `contracts/` (API contract,
  original Swagger files, test ids), `prototype/` (static screens), `.claude/skills/mad-*` (project
  rules), `course/` (checks, catch-up, dashboard, seeded bug), `tests/` (contract and reference E2E
  tests), `e2e/` and `.mcp.json` (the QA agent's Playwright workspace), `compose.yaml` (local runtime).
