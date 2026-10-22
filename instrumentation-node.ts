import { productionAuthProblems } from "./lib/auth/password";

// Production start-up check: SESSION_SECRET and a password hash for each user
// must be set, or the server exits instead of running with a missing secret or a
// default password. `next build` is skipped: building needs no secrets, only
// starting does. Problems are listed by variable name, never by value.

if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== "phase-production-build") {
  const problems = productionAuthProblems();
  if (problems.length) {
    console.error(`Refusing to start: sign-in is not configured for production.\n - ${problems.join("\n - ")}\nSee "Sign-in" in README.md.`);
    process.exit(1);
  }
}
