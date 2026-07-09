export interface ProviderUsage {
  inputTokens: number;
  outputTokens: number;
  requestCount: number;
}

interface SessionUsage {
  [provider: string]: ProviderUsage;
}

const sessionUsage = new Map<string, SessionUsage>();
const aggregatedUsage: SessionUsage = {};

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

export function recordUsage(sessionId: string, provider: string, model: string, messages: any[], content: string): void {
  const lastMsg = messages[messages.length - 1];
  const inputTokens = messages.reduce((sum: number, m: any) => sum + estimateTokens(m.content || ''), 0);
  const outputTokens = estimateTokens(content);

  if (!sessionUsage.has(sessionId)) {
    sessionUsage.set(sessionId, {});
  }
  const sUsage = sessionUsage.get(sessionId)!;
  if (!sUsage[provider]) sUsage[provider] = { inputTokens: 0, outputTokens: 0, requestCount: 0 };
  sUsage[provider].inputTokens += inputTokens;
  sUsage[provider].outputTokens += outputTokens;
  sUsage[provider].requestCount++;

  if (!aggregatedUsage[provider]) aggregatedUsage[provider] = { inputTokens: 0, outputTokens: 0, requestCount: 0 };
  aggregatedUsage[provider].inputTokens += inputTokens;
  aggregatedUsage[provider].outputTokens += outputTokens;
  aggregatedUsage[provider].requestCount++;
}

export function getSessionUsage(sessionId: string): SessionUsage {
  return { ...(sessionUsage.get(sessionId) || {}) };
}

export function getAggregatedUsage(): SessionUsage {
  return { ...aggregatedUsage };
}

export function clearUsage(): void {
  sessionUsage.clear();
  for (const key of Object.keys(aggregatedUsage)) {
    delete aggregatedUsage[key];
  }
}
