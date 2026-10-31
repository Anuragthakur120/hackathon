import { EVAL_DATASET } from './dataset.js';
import {
  defaultModelsClient,
  validateAgentResponseSchema,
  validateSpeechField,
} from '../src/index.js';

export async function runAllEvals({ client = defaultModelsClient } = {}) {
  const results = [];

  for (const item of EVAL_DATASET) {
    const response = await client[item.agent](item.input);
    const schemaCheck = validateAgentResponseSchema(response);
    const speechCheck = validateSpeechField(response.speech);

    const errors = [];
    if (!schemaCheck.valid) {
      errors.push(`Schema error: ${schemaCheck.reason}`);
    }
    if (!speechCheck.valid) {
      errors.push(`Speech error: ${speechCheck.reason}`);
    }
    if (response.data?.language !== item.language) {
      errors.push(
        `Expected language ${item.language}, got ${response.data?.language}`
      );
    }

    const exp = item.expected || {};
    if (exp.serviceId && response.data?.service?.id !== exp.serviceId) {
      errors.push(
        `Expected service.id=${exp.serviceId}, got ${response.data?.service?.id}`
      );
    }
    if (
      exp.minConfidence &&
      Number(response.data?.confidence || 0) < exp.minConfidence
    ) {
      errors.push(
        `Expected confidence >= ${exp.minConfidence}, got ${response.data?.confidence}`
      );
    }
    if (exp.status && response.data?.status !== exp.status) {
      errors.push(
        `Expected status=${exp.status}, got ${response.data?.status}`
      );
    }
    if (exp.issue && response.data?.issue !== exp.issue) {
      errors.push(`Expected issue=${exp.issue}, got ${response.data?.issue}`);
    }
    if (
      exp.isDraft !== undefined &&
      Boolean(response.data?.isDraft) !== exp.isDraft
    ) {
      errors.push(
        `Expected isDraft=${exp.isDraft}, got ${response.data?.isDraft}`
      );
    }
    if (
      exp.extractedRefId &&
      response.data?.extractedRefId !== exp.extractedRefId
    ) {
      errors.push(
        `Expected extractedRefId=${exp.extractedRefId}, got ${response.data?.extractedRefId}`
      );
    }
    if (exp.referenceId && response.data?.referenceId !== exp.referenceId) {
      errors.push(
        `Expected referenceId=${exp.referenceId}, got ${response.data?.referenceId}`
      );
    }
    if (exp.deadline && response.data?.deadline !== exp.deadline) {
      errors.push(
        `Expected deadline=${exp.deadline}, got ${response.data?.deadline}`
      );
    }

    results.push({
      id: item.id,
      agent: item.agent,
      language: item.language,
      passed: errors.length === 0,
      errors,
      response,
    });
  }

  return {
    total: results.length,
    passed: results.filter((r) => r.passed).length,
    failed: results.filter((r) => !r.passed).length,
    results,
  };
}

if (
  process.argv[1] &&
  import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))
) {
  process.env.MOCK_AI = process.env.MOCK_AI || 'true';
  runAllEvals()
    .then((summary) => {
      console.log(
        `[@nagarsathi/models evals] ${summary.passed}/${summary.total} passed`
      );
      if (summary.failed > 0) {
        console.error(summary.results.filter((r) => !r.passed));
        process.exit(1);
      }
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
