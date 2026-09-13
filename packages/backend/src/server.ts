import 'dotenv/config';
import { buildContainer } from './container';
import { createApp } from './api/app';

const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const container = buildContainer();
const app = createApp(container);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`LLD Practice Platform backend listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log(`LLM (AI qualitative feedback) configured: ${container.llmConfigured}`);
});
