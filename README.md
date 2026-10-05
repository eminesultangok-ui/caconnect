# CAConnect — Corporate Actions Portal

A self-service portal that lets investment advisors review overseas corporate actions (dividends, splits, rights issues, mergers, warrant expiries) and sign them off without emailing the operations team.

**Live app:** https://caconnect-brown.vercel.app
Sign up with any email and a password of at least 8 characters.

> Built for BUS4012 Vibe Coding for Startups (La Trobe University), Assignment 3.
> Corporate action data is mock data for demonstration only.

---

## Features

**Accounts**
- **Real accounts** — sign up and log in with Supabase Auth (minimum 8-character passwords)
- **Silent session refresh** — expired sessions are renewed in the background with refresh tokens
- **Edit profile** — change name, branch, markets and notification preference; the account email is shown read-only
- **Change password** — verifies the current password first; no email needed

**Corporate actions**
- **Dashboard** — events loaded from the database, with status tags (Custodian-confirmed, Preliminary, Pending) and a **Mandatory / Voluntary** badge
- **Plain-English event summaries** — what each event means for the client
- **Event-specific elections** — mandatory events are pre-filled; voluntary events offer only the valid options (for example: take up, sell or let rights lapse)
- **Contextual help** — "What do these options mean?" explains each election at the moment of decision
- **Alerts** — ex-dates, record dates and payment dates in the next 14 days, with a countdown and a badge on the tab
- **Search** — by issuer, security, ticker, ISIN, event type or market
- **Cross-branch indicator** — shows which other branches have already reviewed an event (branch only, never names)
- **Help & FAQ** — answers to common advisor questions and one-sentence definitions of every event type and status

**Sign-off and records**
- **Server-side business rule** — only Custodian-confirmed events can be signed off; the decision is made by the backend, not the browser
- **Double-submit protection** — the confirm button locks while a sign-off is being saved
- **History** — the advisor's own sign-offs with reference numbers (CA-YYYY-NNNN) and the chosen election
- **User control** — "Delete this record" removes a review from the database
- **14-day retention** — reviews older than 14 days are deleted automatically

## Architecture

```mermaid
flowchart LR
    U[Advisor's browser] --> F[React frontend<br/>Vercel static build]
    F -->|fetch /auth, /profile,<br/>/corporate-actions, /reviews| B[FastAPI backend<br/>Vercel Python function]
    B -->|REST API + user's access token| S[(Supabase<br/>PostgreSQL + Auth)]
    S -.->|Row Level Security<br/>checks every request| S
```

- The **frontend** never talks to Supabase directly and contains no keys. It only knows the backend URL.
- The **backend** calls Supabase with the logged-in user's own token, so **Row Level Security** applies to every request: each advisor can only read and change their own data.
- Validation runs **twice**: in the browser for a good user experience, and again on the server so the rules cannot be bypassed.
- In production, frontend and backend share one domain, so no CORS is needed.

## Tech stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router |
| Backend | Python 3.11, FastAPI, Pydantic, httpx |
| Database and auth | Supabase (PostgreSQL, Auth, Row Level Security) |
| Hosting | Vercel |
| Built with | Cline in VS Code (Plan Mode → Act Mode) |

## Project structure

```
caconnect/
├── api/
│   └── index.py              # Vercel entry point — imports the FastAPI app
├── backend/
│   ├── main.py               # API endpoints, validation and business rules
│   ├── setup_database.sql    # Tables, RLS policies, trigger, functions, seed data
│   ├── database.py           # Runs the SQL setup (manual, one-off)
│   ├── check_tables.py       # Verifies tables, RLS, policies and trigger
│   ├── test_database_connection.py
│   ├── requirements.txt
│   └── .env.example          # Template — real values are never committed
├── frontend/
│   ├── src/
│   │   ├── pages/            # Login, Setup/Edit profile, Dashboard, Event, Review, Confirm,
│   │   │                     # Result, History, Alerts, Search, Help & FAQ
│   │   ├── components/ui/    # Reusable UI kit (FormSection, TextField, StatusTag, TabBar...)
│   │   ├── lib/api.ts        # All backend calls, token refresh and error handling
│   │   ├── lib/constants.ts  # Election mapping, help texts, password rule
│   │   └── App.tsx           # Central state and routing
│   └── .env.production       # VITE_API_URL= (empty: same domain)
├── requirements.txt          # Copy of backend/requirements.txt for Vercel
├── vercel.json               # Build and routing config
└── .gitignore
```

## API endpoints

| Method | Path | Purpose |
|---|---|---|
| POST | `/auth/signup` | Create an account (password ≥ 8 characters) |
| POST | `/auth/login` | Log in, returns access and refresh tokens |
| POST | `/auth/refresh` | Exchange a refresh token for a new access token |
| POST | `/auth/logout` | Revoke the current session (this device only) |
| POST | `/auth/change-password` | Verify the current password and set a new one |
| GET / PUT | `/profile` | Read or update the advisor profile (GET also returns the account email) |
| GET | `/corporate-actions` | List all events |
| GET | `/corporate-actions/{id}` | One event |
| GET | `/reviews` | The user's reviews from the last 14 days |
| POST | `/reviews` | Submit a sign-off (election and business rule checked here) |
| DELETE | `/reviews/{reference}` | Delete one of the user's reviews |
| GET | `/health` | Health check |

## Security

- **No secrets in Git** — `backend/.env` is listed in `.gitignore`; only `.env.example` with placeholders is committed.
- **Minimum secrets in production** — Vercel holds only `SUPABASE_URL` and `SUPABASE_ANON_KEY`. The database password is not stored on the hosting platform.
- **Passwords are never stored in application tables** — Supabase Auth stores them hashed; the `profiles` table holds only work details (name, branch, markets).
- **Row Level Security** on all three tables: `profiles` and `reviews` are private to each user; `corporate_actions` is read-only. The cross-branch indicator is updated through a `SECURITY DEFINER` function, so no write policy is opened.
- **Server-side validation and business rules** — elections, account counts, profile values and sign-off approval cannot be changed from the browser.
- **Learning-project limits** — tokens are stored in localStorage, email confirmation and password-reset emails are turned off (Supabase's built-in email service only delivers to project team members). A production version should use more secure token storage and a custom email provider.

## Run locally (Windows PowerShell)

**1. Backend**

```powershell
cd backend
python -m venv venv
.\venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env      # then fill in your own Supabase values
python database.py          # one-off: creates tables, policies and seed data
uvicorn main:app --reload
```

**2. Frontend** (in a second terminal)

```powershell
cd frontend
npm install
npm run dev
```

When both terminals are running, open `http://localhost:5173` in your browser. This address only works on your own computer while the two servers are running; to use the app online, open the live link at the top of this page.

The frontend reads `VITE_API_URL=http://127.0.0.1:8000` from `frontend/.env.development` to reach the local backend.

## Environment variables

| Name | Where | Used by |
|---|---|---|
| `SUPABASE_URL` | `backend/.env` and Vercel | Backend |
| `SUPABASE_ANON_KEY` | `backend/.env` and Vercel | Backend |
| `DATABASE_URL` | `backend/.env` only | Setup scripts only |

## Author

Emine Sultan Gok — Master of Business Analytics, La Trobe University
