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
from pydantic import BaseModel, field_validator, model_validator

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


# ──────────────────────────────────────────────────────
# Option lists — must stay in sync with ProfileSetupPage
# ──────────────────────────────────────────────────────
BRANCHES = ['Melbourne', 'Sydney', 'Singapore', 'London']
MARKETS = ['Australia', 'Japan', 'South Korea', 'Hong Kong', 'Germany', 'France', 'Switzerland', 'United Kingdom', 'United States']
NOTIFICATION_PREFS = ['email', 'in-app', 'both']


MIN_PASSWORD_LENGTH = 8


# ──────────────────────────────────────────────────────────────────────────────
# Election mapping — must stay in sync with frontend/src/lib/constants.ts
# ──────────────────────────────────────────────────────────────────────────────
EVENT_ELECTIONS: dict[str, list[str]] = {
    'Cash Dividend':  ['No election required – cash paid automatically'],
    'Stock Split':    ['No election required – shares adjusted automatically'],
    'Merger':         ['No election required – converted automatically under the merger terms'],
    'Rights Issue':   ['Take up rights', 'Sell rights', 'Let rights lapse'],
    'Warrant Expiry': ['Exercise warrants', 'Sell warrants', 'Let warrants expire'],
}


class AuthBody(BaseModel):
    email: str
    password: str


class SignupBody(AuthBody):
    @field_validator('password')
    @classmethod
    def password_min_length(cls, v: str) -> str:
        if len(v) < MIN_PASSWORD_LENGTH:
            raise ValueError(f'Password must be at least {MIN_PASSWORD_LENGTH} characters')
        return v


