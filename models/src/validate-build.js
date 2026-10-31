import {
  defaultModelsClient,
  loadAgentPrompt,
  validateAgentResponseSchema,
  validateSpeechField,
} from './index.js';

const AGENTS = ['intake', 'documents', 'portal', 'tracker', 'caller', 'letter'];

async function main() {
  process.env.MOCK_AI = 'true';
  for (const agent of AGENTS) {
    const prompt = loadAgentPrompt(agent);
    if (!prompt || prompt.length < 20) {
      throw new Error(`Missing or empty prompt for agent: ${agent}`);
    }
    const res = await defaultModelsClient[agent]({ language: 'mr-IN' });
    const check = validateAgentResponseSchema(res);
    if (!check.valid) {
      throw new Error(`Agent ${agent} failed schema validation: ${check.reason}`);
    }
    const speechCheck = validateSpeechField(res.speech);
    if (!speechCheck.valid) {
      throw new Error(`Agent ${agent} failed speech validation: ${speechCheck.reason}`);
    }
  }
  console.log(
    '[@nagarsathi/models] Build validation passed: 6 agent prompts loaded, Claude wrapper, redact(), guardCallOutput(), and MOCK_AI fixtures verified.'
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});

