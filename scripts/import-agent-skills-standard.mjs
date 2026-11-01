#!/usr/bin/env node
/**
 * Index the verified upstream agent-skills-standard snapshot in Nosey's built-in catalog.
 * Read SKILL.md files for identity and provenance only: never execute upstream content.
 * This intentionally does not create automatic technology recommendations.
 */
import {execFileSync} from 'node:child_process';
import {mkdtempSync, mkdirSync, readdirSync, lstatSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative, resolve, sep} from 'node:path';
import {fileURLToPath} from 'node:url';

const ROOT = fileURLToPath(new URL('..', import.meta.url));
const REPO = 'HoangNguyen0403/agent-skills-standard';
const SHA = 'a5465a69cdcf3210ca37c10a435ae66a401eb4fb';
const EXPECTED_SKILLS = 338;
const sourceRoot = 'skills/';

function git(cwd, ...args) {
  return execFileSync('git', args, {cwd, encoding: 'utf8', timeout: 120000}).trim();
}

function walk(directory, results = []) {
  for (const item of readdirSync(directory, {withFileTypes: true})) {
    const path = join(directory, item.name);
    const info = lstatSync(path);
    if (info.isSymbolicLink()) throw Error('Refusing upstream symlink: ' + path);
    if (info.isDirectory()) walk(path, results);
    else if (info.isFile() && item.name === 'SKILL.md') results.push(path);
  }
  return results;
}

function readJson(name) {
  return JSON.parse(readFileSync(resolve(ROOT, 'data', name), 'utf8'));
}

function writeJson(name, object) {
  writeFileSync(resolve(ROOT, 'data', name), JSON.stringify(object, null, 2) + '\n');
}

function skillFrontmatterName(file) {
  const content = readFileSync(file, 'utf8');
  if (!content.startsWith('---\n') && !content.startsWith('---\r\n')) {
    throw Error('Missing SKILL.md frontmatter: ' + file);
  }
  const frontmatter = content.replaceAll('\r\n', '\n').split('\n---\n')[0];
  const match = frontmatter.match(/^name:\s*(.+?)\s*$/m);
  if (!match) throw Error('Missing skill name: ' + file);
  let name = match[1].replace(/\s+#.*$/, '').trim();
  if ((name.startsWith('"') && name.endsWith('"')) ||
      (name.startsWith("'") && name.endsWith("'"))) name = name.slice(1, -1);
  if (!name) throw Error('Empty skill name: ' + file);
  return name;
}

function main() {
  const temporary = mkdtempSync(join(tmpdir(), 'nosey-skill-import-'));
  try {
    const checkout = join(temporary, 'upstream');
    mkdirSync(checkout);
    git(checkout, 'init', '--quiet');
    git(checkout, 'remote', 'add', 'origin', 'https://github.com/' + REPO + '.git');
    git(checkout, 'fetch', '--quiet', '--depth', '1', 'origin', SHA);
    git(checkout, 'checkout', '--quiet', '--detach', 'FETCH_HEAD');
    if (git(checkout, 'rev-parse', 'HEAD') !== SHA) throw Error('Upstream revision mismatch');

    const license = readFileSync(join(checkout, 'LICENSE'), 'utf8');
    if (!license.includes('MIT License')) throw Error('Expected upstream MIT license');

    const files = walk(join(checkout, 'skills')).sort();
    if (files.length !== EXPECTED_SKILLS) {
      throw Error('Expected ' + EXPECTED_SKILLS + ' pinned upstream skills, found ' + files.length);
    }

    const catalog = readJson('catalog.json');
    const ledger = readJson('catalog-source-ledger.json');
    const mappings = readJson('mappings.json');
    const existingIds = new Set(catalog.skills.map(s => s.id.toLowerCase()));
    const existingNames = new Set(catalog.skills.map(s => s.repository.toLowerCase() + '/' + s.skill_name.toLowerCase()));
    const existingLedger = new Map(ledger.entries.map(e => [e.id.toLowerCase(), e]));
    const pathIdentity = url => {
      const match = url?.match(/^https:\/\/github\.com\/([^/]+\/[^/]+)\/blob\/[a-f0-9]{40}\/(.+)$/);
      return match ? (match[1] + '/' + match[2]).toLowerCase() : null;
    };
    const sourcePaths = new Set(ledger.entries.filter(e => e.status === 'verified').map(e => pathIdentity(e.url)).filter(Boolean));

    const verifiedAt = new Date().toISOString();
    let added = 0;
    for (const file of files) {
      const upstreamPath = relative(checkout, file).split(sep).join('/');
      if (!upstreamPath.startsWith(sourceRoot) || !upstreamPath.endsWith('/SKILL.md')) {
        throw Error('Unexpected source path: ' + upstreamPath);
      }
      const parts = upstreamPath.split('/');
      if (parts.length !== 4) throw Error('Unexpected skill nesting: ' + upstreamPath);
      const name = parts[2];
      const frontmatterName = skillFrontmatterName(file);
      const id = REPO + '/' + name;
      const url = 'https://github.com/' + REPO + '/blob/' + SHA + '/' + upstreamPath;
      const identity = (REPO + '/' + upstreamPath).toLowerCase();
      if (existingIds.has(id.toLowerCase())) {
        const entry = existingLedger.get(id.toLowerCase());
        if (!entry || entry.status !== 'verified' || entry.url !== url) {
          throw Error('Existing skill ID conflicts with pinned upstream: ' + id);
        }
        continue;
      }
      const nameIdentity = (REPO + '/' + name).toLowerCase();
      if (existingNames.has(nameIdentity) || sourcePaths.has(identity)) {
        throw Error('Duplicate upstream skill: ' + id);
      }
      existingIds.add(id.toLowerCase());
      existingNames.add(nameIdentity);
      sourcePaths.add(identity);
      catalog.skills.push({
        id,
        repository: REPO,
        skill_name: name,
        skill_md_url: null,
        recommended_for: {technology_ids: [], combination_ids: [], frontend_essential: false},
      });
      const evidence = {id, status: 'verified', checked_at: verifiedAt, url, commit: SHA};
      if (frontmatterName !== name) evidence.source_skill_name = frontmatterName;
      ledger.entries.push(evidence);
      added++;
    }

    if (added) {
      const date = verifiedAt.slice(0, 10);
      catalog.skills.sort((a, b) => a.id.localeCompare(b.id));
      ledger.entries.sort((a, b) => a.id.localeCompare(b.id));
      catalog.counts.distinct_skills = catalog.skills.length;
      mappings.counts.distinct_referenced_skills = catalog.skills.length;
      catalog.snapshot_date = date;
      mappings.snapshot_date = date;
      ledger.audited_at = verifiedAt;
      ledger.unresolved_count = ledger.entries.filter(e => e.status === 'unresolved').length;
      catalog.source += '; ' + date + ' pinned agent-skills-standard develop import';
      writeJson('catalog.json', catalog);
      writeJson('catalog-source-ledger.json', ledger);
      writeJson('mappings.json', mappings);
    }
    if (catalog.skills.filter(s => s.repository.toLowerCase() === REPO.toLowerCase()).length !== EXPECTED_SKILLS) {
      throw Error('Imported skill count does not match pinned upstream');
    }
    console.log('Indexed ' + added + ' new source-verified skills (' + catalog.skills.length + ' total).');
  } finally {
    rmSync(temporary, {recursive: true, force: true});
  }
}

main();
