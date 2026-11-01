import test from 'node:test';
import assert from 'node:assert/strict';
import {matchesGlob} from 'node:path';
import {load, validate} from '../scripts/catalog.mjs';

const fixtures = [
  [
    "aider",
    ".aider.conf.yml"
  ],
  [
    "claude-code",
    ".claude/settings.json"
  ],
  [
    "cline",
    ".clinerules/project.md"
  ],
  [
    "continue",
    ".continue/rules/project.md"
  ],
  [
    "cursor",
    ".cursor/rules/frontend.mdc"
  ],
  [
    "devin-local",
    ".devin/rules/project.md"
  ],
  [
    "gemini-cli",
    ".gemini/settings.json"
  ],
  [
    "github-copilot",
    ".github/copilot-instructions.md"
  ],
  [
    "opencode",
    "opencode.json"
  ],
  [
    "openai-codex",
    ".codex/config.toml"
  ],
  [
    "roo-code",
    ".roo/rules/project.md"
  ],
  [
    "windsurf",
    ".windsurf/rules/project.md"
  ]
];
const matches = (rule, file) => rule.signals.some(signal =>
  signal.type === 'path' ? signal.path === file :
  signal.type === 'glob' ? matchesGlob(file, signal.pattern) : false
);

test('coding agents are detect-only technologies with matching rules', () => {
  const {c, m, l, d} = load();
  assert.equal(validate(c,m,l,d).detect_only,m.counts.detect_only_technologies);
  for (const [id,file] of fixtures) {
    const metadata = m.technologies.find(t => t.id === id);
    const rule = d.rules.find(r => r.technology_id === id);
    assert.ok(metadata, id + ' metadata missing');
    assert.ok(rule, id + ' rule missing');
    assert.equal(metadata.mapping_status, 'detect_only');
    assert.deepEqual(metadata.skill_ids, []);
    assert.equal(rule.mapping_status, 'detect_only');
    assert.equal(rule.logic, 'any');
    assert.ok(matches(rule,file), id + ' missing signal for ' + file);
  }
});

test('shared AGENTS.md does not impersonate any specific coding agent', () => {
  const {d} = load();
  for (const [id] of fixtures) {
    const rule = d.rules.find(r => r.technology_id === id);
    assert.equal(matches(rule,'AGENTS.md'), false, id + ' should not infer itself from AGENTS.md');
  }
});

test('agent signals avoid cross-detecting other agent-specific fixture files', () => {
  const {d} = load();
  for (const [id] of fixtures) {
    const rule = d.rules.find(r => r.technology_id === id);
    for (const [otherId,otherFile] of fixtures) {
      if (id !== otherId) assert.equal(matches(rule,otherFile),false,id + ' matched ' + otherFile);
    }
  }
});
