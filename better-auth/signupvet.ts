// signupvet.ts: SignupVet plugin for Better Auth (copy this file into your project).
//
// Checks the email, phone and IP of every new user before Better Auth creates it.
// "block" stops the signup, everything else is saved on the user as signupRisk and
// signupRiskScore (read-only for users). Fails open: if the API is slow, unreachable
// or your monthly checks are used up, the signup goes through.
import type { BetterAuthPlugin } from "better-auth";
import { APIError, getIP } from "better-auth/api";

export type SignupCheck = {
  recommendation: "allow" | "review" | "block";
  risk_score: number | null;
  reason_codes: string[];
  failed_open?: boolean;
};

export type SignupVetOptions = {
  /** Your sv_live_... key. Defaults to process.env.SIGNUP_API_KEY. */
  apiKey?: string;
  /** Recommendations that stop the signup. Default: ["block"]. */
  blockOn?: SignupCheck["recommendation"][];
  /** Message shown when a signup is blocked. Keep it neutral. */
  blockedMessage?: string;
  /** Milliseconds to wait for the API before letting the signup through. Default: 2000. */
  timeoutMs?: number;
  /** Called with every result, for example to log it. */
  onResult?: (result: SignupCheck, user: { email: string }) => void | Promise<void>;
  baseUrl?: string;
};

const FAIL_OPEN: SignupCheck = { recommendation: "allow", risk_score: null, reason_codes: [], failed_open: true };
const LOOPBACK = new Set(["127.0.0.1", "::1"]);

export async function checkSignup(
  apiKey: string | undefined,
  signup: { email?: string; phone?: string; ip?: string; userAgent?: string },
  { baseUrl = "https://www.signupvet.com", timeoutMs = 2000 } = {},
): Promise<SignupCheck> {
  if (!apiKey) return FAIL_OPEN;
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
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok ? ((await res.json()) as SignupCheck) : FAIL_OPEN;
  } catch {
    return FAIL_OPEN;
  }
}

export const signupVet = (options: SignupVetOptions = {}) => {
  const blockOn = options.blockOn ?? ["block"];
  return {
    id: "signupvet",
    schema: {
      user: {
        fields: {
          signupRisk: { type: "string", required: false, input: false },
          signupRiskScore: { type: "number", required: false, input: false },
        },
      },
    },
    init(ctx) {
      return {
        options: {
          databaseHooks: {
            user: {
              create: {
                async before(user, context) {
                  // No request (for example a seed script) or a guest account: nothing to check.
                  if (!context || context.path === "/sign-in/anonymous") return;
                  const headers = context.request?.headers ?? context.headers;
                  const ip = headers ? getIP(headers, ctx.options) : null;
                  const phone = typeof user.phoneNumber === "string" ? user.phoneNumber : undefined;
                  const result = await checkSignup(
                    options.apiKey ?? process.env.SIGNUP_API_KEY,
                    {
                      email: user.email,
                      phone,
                      ip: ip && !LOOPBACK.has(ip) ? ip : undefined,
                      userAgent: headers?.get("user-agent") ?? undefined,
                    },
                    { baseUrl: options.baseUrl ?? process.env.SIGNUPVET_URL, timeoutMs: options.timeoutMs },
                  );
                  await options.onResult?.(result, user);
                  if (blockOn.includes(result.recommendation)) {
                    throw APIError.from("FORBIDDEN", {
                      code: "SIGNUP_BLOCKED",
                      message: options.blockedMessage ?? "We could not create your account. Please contact support.",
                    });
                  }
                  return { data: { ...user, signupRisk: result.recommendation, signupRiskScore: result.risk_score } };
                },
              },
            },
          },
        },
      };
    },
  } satisfies BetterAuthPlugin;
};
