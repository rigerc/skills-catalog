import test from 'node:test';
import assert from 'node:assert/strict';
import {prCommentMarkdown} from '../scripts/quality.mjs';

const entry = (id, status, counts = {errors: 0, warnings: 0, infos: 0}, findings = []) =>
  ({id, status, counts, findings});

test('PR quality report explains when there are no new or repinned skills', () => {
  const text = prCommentMarkdown([]);
  assert.match(text, /Checked: \*\*0\*\*/);
  assert.match(text, /No new or repinned verified skills/);
  assert.match(text, /Report-only/);
  assert.ok(text.includes('\n\n'), 'report uses Markdown newlines');
  assert.ok(!text.includes('\\n'), 'report does not contain literal escaped line breaks');
});

test('PR quality report includes passes, warnings, failures and non-evaluations', () => {
  const entries = [
    entry('acme/a/skill1', 'pass'),
    entry('acme/a/skill2', 'warn', {errors: 0, warnings: 1, infos: 0},
      [{level: 'warning', message: 'Missing optional example'}]),
    entry('acme/a/skill3', 'fail', {errors: 1, warnings: 0, infos: 0},
      [{level: 'error', message: 'Invalid frontmatter'}]),
    {id: 'acme/b/skill4', status: 'not_evaluated', not_evaluated: {code: 'timeout', message: 'slow host'}},
  ];
  const text = prCommentMarkdown(entries, {fetches: 2, skippedIds: ['acme/c/skill5'], stopped: 'deadline'});
  assert.match(text, /Checked: \*\*4\*\*/);
  assert.match(text, /acme\/a\/skill1 \| pass/);
  assert.match(text, /Missing optional example/);
  assert.match(text, /Invalid frontmatter/);
  assert.match(text, /timeout: slow host/);
  assert.match(text, /not attempted/);
  assert.match(text, /fetch groups attempted: \*\*2\*\*/);
});

test('PR quality report limits large tables to 60 entries', () => {
  const entries = Array.from({length: 65}, (_, i) => entry('owner/repo/skill' + String(i).padStart(2, '0'), 'pass'));
  const text = prCommentMarkdown(entries);
  assert.match(text, /Checked: \*\*65\*\*/);
  assert.match(text, /5 additional skills/);
  assert.ok(!text.includes('skill64'), 'truncated entries are omitted from PR comment');
});
