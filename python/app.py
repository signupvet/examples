"""FastAPI signup route with a SignupVet check.

pip install -r requirements.txt
SIGNUP_API_KEY=sv_live_... uvicorn app:app --reload
"""
from fastapi import FastAPI, HTTPException, Request
from pydantic import BaseModel

from signup_check import check_signup

app = FastAPI()


class Signup(BaseModel):
    email: str
    password: str
    timezone: str | None = None


@app.post("/signup")
def signup(body: Signup, request: Request):
    # Behind a proxy, run uvicorn with --proxy-headers so request.client.host is the visitor's IP.
    check = check_signup(
        email=body.email,
        ip=request.client.host if request.client else None,
        user_agent=request.headers.get("user-agent"),
        timezone=body.timezone,
    )
    if check["recommendation"] == "block":
        raise HTTPException(400, "We could not create your account. Please use a different email address.")

    user_id = create_user(body.email, body.password)  # your existing signup
    if check["recommendation"] == "review":
        flag_for_review(user_id, check["reason_codes"])  # e.g. no free credits until verified
    return {"ok": True}


def create_user(email: str, password: str) -> str:
    return "user_123"


def flag_for_review(user_id: str, reasons: list[str]) -> None:
    print(f"review user {user_id}: {', '.join(reasons)}")
