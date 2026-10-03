# CAConnect Backend — FastAPI Application
# Main entry point for the CAConnect API.
# All user data operations go through the Supabase REST API
# (SUPABASE_URL + SUPABASE_ANON_KEY + user's access token)
# so that Row Level Security is enforced per-user.
# Direct DATABASE_URL is used only in setup/maintenance scripts.

import os
import random
import logging
from contextlib import asynccontextmanager
from datetime import datetime, timedelta

import httpx
from dotenv import load_dotenv
from fastapi import FastAPI, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel

env_path = os.path.join(os.path.dirname(__file__), ".env")
load_dotenv(env_path)

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("caconnect")

# Supabase credentials — NEVER log these
SUPABASE_URL = os.environ.get("SUPABASE_URL", "")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", "")


class AuthError(Exception):
    """Raised when the Supabase token is invalid or expired."""
    pass


class AuthBody(BaseModel):
    email: str
    password: str


class ProfileBody(BaseModel):
    name: str
    branch: str
    markets: list[str]
    notificationPref: str


class ReviewBody(BaseModel):
    eventId: str
    affectedAccountCount: int
    election: str
    notes: str
    contactedOps: bool
    opsReason: str | None = None


def _supabase_headers(access_token: str) -> dict[str, str]:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


async def _get_user_id(access_token: str, client: httpx.AsyncClient) -> str:
    resp = await client.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers=_supabase_headers(access_token),
    )
    if resp.status_code == 401:
        raise AuthError()
    resp.raise_for_status()
    uid = resp.json().get("id")
    if not uid:
        raise AuthError()
    return uid


def _generate_reference() -> str:
    year = datetime.now().year
    seq = random.randint(1000, 9999)
    return f"CA-{year}-{seq}"


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info("CAConnect API started")
    yield
    logger.info("CAConnect API shutting down")


app = FastAPI(
    title="CAConnect API",
    description="Backend for the CAConnect overseas corporate actions portal",
    version="2.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(AuthError)
async def auth_error_handler(_request, _exc):
    return JSONResponse(status_code=401, content={"detail": "Invalid or expired token. Please log in again."})


@app.get("/")
async def root():
    return {"message": "Welcome to the CAConnect API"}


@app.get("/health")
async def health():
    return {"status": "ok"}


# ──────────────────────────────────────────────────────
# AUTH — POST /auth/signup
# ──────────────────────────────────────────────────────
@app.post("/auth/signup")
async def signup(body: AuthBody):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/auth/v1/signup",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": body.email, "password": body.password},
        )
    data = resp.json()
    if resp.status_code != 200:
        msg = data.get("msg") or data.get("error_description") or data.get("message", "Sign-up failed")
        raise HTTPException(status_code=resp.status_code, detail=msg)
    token = data.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail="Sign-up succeeded but no token returned. Please try logging in.")
    return {"access_token": token, "user": data.get("user", {})}


# ──────────────────────────────────────────────────────
# AUTH — POST /auth/login
# ──────────────────────────────────────────────────────
@app.post("/auth/login")
async def login(body: AuthBody):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": body.email, "password": body.password},
        )
    data = resp.json()
    if resp.status_code != 200:
        msg = data.get("error_description") or data.get("msg") or data.get("message", "Login failed")
        raise HTTPException(status_code=resp.status_code, detail=msg)
    token = data.get("access_token")
    if not token:
        raise HTTPException(status_code=400, detail="Login succeeded but no token returned.")
    return {"access_token": token, "user": data.get("user", {})}

# ──────────────────────────────────────────────────────
# PROFILE — GET /profile
# ──────────────────────────────────────────────────────
@app.get("/profile")
async def get_profile(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        uid = await _get_user_id(token, client)
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            params={"id": f"eq.{uid}", "select": "*"},
            headers=_supabase_headers(token),
        )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Profile not found")
    row = rows[0]
    full_name = row.get("full_name")
    branch = row.get("branch")
    is_complete = bool(full_name) and bool(branch)
    return {
        "name": full_name,
        "branch": branch,
        "markets": row.get("markets_covered", []),
        "notificationPref": row.get("notification_pref", "both"),
        "isComplete": is_complete,
    }


