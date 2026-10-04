// signup-check.js: check a signup with SignupVet (Node 18+, no dependencies).
//
// Fails open: if the API is slow, unreachable or returns an error (for example
// because your monthly checks are used up), the signup is allowed. Your signup
// form never breaks because of this check.

const FAIL_OPEN = Object.freeze({ recommendation: "allow", risk_score: null, reason_codes: [], failed_open: true });

/**
 * @param {{ email?: string, phone?: string, ip?: string, countryHint?: string,
 *           userAgent?: string, timezone?: string, acceptLanguage?: string }} signup
 * @returns {Promise<{ recommendation: "allow" | "review" | "block", risk_score: number | null,
 *                     reason_codes: string[], failed_open?: boolean }>}
 */
export async function checkSignup(signup, { timeoutMs = 2000 } = {}) {
  const body = {
    email: signup.email,
    phone: signup.phone,
    ip: signup.ip,
    country_hint: signup.countryHint,
    context: {
      user_agent: signup.userAgent,
      timezone: signup.timezone,
      accept_language: signup.acceptLanguage,
    },
  };
  const baseUrl = process.env.SIGNUPVET_URL ?? "https://www.signupvet.com";
  try {
    const res = await fetch(`${baseUrl}/score`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SIGNUP_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(timeoutMs),
    });
    if (!res.ok) {
      console.warn(`SignupVet returned ${res.status}, allowing signup`);
      return FAIL_OPEN;
    }
    return await res.json();
  } catch (err) {
    console.warn(`SignupVet unreachable (${err?.name ?? "error"}), allowing signup`);
    return FAIL_OPEN;
  }
}
