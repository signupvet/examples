// lib/signup-check.ts: server-only SignupVet check (fails open on errors and timeouts).
import "server-only";

export type SignupCheck = {
  recommendation: "allow" | "review" | "block";
  risk_score: number | null;
  reason_codes: string[];
  failed_open?: boolean;
};

const BASE_URL = process.env.SIGNUPVET_URL ?? "https://www.signupvet.com";
const FAIL_OPEN: SignupCheck = { recommendation: "allow", risk_score: null, reason_codes: [], failed_open: true };

export async function checkSignup(signup: {
  email?: string;
  phone?: string;
  ip?: string;
  userAgent?: string;
  timezone?: string;
}): Promise<SignupCheck> {
  try {
    const res = await fetch(`${BASE_URL}/score`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SIGNUP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: signup.email,
        phone: signup.phone,
        ip: signup.ip,
        context: { user_agent: signup.userAgent, timezone: signup.timezone },
      }),
      signal: AbortSignal.timeout(2000),
      cache: "no-store",
    });
    return res.ok ? ((await res.json()) as SignupCheck) : FAIL_OPEN;
  } catch {
    return FAIL_OPEN;
  }
}

/** Visitor IP on Vercel and most proxies: the first entry of x-forwarded-for. */
export function clientIp(headers: Headers): string | undefined {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim() || headers.get("x-real-ip") || undefined;
}
