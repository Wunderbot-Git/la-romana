# La Romana 2026 — Deploy Guide (Cloud Run + Cloud SQL)

This guide takes the app from localhost to a public URL on Google Cloud, end-to-end. Aim is **15 mobile users in a Caribbean resort**, so we keep the setup small (single region, smallest tiers, no autoscale theatre).

> ⚠️ **Read once before running.** Steps build on each other. Some commands need values produced by previous steps (e.g. `INSTANCE_CONN`, `API_URL`).

---

## 0. Prerequisites

- `gcloud` CLI installed and logged in (`gcloud auth login`)
- A GCP **billing account** you can attach to a new project (`gcloud billing accounts list`)
- Local repo cloned, dependencies installed (`npm install` in repo root)

```bash
gcloud billing accounts list   # note your billing account ID
```

---

## 1. Create GCP project + Cloud SQL

```bash
export PROJECT_ID=la-romana-2026          # adjust if taken; suffix -prod is fine
export REGION=us-central1
export BILLING_ACCOUNT_ID=XXXXXX-YYYYYY-ZZZZZZ   # from `gcloud billing accounts list`

gcloud projects create "$PROJECT_ID" --name="La Romana 2026"
gcloud config set project "$PROJECT_ID"
gcloud billing projects link "$PROJECT_ID" --billing-account="$BILLING_ACCOUNT_ID"

# Enable required APIs (takes ~30 s)
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com \
  servicenetworking.googleapis.com

# Cloud SQL — smallest tier (db-f1-micro). 15 users is trivial load.
# Provisioning takes 4-6 minutes.
gcloud sql instances create la-romana-db \
  --database-version=POSTGRES_15 \
  --region=$REGION \
  --tier=db-f1-micro \
  --storage-size=10GB \
  --backup \
  --backup-start-time=06:00

gcloud sql databases create la_romana --instance=la-romana-db

# Generate strong DB password — store it safely (1Password etc).
export DB_PASS=$(openssl rand -base64 24 | tr -d '/+=')
echo "DB_PASS=$DB_PASS"

gcloud sql users create la_romana_app \
  --instance=la-romana-db \
  --password="$DB_PASS"

# Cloud Run connects to Cloud SQL via Unix socket → INSTANCE_CONN identifies it.
export INSTANCE_CONN=$(gcloud sql instances describe la-romana-db --format='value(connectionName)')
export DATABASE_URL="postgresql://la_romana_app:${DB_PASS}@/la_romana?host=/cloudsql/${INSTANCE_CONN}"
echo "$INSTANCE_CONN"
echo "$DATABASE_URL"
```

---

## 2. Secrets + IAM

```bash
# JWT signing key
JWT_SECRET=$(openssl rand -base64 48 | tr -d '/+=')

printf "%s" "$JWT_SECRET" | gcloud secrets create jwt-secret --data-file=-
printf "%s" "$DATABASE_URL" | gcloud secrets create database-url --data-file=-

# Cloud Build service account needs to read secrets + deploy to Cloud Run
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"

gcloud secrets add-iam-policy-binding jwt-secret \
  --member="serviceAccount:$CB_SA" --role=roles/secretmanager.secretAccessor
gcloud secrets add-iam-policy-binding database-url \
  --member="serviceAccount:$CB_SA" --role=roles/secretmanager.secretAccessor

gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" --role=roles/run.admin
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$CB_SA" --role=roles/iam.serviceAccountUser

# The Cloud Run runtime SA needs to mount Cloud SQL
DEFAULT_RUN_SA="${PROJECT_NUMBER}-compute@developer.gserviceaccount.com"
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member="serviceAccount:$DEFAULT_RUN_SA" --role=roles/cloudsql.client
```

---

## 3. First build (Pass 1 — placeholder API URL)

The web container bakes `NEXT_PUBLIC_API_URL` in at **build time**, not runtime. We need to deploy the API first to learn its URL, then rebuild the web image with the real URL.

From the **repo root**:

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="\
_API_URL=https://placeholder.invalid,\
_DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url),\
_JWT_SECRET=$(gcloud secrets versions access latest --secret=jwt-secret),\
_CLOUDSQL_INSTANCE=$INSTANCE_CONN"
```

Build runs ~6–12 min (API + Web Docker builds + 2× deploy). Watch in [Cloud Build console](https://console.cloud.google.com/cloud-build/builds) or follow tail of the local CLI output.

When it finishes:

```bash
export API_URL=$(gcloud run services describe la-romana-api --region=$REGION --format='value(status.url)')
echo "$API_URL"