# ──────────────────────────────────────────────────────
# PROFILE — PUT /profile
# ──────────────────────────────────────────────────────
@app.put("/profile")
async def update_profile(body: ProfileBody, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        uid = await _get_user_id(token, client)
        payload = {
            "id": uid,
            "full_name": body.name,
            "branch": body.branch,
            "markets_covered": body.markets,
            "notification_pref": body.notificationPref,
        }
        resp = await client.post(
            f"{SUPABASE_URL}/rest/v1/profiles",
            params={"on_conflict": "id"},
            headers={**_supabase_headers(token), "Prefer": "resolution=merge-duplicates"},
            json=payload,
        )
    if resp.status_code not in (200, 201, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"status": "ok"}
# ──────────────────────────────────────────────────────
# CORPORATE ACTIONS — GET /corporate-actions
# ──────────────────────────────────────────────────────
@app.get("/corporate-actions")
async def get_corporate_actions(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        await _get_user_id(token, client)
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/corporate_actions",
            params={"select": "*", "order": "id"},
            headers=_supabase_headers(token),
        )
    resp.raise_for_status()
    return [
        {
            "id": r["id"],
            "security": r.get("security", ""),
            "ticker": r.get("ticker", ""),
            "avatarColor": r.get("avatar_color", "#1F2225"),
            "issuer": r["issuer"],
            "isin": r["isin"],
            "market": r["market"],
            "eventType": r["event_type"],
            "ratio": r["ratio"],
            "exDate": str(r["ex_date"]),
            "recordDate": str(r["record_date"]),
            "paymentDate": str(r["payment_date"]),
            "status": r["status"],
            "source": r["source"],
            "plainEnglish": r["plain_english"],
            "reviewedByBranches": r.get("reviewed_by_branches", []),
        }
        for r in resp.json()
    ]


# ──────────────────────────────────────────────────────
# CORPORATE ACTIONS — GET /corporate-actions/{id}
# ──────────────────────────────────────────────────────
@app.get("/corporate-actions/{ca_id}")
async def get_corporate_action(ca_id: str, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        await _get_user_id(token, client)
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/corporate_actions",
            params={"id": f"eq.{ca_id}", "select": "*"},
            headers=_supabase_headers(token),
        )
    resp.raise_for_status()
    rows = resp.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Corporate action not found")
    r = rows[0]
    return {
        "id": r["id"],
        "security": r.get("security", ""),
        "ticker": r.get("ticker", ""),
        "avatarColor": r.get("avatar_color", "#1F2225"),
        "issuer": r["issuer"],
        "isin": r["isin"],
        "market": r["market"],
        "eventType": r["event_type"],
        "ratio": r["ratio"],
        "exDate": str(r["ex_date"]),
        "recordDate": str(r["record_date"]),
        "paymentDate": str(r["payment_date"]),
        "status": r["status"],
        "source": r["source"],
        "plainEnglish": r["plain_english"],
        "reviewedByBranches": r.get("reviewed_by_branches", []),
    }
# ──────────────────────────────────────────────────────
# REVIEWS — GET /reviews
# Returns the current user's reviews from the last 14 days.
# Deletes older ones (14-day retention).
# ──────────────────────────────────────────────────────
@app.get("/reviews")
async def get_reviews(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        uid = await _get_user_id(token, client)
        cutoff = (datetime.utcnow() - timedelta(days=14)).isoformat()
        del_resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/reviews",
            params={"user_id": f"eq.{uid}", "created_at": f"lt.{cutoff}"},
            headers=_supabase_headers(token),
        )
        if del_resp.status_code not in (200, 204):
            logger.warning("Retention DELETE returned status %d", del_resp.status_code)
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/reviews",
            params={"user_id": f"eq.{uid}", "select": "*", "order": "created_at.desc"},
            headers=_supabase_headers(token),
        )
    resp.raise_for_status()
    return [
        {
            "reviewId": r["reference"],
            "advisorName": r.get("advisor_name", ""),
            "branch": r.get("branch", ""),
            "eventId": r["event_id"],
            "security": r.get("security", ""),
            "eventType": r.get("event_type", ""),
            "affectedAccountCount": r["affected_accounts"],
            "election": r["election_decision"],
            "notes": r.get("notes", ""),
            "contactedOps": r["contacted_operations"],
            "opsReason": r.get("operations_reason"),
            "timestamp": r["created_at"],
            "eventStatus": r["status_at_review"],
            "eventSource": r.get("event_source", ""),
        }
        for r in resp.json()
    ]
