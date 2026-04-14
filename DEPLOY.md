# La Romana 2026 — Deploy Guide

## One-time GCP setup

Create a **new GCP project** (separate from the Bogotá deploy — total isolation).

```bash
export PROJECT_ID=la-romana-2026   # whatever you name it
gcloud projects create "$PROJECT_ID"
gcloud config set project "$PROJECT_ID"

# Enable services
gcloud services enable \
  run.googleapis.com \
  sqladmin.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  artifactregistry.googleapis.com

# Create Cloud SQL (PostgreSQL 15, smallest tier — 15 users is trivial load)
gcloud sql instances create la-romana-db \
  --database-version=POSTGRES_15 \
  --region=us-central1 \
  --tier=db-f1-micro \
  --storage-size=10GB

gcloud sql databases create la_romana --instance=la-romana-db
gcloud sql users create la_romana_app \
  --instance=la-romana-db \
  --password='CHANGE_ME_STRONG_PASSWORD'

# Get connection string
# Format: postgresql://la_romana_app:PASSWORD@/la_romana?host=/cloudsql/PROJECT_ID:us-central1:la-romana-db
```

## Secrets

```bash
# JWT signing secret — generate a long random string
printf 'CHANGE_ME_LONG_RANDOM_JWT_SECRET' | gcloud secrets create jwt-secret --data-file=-

# DATABASE_URL (the Cloud SQL connection string built above)
printf 'postgresql://la_romana_app:PASS@/la_romana?host=/cloudsql/PROJECT_ID:us-central1:la-romana-db' \
  | gcloud secrets create database-url --data-file=-

# Grant Cloud Build SA access to secrets
PROJECT_NUMBER=$(gcloud projects describe "$PROJECT_ID" --format='value(projectNumber)')
gcloud secrets add-iam-policy-binding jwt-secret \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor
gcloud secrets add-iam-policy-binding database-url \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/secretmanager.secretAccessor

# Grant Cloud Build SA deploy permissions
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/run.admin
gcloud projects add-iam-policy-binding "$PROJECT_ID" \
  --member=serviceAccount:${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com \
  --role=roles/iam.serviceAccountUser
```

## First deploy

The API URL is circular: web needs it to know where to call, but the API doesn't exist yet.
Two-pass deploy:

**Pass 1 — deploy API, note URL:**
```bash
gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_API_URL=https://placeholder.invalid,\
_DATABASE_URL="$(gcloud secrets versions access latest --secret=database-url)",\
_JWT_SECRET="$(gcloud secrets versions access latest --secret=jwt-secret)"

gcloud run services describe la-romana-api --region=us-central1 --format='value(status.url)'
# → copy this URL
```

**Pass 2 — re-deploy with the real API URL baked into the web image:**
```bash
export API_URL=https://la-romana-api-xxx.run.app   # from above

gcloud builds submit --config cloudbuild.yaml \
  --substitutions=_API_URL=$API_URL,\
_DATABASE_URL="$(gcloud secrets versions access latest --secret=database-url)",\
_JWT_SECRET="$(gcloud secrets versions access latest --secret=jwt-secret)"
```

## Migrations run on API startup

The API container runs `postgres-migrations` automatically on boot — it picks up every `.sql` file in `packages/api/migrations/` and applies them in order. No manual migration step needed.

## Seed the event

Once the API is running and the DB is populated by migrations:

```bash
# Locally, pointing at the Cloud SQL proxy or public IP
cd packages/api
DATABASE_URL='postgresql://...' npm run seed
```

This creates event `LR2026`, 3 rounds, 3 courses, 15 placeholder players.

## Sanity checks

- `curl $API_URL/health` → `{"status":"ok","database":"connected"}`
- `curl $API_URL/api` → returns endpoint map
- Visit the web URL, log in as `organizer@laromana.golf` / `Par00`, open `/leaderboard`

## On-trip operations (Apr 29 – May 2)

1. Before Round 1: edit real player names + handicaps via `/admin/events/LR2026/players`
2. Create flights per round via API POST (UI coming in a follow-up):
   ```
   POST /events/LR2026/flights { "roundId": "<round-id>", "count": 4 }
   ```
3. Assign players to flights via existing admin UI (team + position)
4. During play: any player/organizer enters scores at `/score?roundId=X&flightId=Y`
5. After each round: `/admin/events/LR2026/rounds/<id>/netos` — set pot + winners
6. Leaderboard auto-updates at `/leaderboard` (3 tabs)
