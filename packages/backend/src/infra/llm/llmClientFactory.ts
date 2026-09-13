import { LLMClient } from './LLMClient';
import { AnthropicLLMClient } from './AnthropicLLMClient';

/**
 * Returns a configured LLMClient, or null if no provider is configured.
 * This is the single place that reads LLM-related environment variables —
 * everything downstream (LLMEvaluator, use-cases) works with `LLMClient | null`
 * and treats `null` as "AI feedback is optional and currently unavailable",
 * never as an error condition.
 */
export function createLLMClientFromEnv(): LLMClient | null {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey || !apiKey.trim()) return null;
  const model = process.env.ANTHROPIC_MODEL || undefined;
  return new AnthropicLLMClient(apiKey, model);
}
