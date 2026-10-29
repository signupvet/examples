"""Check a signup with SignupVet (pip install requests).

Fails open: if the API is slow, unreachable or returns an error, the signup is allowed.
"""
import ipaddress
import logging
import os

import requests

BASE_URL = os.environ.get("SIGNUPVET_URL", "https://www.signupvet.com")
FAIL_OPEN = {"recommendation": "allow", "risk_score": None, "reason_codes": [], "failed_open": True}


def _valid_ip(ip):
    """Only send real IP addresses (a test client or unix socket may give something else)."""
    try:
        return str(ipaddress.ip_address(ip.strip())) if ip else None
    except ValueError:
        return None


def check_signup(email=None, phone=None, ip=None, user_agent=None, timezone=None, timeout=2):
    body = {k: v for k, v in {"email": email, "phone": phone, "ip": _valid_ip(ip)}.items() if v}
    context = {k: v for k, v in {"user_agent": user_agent, "timezone": timezone}.items() if v}
    if context:
        body["context"] = context
    api_key = os.environ.get("SIGNUP_API_KEY")
    if not api_key:
        logging.warning("SIGNUP_API_KEY is not set, allowing signup")
        return dict(FAIL_OPEN)
    try:
        res = requests.post(
            f"{BASE_URL}/score",
            headers={"Authorization": f"Bearer {api_key}"},
            json=body,
            timeout=timeout,
        )
        res.raise_for_status()
        return res.json()
    except requests.RequestException as err:
        logging.warning("SignupVet check failed (%s), allowing signup", err)
        return dict(FAIL_OPEN)


if __name__ == "__main__":
    result = check_signup(email="someone@mailinator.com", ip="178.197.224.1")
    print(result["recommendation"], result["risk_score"], result["reason_codes"])