class ChangePasswordBody(BaseModel):
    current_password: str
    new_password: str

    @field_validator('new_password')
    @classmethod
    def new_password_min_length(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError('New password must be at least 8 characters')
        return v


class ProfileBody(BaseModel):
    name: str
    branch: str
    markets: list[str]
    notificationPref: str

    @field_validator('name')
    @classmethod
    def name_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Name must not be empty')
        return v

    @field_validator('branch')
    @classmethod
    def branch_valid(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Branch must not be empty')
        if v not in BRANCHES:
            raise ValueError(f'Branch must be one of: {", ".join(BRANCHES)}')
        return v

    @field_validator('markets')
    @classmethod
    def markets_valid(cls, v: list[str]) -> list[str]:
        allowed = set(MARKETS)
        invalid = [m for m in v if m not in allowed]
        if invalid:
            raise ValueError(f'Invalid market(s): {", ".join(invalid)}. Allowed: {", ".join(MARKETS)}')
        return v

    @field_validator('notificationPref')
    @classmethod
    def notification_pref_valid(cls, v: str) -> str:
        if v not in NOTIFICATION_PREFS:
            raise ValueError(f'notificationPref must be one of: {", ".join(NOTIFICATION_PREFS)}')
        return v


class ReviewBody(BaseModel):
    eventId: str
    affectedAccountCount: int
    election: str
    notes: str
    contactedOps: bool
    opsReason: str | None = None

    @field_validator('affectedAccountCount')
    @classmethod
    def account_count_valid(cls, v: int) -> int:
        if v < 0:
            raise ValueError('affectedAccountCount must be >= 0')
        if v > 100_000:
            raise ValueError('affectedAccountCount must be at most 100,000')
        return v

    @field_validator('election')
    @classmethod
    def election_not_empty(cls, v: str) -> str:
        if not v.strip():
            raise ValueError('Election must not be empty')
        if len(v.strip()) > 100:
            raise ValueError('Election must be at most 100 characters')
        return v

    @field_validator('notes')
    @classmethod
    def notes_max_length(cls, v: str) -> str:
        if len(v) > 200:
            raise ValueError('Notes must be at most 200 characters')
        return v

    @model_validator(mode='after')
    def ops_reason_required(self) -> 'ReviewBody':
        if self.contactedOps and not (self.opsReason and self.opsReason.strip()):
            raise ValueError('opsReason is required when contactedOps is true')
        return self


def _supabase_headers(access_token: str) -> dict[str, str]:
    return {
        "apikey": SUPABASE_ANON_KEY,
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
    }


def _check_supabase(resp: httpx.Response, *, auth_endpoint: bool = False) -> None:
    """Convert Supabase errors into clean HTTP errors.

    auth_endpoint=True  → calls to SUPABASE_URL/auth/v1/user (identity check)
        401 or 403 → AuthError (expired or invalid session).

    auth_endpoint=False → REST data calls (/rest/v1/... and /rest/v1/rpc/...)
        401 → AuthError (expired session — frontend will refresh).
        403 → HTTPException 403 (RLS violation — must NOT log the user out).

    Any other ≥ 400 → HTTPException 502; full text logged server-side only.
    """
    if resp.status_code in (401, 403):
        if auth_endpoint or resp.status_code == 401:
            raise AuthError()
        # 403 on a data endpoint = Row Level Security violation
        raise HTTPException(status_code=403, detail="You do not have permission to do this.")
    if resp.status_code >= 400:
        logger.error("Supabase error %d: %s", resp.status_code, resp.text[:300])
        raise HTTPException(status_code=502, detail="An external service error occurred.")


async def _get_user_id(access_token: str, client: httpx.AsyncClient) -> str:
    resp = await client.get(
        f"{SUPABASE_URL}/auth/v1/user",
        headers=_supabase_headers(access_token),
    )
    _check_supabase(resp, auth_endpoint=True)
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
async def signup(body: SignupBody):
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
    return {"access_token": token, "refresh_token": data.get("refresh_token", ""), "user": data.get("user", {})}


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
    return {"access_token": token, "refresh_token": data.get("refresh_token", ""), "user": data.get("user", {})}


# ──────────────────────────────────────────────────────
# AUTH — POST /auth/refresh
# ──────────────────────────────────────────────────────
class RefreshBody(BaseModel):
    refresh_token: str


@app.post("/auth/refresh")
async def refresh_token(body: RefreshBody):
    async with httpx.AsyncClient() as client:
        resp = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=refresh_token",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"refresh_token": body.refresh_token},
        )
    data = resp.json()
    if resp.status_code != 200:
        msg = data.get("error_description") or data.get("msg") or data.get("message", "Token refresh failed")
        raise HTTPException(status_code=401, detail=msg)
    return {"access_token": data.get("access_token", ""), "refresh_token": data.get("refresh_token", "")}


# ──────────────────────────────────────────────────────
# AUTH — POST /auth/logout
# ──────────────────────────────────────────────────────
@app.post("/auth/logout")
async def logout(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{SUPABASE_URL}/auth/v1/logout?scope=local",
            headers={**_supabase_headers(token)},
        )
    return {"status": "ok"}


# ──────────────────────────────────────────────────────
# AUTH — POST /auth/change-password
# ──────────────────────────────────────────────────────
@app.post("/auth/change-password")
async def change_password(body: ChangePasswordBody, authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        # Step 1: get the user's email from their token
        user_resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=_supabase_headers(token),
        )
        _check_supabase(user_resp, auth_endpoint=True)
        user_data = user_resp.json()
        email = user_data.get("email", "")
        if not email:
            raise HTTPException(status_code=400, detail="Could not determine user email")

        # Step 2: verify current password (discard the returned token)
        verify_resp = await client.post(
            f"{SUPABASE_URL}/auth/v1/token?grant_type=password",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json={"email": email, "password": body.current_password},
        )
        if verify_resp.status_code != 200:
            raise HTTPException(status_code=400, detail="Current password is incorrect")

        # Step 3: update to new password
        update_resp = await client.put(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=_supabase_headers(token),
            json={"password": body.new_password},
        )
        _check_supabase(update_resp, auth_endpoint=True)

    return {"status": "ok"}
@app.get("/profile")
async def get_profile(authorization: str = Header(...)):
    token = authorization.replace("Bearer ", "")
    async with httpx.AsyncClient() as client:
        uid = await _get_user_id(token, client)
        # Also fetch email from Supabase Auth (not stored in profiles table)
        user_resp = await client.get(
            f"{SUPABASE_URL}/auth/v1/user",
            headers=_supabase_headers(token),
        )
        _check_supabase(user_resp, auth_endpoint=True)
        email = user_resp.json().get("email", "")
        resp = await client.get(
            f"{SUPABASE_URL}/rest/v1/profiles",
            params={"id": f"eq.{uid}", "select": "*"},
            headers=_supabase_headers(token),
        )
    _check_supabase(resp)
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
        "email": email,
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
    _check_supabase(resp)
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
    _check_supabase(resp)
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
    _check_supabase(resp)
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
        _check_supabase(event_resp)
        events = event_resp.json()
        if not events:
            raise HTTPException(status_code=404, detail="Corporate action not found")
        event = events[0]
        # Validate election against allowed list for this event type
        event_type = event.get("event_type", "")
        allowed = EVENT_ELECTIONS.get(event_type)
        if allowed is None:
            raise HTTPException(
                status_code=400,
                detail="No elections are defined for this event type. Please contact Operations.",
            )
        if body.election not in allowed:
            raise HTTPException(
                status_code=400,
                detail=f"Election '{body.election}' is not valid for {event_type}. Allowed: {', '.join(allowed)}",
            )
        if event["status"] == "Custodian-confirmed":
            profile_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/profiles",
                params={"id": f"eq.{uid}", "select": "*"},
                headers=_supabase_headers(token),
            )
            _check_supabase(profile_resp)
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
            # Best-effort: record advisor's branch for cross-branch indicator
            try:
                rpc_resp = await client.post(
                    f"{SUPABASE_URL}/rest/v1/rpc/record_branch_review",
                    headers=_supabase_headers(token),
                    json={"p_event_id": body.eventId},
                )
                if rpc_resp.status_code not in (200, 204):
                    logger.warning("record_branch_review RPC failed: %s", rpc_resp.text)
            except Exception as exc:
                logger.warning("record_branch_review RPC error: %s", exc)
            reviews_resp = await client.get(
                f"{SUPABASE_URL}/rest/v1/reviews",
                params={"user_id": f"eq.{uid}", "contacted_operations": "eq.false", "select": "id"},
                headers=_supabase_headers(token),
            )
            _check_supabase(reviews_resp)
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
            _check_supabase(reviews_resp)
            self_service_count = len(reviews_resp.json())
            if event["status"] == "Preliminary":
                reason = (
                    "This event cannot be signed off yet — the ratio and payment date are "
                    "preliminary and may change once the custodian confirms them. "
                    "Operations will notify you once it is confirmed."
                )
            else:
                reason = (
                    "This event cannot be signed off yet — it has not yet been confirmed "
                    "by the custodian. Operations will notify you once it is confirmed."
                )
            return {
                "success": False,
                "reason": reason,
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