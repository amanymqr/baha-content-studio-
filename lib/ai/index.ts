import "server-only";
import type { AiProvider, AiStatus, AiTask } from "./types";

// AI is off unless both AI_PROVIDER=claude and ANTHROPIC_API_KEY are set, so no
// paid request can happen by accident. The provider module is only loaded when on.

const configured = () => process.env.AI_PROVIDER?.toLowerCase() === "claude";
const hasKey = () => Boolean(process.env.ANTHROPIC_API_KEY);

export function aiStatus(): AiStatus {
  if (!configured()) return { enabled: false, reason: "disabled" };
  if (!hasKey()) return { enabled: false, reason: "missing_key" };
  return { enabled: true, provider: "claude", tasks: ["translate"] };
}

export function aiCan(task: AiTask) {
  const s = aiStatus();
  return s.enabled && s.tasks.includes(task);
}

/** Returns the active provider, or null when AI is off. */
export async function getAi(): Promise<AiProvider | null> {
  if (!aiStatus().enabled) return null;
  const { claudeProvider } = await import("./claude");
  return claudeProvider;
}
