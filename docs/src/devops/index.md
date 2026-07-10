---
lastUpdated: 2026-07-10T17:37:36Z
---

# DevOps

## Staging deploy

Add the `deploy:staging` label to any open PR. The workflow will:

1. Run pending DB migrations against the staging Supabase project
2. Deploy edge functions to staging
3. Build the frontend with CI, then deploy the pre-built `dist/` to the staging Netlify site (Netlify's own build is skipped)
4. Post a status comment on the PR with the result

Steps run sequentially: migrations first, then edge functions, then frontend. If any step fails, later steps are skipped and the PR comment reports which step failed.

The label stays on the PR — every subsequent push automatically re-triggers the deploy. Remove the label to stop auto-deploying.

The status comment is reused across deploys (updated in place rather than creating a new comment each time).

### Staging URLs

- **Staging site:** `stage.taro-flash.com` — served by a dedicated Netlify site (separate from production)
- The `staging` GitHub environment has its own `NETLIFY_SITE_ID` pointing to the staging Netlify site

---

## Production deploy

Manually trigger the `Deploy` workflow (`.github/workflows/deploy.yml`) via **Actions > Deploy > Run workflow**, choosing `environment: production`. The workflow will:

1. Run the E2E smoke gate (skippable via the `skip_smoke` input for emergency hotfixes)
2. Run pending DB migrations against the production Supabase project
3. Deploy edge functions to production (setting `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` as function secrets first)
4. Push `supabase/config.toml` changes via `supabase config push`, if config changed
5. Build the frontend with CI, then deploy the pre-built `dist/` to the production Netlify site (Netlify's own build is skipped)
6. If the deploy succeeded, a `tag-release` job runs `semantic-release` to create the version tag and GitHub Release

Each numbered step only runs if its relevant files changed since the last release (path-filtered via a `detect-changes` job), and later steps are gated on earlier ones succeeding or being skipped. The release is now an **output** of a successful deploy, not a trigger for one.

### Triggering a deploy

1. Go to **Actions > Deploy** on GitHub
2. Click **Run workflow**
3. Choose the branch (usually `master`) and set `environment` to `production`
4. Click **Run workflow** — this runs the steps above, then tags + releases automatically if the deploy succeeded

### Recommended safeguards

Configure these in **GitHub Settings > Environments > production**:

- **Required reviewers** — at least 1 person must approve before the deploy runs
- **Wait timer** — optional delay (e.g., 5 minutes) to allow cancellation after approval

---

## GitHub Environment Setup

Secrets and variables are stored under GitHub Environments (**Settings > Environments**). Create a `staging` environment for staging and a `production` environment for production, using the same names with environment-appropriate values.

### Secrets

Encrypted and masked in logs. Set under **Environments > \<env\> > Secrets**.

| Secret                  | What it's for                                                                        | Where to find it                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| `SUPABASE_ACCESS_TOKEN` | Authenticates the Supabase CLI to link and run migrations                            | [supabase.com/dashboard/account/tokens](https://supabase.com/dashboard/account/tokens) > Generate new token |
| `SUPABASE_DB_PASSWORD`  | Required by `supabase link` to connect to the database                               | Supabase dashboard > **Settings > Database > Database password**                                            |
| `NETLIFY_AUTH_TOKEN`    | Authenticates the Netlify CLI to deploy                                              | Netlify > User settings > OAuth > Personal access tokens                                                    |
| `VITE_SUPABASE_API_KEY` | Supabase anon key for client-side queries (subject to RLS)                           | Supabase dashboard > **Settings > API > anon public**                                                       |
| `STRIPE_SECRET_KEY`     | Stripe secret key used by the `create-subscription` edge function                    | Stripe dashboard > test/live secret key                                                                     |
| `STRIPE_WEBHOOK_SECRET` | Verifies Stripe webhook signatures; set on edge functions via `supabase secrets set` | Stripe dashboard > webhook endpoint > Signing secret                                                        |

### Permissions

The `tag-release` job runs `semantic-release` using the default `GITHUB_TOKEN`, which needs `permissions: contents: write` on that job (already set in `deploy.yml`) so it can push tags and create the GitHub Release. No environment secret is needed for this — it's a workflow-level permission, not a configurable value.

### Variables

Plaintext, visible in logs. Set under **Environments > \<env\> > Variables**.

| Variable                   | What it's for                                                                             | Where to find it                                                |
| -------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| `SUPABASE_PROJECT_REF`     | Identifies which Supabase project to migrate                                              | Project URL: `supabase.com/dashboard/project/`**`<this part>`** |
| `NETLIFY_SITE_ID`          | Identifies which Netlify site to deploy to                                                | Netlify > TaroFlash site > **Site configuration > Site ID**     |
| `VITE_SUPABASE_URL`        | Supabase project URL used by the browser client                                           | Supabase dashboard > **Settings > API > Project URL**           |
| `VITE_STRIPE_PUBLIC_KEY`   | Stripe publishable key used by the payment UI (safe to be public)                         | Stripe dashboard > test/live publishable key                    |
| `VITE_MEMBERSHIP_PRICE_ID` | Stripe price ID for the membership product                                                | Stripe dashboard > product > price ID                           |
| `VITE_AUTH_REDIRECT_URL`   | URL Supabase redirects to after OAuth login (e.g. `https://taro-flash.com/auth/callback`) | Set per environment — staging vs production domain              |
