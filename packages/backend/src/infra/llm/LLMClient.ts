/**
 * The only interface the rest of the system knows about for talking to an
 * LLM. LLMEvaluator depends on this, not on any specific SDK — swapping
 * Anthropic for OpenAI/Gemini/a local model is an adapter change here only.
 */
export interface LLMClient {
  /**
   * @param systemPrompt Instructions for the model.
   * @param userPrompt The task-specific content (problem + submission).
   * @returns raw text response (expected to be JSON per the prompt contract).
   * @throws if the provider is unreachable, errors, or times out. Callers
   *         (LLMEvaluator) are responsible for catching this and degrading
   *         gracefully — the LLMClient itself never silently swallows errors.
   */
  complete(systemPrompt: string, userPrompt: string): Promise<string>;
}

export class LLMClientError extends Error {
  constructor(message: string, public readonly cause?: unknown) {
    super(message);
    this.name = 'LLMClientError';
  }
}
