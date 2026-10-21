// functions/src/index.ts (Firebase Authentication blocking function, Cloud Functions 2nd gen)
//
// Runs before Firebase creates a new user, for every sign-up method, including direct calls
// to the Auth API. Needs Firebase Authentication with Identity Platform.
import { defineSecret } from "firebase-functions/params";
import { beforeUserCreated, HttpsError } from "firebase-functions/v2/identity";
import { checkSignup } from "./signup-check";

const SIGNUP_API_KEY = defineSecret("SIGNUP_API_KEY");

export const checknewsignup = beforeUserCreated({ secrets: [SIGNUP_API_KEY] }, async (event) => {
  const check = await checkSignup(SIGNUP_API_KEY.value(), {
    email: event.data?.email,
    phone: event.data?.phoneNumber,
    ip: event.ipAddress,
    userAgent: event.userAgent,
  });

  if (check.recommendation === "block") {
    throw new HttpsError("permission-denied", "We could not create your account. Please use a different email address.");
  }
  // Custom claims end up in the user's ID token; users cannot change them.
  return { customClaims: { signup_risk: check.recommendation } };
});