curl -s "$API_URL/health"
# → {"status":"ok","timestamp":"...","database":"connected"}
```

If `database: disconnected`: check that `--add-cloudsql-instances` is in cloudbuild.yaml and that the IAM role `roles/cloudsql.client` is bound to the runtime SA (Step 2).

---

## 4. Second build (Pass 2 — real API URL baked into Web)

```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions="\
_API_URL=$API_URL,\
_DATABASE_URL=$(gcloud secrets versions access latest --secret=database-url),\
_JWT_SECRET=$(gcloud secrets versions access latest --secret=jwt-secret),\
_CLOUDSQL_INSTANCE=$INSTANCE_CONN"

export WEB_URL=$(gcloud run services describe la-romana-web --region=$REGION --format='value(status.url)')
echo "$WEB_URL"
```

The Web container is rebuilt with the proper API URL. Once Pass 2 finishes, `$WEB_URL` is the public URL the team uses.

---

## 5. Seed the production DB

Migrations have already run on API boot (Pass 1). Now we populate event/courses/players. Easiest is via the Cloud SQL Auth Proxy from your laptop:

```bash
# Install once — https://cloud.google.com/sql/docs/postgres/sql-proxy
brew install cloud-sql-proxy   # macOS

# In a separate terminal, start the proxy:
cloud-sql-proxy --port 5433 "$INSTANCE_CONN"

# In the original terminal, run the seed against the proxy:
cd packages/api
DATABASE_URL="postgresql://la_romana_app:${DB_PASS}@localhost:5433/la_romana" \
  npx ts-node scripts/seed-test-data.ts
```

The seed creates:
- Event `LR2026` with `bet_amount = $2`
- 3 rounds (TOTH, Ocean's 4, Dye Fore Marina+Chavón)
- All courses/tees with slope/rating
- 16 player accounts (15 humans + 1 phantom) with password `Par00`
- Round 1 flights pre-populated (admin can change day-of)

> Note: re-running the seed is safe — it `UPSERT`s. But it **does** rewrite Round 1 flight assignments. Don't re-run mid-tournament.

---

## 6. Sanity checks

```bash
curl -s "$API_URL/health"
curl -s "$API_URL/api"

# Browser (organizer login):
open "$WEB_URL"
# → /login → organizer@laromana.golf / Par00
# → /leaderboard, /score, /apuestas, /apuestas/extra, /ranking, /matches
```

**Mobile test (must do)**:
- iPhone Safari → `$WEB_URL`
- Login as `philipp@laromana.golf` / `Par00`
- Score-Tab → opens Grupo 1 score-grid
- Tap a hole → modal opens → enter score → saves
- Marcador updates in real-time
- *Add to Home Screen* → opens as PWA without browser chrome

---

## 7. Optional: custom domain

```bash
gcloud run domain-mappings create \
  --service=la-romana-web \
  --domain=lr2026.example.com \
  --region=$REGION
# → follow DNS records output, set TXT/CNAME with your registrar
```

---

## On-trip operations (Apr 29 – May 2)

- **Pre-Round 1**: organizer verifies player names + handicaps via `/admin/events/LR2026/players`
- **Day-of, before tee-time**: organizer composes flights for the day at `/admin/events/LR2026/rounds/<round-id>/flights`
- **During play**: any player in a flight enters scores at `/score` (auto-redirects to their flight)
- **Pots are deterministic**: Mejor del Día ($100 + $50), Ryder, Total Viaje all auto-compute from scores — no manual pot creation needed
- **Leaderboard auto-updates** at `/leaderboard` (cache TTL = 10 s, invalidated on every score write)

---

## Troubleshooting

| Problem | Cause | Fix |
|---|---|---|
| `database: disconnected` on `/health` | API can't reach Cloud SQL | `--add-cloudsql-instances` flag missing, or runtime SA lacks `roles/cloudsql.client` |
| Web shows network errors | API URL wrong (placeholder still baked) | Re-run Pass 2 with real `$API_URL` |
| Score saves fail with 401 | JWT secret mismatch | Confirm `JWT_SECRET` env var on API matches what was used at sign-up |
| `gcloud builds submit` timeout | Web build slow on default machine | `cloudbuild.yaml` has `machineType: E2_HIGHCPU_8` and `timeout: 1800s` — should be enough |
| All POST endpoints return 503 | DB connection pool exhausted | Restart API: `gcloud run services update la-romana-api --region=$REGION` |

---

## Rollback / Disaster Recovery

- **DB restore**: Cloud SQL daily backups are on by default — restore via `gcloud sql backups restore`
- **Container rollback**: `gcloud run services update-traffic la-romana-api --to-revisions=<previous-rev>=100`
- **Local fallback**: localhost setup keeps working unchanged. If Cloud breaks completely, host laptop on resort wifi and share IP. Not pretty but viable.
