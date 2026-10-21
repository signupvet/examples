// functions/src/signup-check.ts: SignupVet check for Cloud Functions (fails open on errors and timeouts).
export type SignupCheck = {
  recommendation: "allow" | "review" | "block";
  risk_score: number | null;
  reason_codes: string[];
  failed_open?: boolean;
};

const FAIL_OPEN: SignupCheck = { recommendation: "allow", risk_score: null, reason_codes: [], failed_open: true };

export async function checkSignup(
  apiKey: string,
  signup: { email?: string; phone?: string; ip?: string; userAgent?: string },
  baseUrl = process.env.SIGNUPVET_URL ?? "https://www.signupvet.com",
): Promise<SignupCheck> {
  try {
    const res = await fetch(`${baseUrl}/score`, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        email: signup.email,
        phone: signup.phone,
        ip: signup.ip,
        context: { user_agent: signup.userAgent },
      }),
      // Blocking functions must answer within 7 seconds, so keep this short.
      signal: AbortSignal.timeout(2000),
    });
    return res.ok ? ((await res.json()) as SignupCheck) : FAIL_OPEN;
  } catch {
    return FAIL_OPEN;
  }
}
