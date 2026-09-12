# Airtribe

AI-assisted primary health triage for rural areas with limited healthcare infrastructure and a high
patient-to-doctor ratio. A patient describes their problem in their own language, by voice or text; an
AI agent runs a RAG-backed intake conversation, then produces a structured, downloadable primary health
condition report for a doctor. Doctors get a dashboard of all patients, review reports, decide next
actions, and chat directly with patients for clarification.

**This is a hackathon prototype** — it demonstrates the full flow end-to-end but intentionally skips
production concerns (see "Non-goals" below).

## Architecture

```
frontend/     React + Vite + Tailwind — patient chat (voice/text) + doctor dashboard
backend/      Node/Express + Prisma + Socket.IO — auth, patients/doctors, reports, doctor<->patient chat
ai-service/   Node/Express — RAG intake conversation + report generation + PDF rendering
```

All three services share one Postgres database and a JWT secret. The frontend calls `backend` and
`ai-service` directly. `backend` owns the Prisma schema (source of truth for table/column names);
`ai-service` reads/writes the same tables with raw SQL (`pg`) and verifies the same JWTs — no
separate login.

- Conversational AI: calls the [Gemini API](https://ai.google.dev) directly (`GEMINI_MODEL` in
  `.env`, defaults to `gemini-2.0-flash`) for both the back-and-forth intake turns and the final
  structured report, using Gemini's native JSON response mode — no local ML runtime or Python needed.
- RAG: ~28 curated markdown docs in `ai-service/knowledge_base/`, retrieved by simple keyword-overlap
  scoring (`ai-service/src/rag.js`) — no embeddings model or vector DB, so there's nothing to install
  or download beyond `npm install`.
- Voice input: the browser's built-in Web Speech API (Chrome/Edge) — no extra key or service needed.
  Falls back to text-only in unsupported browsers.

## One-time setup

Each service needs a real `.env` file — copy the provided `env.sample.txt` in that service's folder to
`.env` and fill in the values (you'll need a Gemini API key for `ai-service`, and the **same**
`JWT_SECRET` value in both `backend/.env` and `ai-service/.env`).

```
backend/env.sample.txt      -> backend/.env
ai-service/env.sample.txt   -> ai-service/.env
frontend/env.sample.txt     -> frontend/.env
```

### 1. Database

Start Docker Desktop, then from `Airtribe/`:
```
docker compose up -d
```
Postgres is exposed on host port **5544** (not the default 5432) to avoid clashing with other
Postgres instances already running on this machine (a native install on 5432, another project's
container on 5433). The `DATABASE_URL` in the env samples already points at 5544 — only change it
if you edit `docker-compose.yml`.

### 2. Backend
```
cd backend
npm install
npx prisma migrate dev --name init
npm run seed
npm run dev
```
Runs on `http://localhost:4000`. The seed script prints demo login credentials.

### 3. AI service
```
cd ai-service
npm install
npm run dev
```
Runs on `http://localhost:8000`. No build step or model download — the knowledge base is read
straight from `knowledge_base/*.md` at request time.

### 4. Frontend
```
cd frontend
npm install
npm run dev
```
Runs on `http://localhost:5173`.

## Demo script

The seed data gives you a populated dashboard immediately, plus one clean account for a live walkthrough:

1. Log in as `priya@airtribe.demo` / `password123` (the clean demo patient).
2. Pick a language, then speak (mic button) or type a symptom description. The AI asks 2-4 follow-up
   questions, then generates a report and shows a download link.
3. Log in as `dr.sharma@airtribe.demo` / `password123`.
4. On the dashboard, see all patients — the 3 pre-seeded ones (routine / moderate / emergency urgency)
   plus Priya's just-generated report.
5. Open a patient's detail page: view the full structured report, download the PDF, read the transcript,
   set a "next action", mark it reviewed.
6. Click "Chat with patient", send a message — log back in as that patient (or open a second browser
   window) and see it arrive under "Doctor Chat".

## Non-goals (explicit, for judges)

- No SMS/OTP — email + password auth only.
- No production-grade error handling, observability, or automated tests — this is a demo prototype.
- AI-generated "possible conditions" are always framed as hypotheses for a doctor to weigh, never as a
  diagnosis.
