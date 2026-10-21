// Runs once when the Next.js server starts. In production the server refuses to
// start unless sign-in is fully configured (see instrumentation-node.ts).
// The check lives in a Node-only file so the Edge build never sees it.

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") await import("./instrumentation-node");
}
