// Run: SIGNUP_API_KEY=sv_live_... node example.js
import { checkSignup } from "./signup-check.js";

const result = await checkSignup({ email: "someone@mailinator.com", ip: "178.197.224.1" });
console.log(result.recommendation, result.risk_score, result.reason_codes);