# ──────────────────────────────────────────────────────
# REVIEWS — POST /reviews
# Business rule:
#   Custodian-confirmed → save review, return success
#   Preliminary / Pending → reject, return reason
# ──────────────────────────────────────────────────────
@app.post("/reviews")
async def submit_review(body: ReviewBody, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        uid = await _get_user_id(token, client)
        event_resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/corporate_actions",
            params={"id": f"eq.{body.eventId}", "select": "*"},
            headers=_supabase_headers(token),
        )
        event_resp.raise_for_status()
        events = event_resp.json()
        if not events:
            raise HTTPException(status_code=404, detail="Corporate action not found")
        event = events[0]
        if event["status"] == "Custodian-confirmed":
            profile_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                params={"id": f"eq.{uid}", "select": "*"},
                headers=_supabase_headers(token),
            )
            profile_resp.raise_for_status()
            profiles = profile_resp.json()
            profile = profiles[0] if profiles else {}
            reference = _generate_reference()
            review_row = {
                "user_id": uid, "event_id": body.eventId,
                "affected_accounts": body.affectedAccountCount,
                "election_decision": body.election, "notes": body.notes,
                "contacted_operations": body.contactedOps,
                "operations_reason": body.opsReason,
                "status_at_review": event["status"],
                "reference": reference,
                "advisor_name": profile.get("full_name", "Unknown"),
                "branch": profile.get("branch", "Unknown"),
                "security": event.get("security", ""),
                "event_type": event.get("event_type", ""),
                "event_source": event.get("source", ""),
            }
            insert_resp = await client.post(
                f"{SUPABASE_URL}/rest/v1/reviews",
                headers={**_supabase_headers(token), "Prefer": "return=representation"},
                json=review_row,
            )
            if insert_resp.status_code not in (200, 201):
                raise HTTPException(status_code=insert_resp.status_code, detail=insert_resp.text)
            inserted = insert_resp.json()
            inserted_row = inserted[0] if isinstance(inserted, list) and inserted else inserted
            reviews_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/reviews",
                params={"user_id": f"eq.{uid}", "contacted_operations": "eq.false", "select": "id"},
                headers=_supabase_headers(token),
            )
            reviews_resp.raise_for_status()
            self_service_count = len(reviews_resp.json())
            return {
                "success": True, "reference": reference,
                "selfServiceCount": self_service_count,
                "review": {
                    "reviewId": inserted_row["reference"],
                    "advisorName": inserted_row.get("advisor_name", ""),
                    "branch": inserted_row.get("branch", ""),
                    "eventId": inserted_row["event_id"],
                    "security": inserted_row.get("security", ""),
                    "eventType": inserted_row.get("event_type", ""),
                    "affectedAccountCount": inserted_row["affected_accounts"],
                    "election": inserted_row["election_decision"],
                    "notes": inserted_row.get("notes", ""),
                    "contactedOps": inserted_row["contacted_operations"],
                    "opsReason": inserted_row.get("operations_reason"),
                    "timestamp": inserted_row["created_at"],
                    "eventStatus": inserted_row["status_at_review"],
                    "eventSource": inserted_row.get("event_source", ""),
                },
                "eventStatus": event["status"],
                "eventSource": event.get("source", ""),
            }
        else:
            reviews_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/reviews",
                params={"user_id": f"eq.{uid}", "contacted_operations": "eq.false", "select": "id"},
                headers=_supabase_headers(token),
            )
            reviews_resp.raise_for_status()
            self_service_count = len(reviews_resp.json())
            return {
                "success": False,
                "reason": "This event cannot be signed off yet — the ratio and payment date are preliminary and may change once confirmed by the custodian. Operations will notify you when it is confirmed.",
                "selfServiceCount": self_service_count,
                "eventStatus": event["status"],
                "eventSource": event.get("source", ""),
            }


# ──────────────────────────────────────────────────────
# REVIEWS — DELETE /reviews/{id}
# ──────────────────────────────────────────────────────
@app.delete("/reviews/{review_ref}")
async def delete_review(review_ref: str, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        uid = await _get_user_id(token, client)
        resp = await client.delete(
            f"{SUPABASE_URL}/rest/v1/reviews",
            params={"reference": f"eq.{review_ref}", "user_id": f"eq.{uid}"},
            headers=_supabase_headers(token),
        )
    if resp.status_code not in (200, 204):
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return {"status": "deleted"}