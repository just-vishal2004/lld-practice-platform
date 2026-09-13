import { LLMClient, LLMClientError } from './LLMClient';

const DEFAULT_MODEL = 'claude-sonnet-4-6';
const REQUEST_TIMEOUT_MS = 20_000;

/**
 * Thin adapter over Anthropic's Messages API. Deliberately dependency-free
 * (plain fetch) so the backend doesn't need the full SDK for one call site.
 * Any provider failure (network, non-2xx, timeout, malformed response) is
 * normalized into an LLMClientError so LLMEvaluator has one failure mode to
 * handle.
 */
export class AnthropicLLMClient implements LLMClient {
  constructor(private readonly apiKey: string, private readonly model: string = DEFAULT_MODEL) {}

  async complete(systemPrompt: string, userPrompt: string): Promise<string> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1200,
          system: systemPrompt,
          messages: [{ role: 'user', content: userPrompt }],
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => '');
        throw new LLMClientError(`Anthropic API returned ${response.status}: ${body.slice(0, 300)}`);
      }

      const data = (await response.json()) as { content?: { type: string; text?: string }[] };
      const text = (data.content ?? [])
        .filter((block) => block.type === 'text' && typeof block.text === 'string')
        .map((block) => block.text)
        .join('\n');

      if (!text.trim()) throw new LLMClientError('Anthropic API returned an empty response');
      return text;
    } catch (err) {
      if (err instanceof LLMClientError) throw err;
      if ((err as Error).name === 'AbortError') {
        throw new LLMClientError(`Anthropic API request timed out after ${REQUEST_TIMEOUT_MS}ms`, err);
      }
      throw new LLMClientError('Anthropic API request failed', err);
    } finally {
      clearTimeout(timeout);
    }
  }
}
