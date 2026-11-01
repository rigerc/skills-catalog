#!/usr/bin/env node
/** Smoke test for a running local Kev-4B server: verifies serving provenance via
 * /v1/models, then submits one five-question score request and validates the typed answers.
 * Usage: node docker/kev/smoke-test.mjs [base-url]   (default http://127.0.0.1:8009)
 * Optional: KEV_API_KEY is sent as bearer authentication when set. */
import {JEV_QUESTIONS, validateJevEvaluation, kevBaseUrl, kevSystemOneEndpoint, verifyKev} from '../../scripts/jev-evaluator.mjs';

const options = {kevBaseUrl: process.argv[2], model: 'kev-latest'};
const base = kevBaseUrl(options);
const apiKey = process.env.KEV_API_KEY?.trim();
const headers = {...(apiKey ? {Authorization: 'Bearer ' + apiKey} : {}), Accept: 'application/json'};

try {
  console.log('Serving provenance: ' + JSON.stringify(await verifyKev(options, {apiKey}), null, 1));

  const state = {id: 'skills-catalog-smoke-test', source_url: null,
    document: 'Example skill document: workflow for reviewing pull requests for test coverage.'};
  const response = await fetch(kevSystemOneEndpoint(options), {
    method: 'POST', redirect: 'error',
    headers: {...headers, 'Content-Type': 'application/json', 'x-typesafe-request-id': 'skills-catalog-smoke'},
    body: JSON.stringify({state, model: 'kev-latest', questions: structuredClone(JEV_QUESTIONS)}),
  });
  if (!response.ok) throw new Error(base + '/v1/systemone returned HTTP ' + response.status);
  const body = await response.json();
  if (body.truncated === true) throw new Error('server truncated the document (KEV_TRUNCATE_STATES=1)');
  const answers = body.answers ?? {};
  if (JSON.stringify(Object.keys(answers).sort()) !== JSON.stringify(Object.keys(JEV_QUESTIONS).sort())) {
    throw new Error('Kev did not answer exactly the five rubric questions');
  }
  const scores = Object.fromEntries(Object.entries(answers).map(([key, answer]) => {
    if (answer.type !== 'score' || !Number.isFinite(answer.score) || answer.score < 0 || answer.score > 4) {
      throw new Error('Invalid score answer: ' + key);
    }
    return [key, {score: answer.score + 1, native_score: answer.score, legend: answer.legend, probabilities: answer.probabilities}];
  }));
  validateJevEvaluation({scores, limitations: []});
  const overall = Object.values(scores).reduce((sum, s) => sum + s.score, 0) / Object.keys(JEV_QUESTIONS).length;
  console.log('Five-question request OK. Overall: ' + overall.toFixed(2) + '/5, request id: ' +
    (response.headers.get('x-typesafe-request-id') ?? 'none') + ', usage: ' + JSON.stringify(body.usage ?? null));
  console.log('Kev smoke test passed.');
} catch (error) {
  console.error('Kev smoke test failed: ' + (error instanceof Error ? error.message : error));
  process.exitCode = 1;
}
