"""Check the proposed content patterns against representative source snippets.

The production scanner lives elsewhere; these tests do not exercise its file
discovery, regex engine, or project-scope behavior.
"""
import json
import re
import unittest
from pathlib import Path


RULES = json.loads((Path(__file__).resolve().parents[1] / 'data' /
                    'technology-detection-rules.json').read_text())['rules']


def pattern(technology, file_pattern):
    rule = next(r for r in RULES if r['technology_id'] == technology)
    return re.compile(next(s['regex'] for s in rule['signals']
                           if s['type'] == 'content' and s['path_glob'] == file_pattern))


class DetectionPatternTests(unittest.TestCase):
    def test_k6_imports_and_near_misses(self):
        for glob in ('*.js', '*.ts'):
            matcher = pattern('k6', glob)
            self.assertIsNotNone(matcher.search("import http from 'k6/http';"))
            self.assertIsNotNone(matcher.search('import { sleep } from "k6";'))
            self.assertIsNone(matcher.search("// import http from 'k6/http';"))
            self.assertIsNone(matcher.search("import http from 'k6-helper';"))

    def test_odoo_imports_and_near_misses(self):
        matcher = pattern('odoo', '*.py')
        self.assertIsNotNone(matcher.search('from odoo import models, fields'))
        self.assertIsNotNone(matcher.search('import odoo.api'))
        self.assertIsNone(matcher.search('# from odoo import models'))
        self.assertIsNone(matcher.search('import odoo_helper'))

    def test_quarkus_build_declarations_and_near_misses(self):
        maven = pattern('quarkus', 'pom.xml')
        self.assertIsNotNone(maven.search('<artifactId>quarkus-maven-plugin</artifactId>'))
        self.assertIsNone(maven.search('<artifactId>other-quarkus-plugin</artifactId>'))
        for glob in ('build.gradle', 'build.gradle.kts'):
            matcher = pattern('quarkus', glob)
            self.assertIsNotNone(matcher.search('implementation("io.quarkus:quarkus-arc")'))
            self.assertIsNone(matcher.search('implementation("io.example:quarkus-arc")'))


    def test_aspnetcore_web_sdk_and_near_misses(self):
        matcher = pattern('aspnetcore', '*.csproj')
        self.assertIsNotNone(matcher.search('<Project Sdk="Microsoft.NET.Sdk.Web">'))
        self.assertIsNotNone(matcher.search("<Project ToolsVersion='15.0' Sdk='Microsoft.NET.Sdk.Web'>"))
        self.assertIsNone(matcher.search('<Project Sdk="Microsoft.NET.Sdk">'))
        self.assertIsNone(matcher.search('<Project Sdk="Microsoft.NET.Sdk.Worker">'))

    def test_pytest_pyproject_section_and_near_misses(self):
        matcher = pattern('pytest', 'pyproject.toml')
        self.assertIsNotNone(matcher.search('[tool.pytest.ini_options]'))
        self.assertIsNotNone(matcher.search('  [tool.pytest.ini_options]  # pytest'))
        self.assertIsNone(matcher.search('[tool.pytest_other]'))
        self.assertIsNone(matcher.search('[tool.ruff]'))

    def test_existing_technology_structural_expansions(self):
        expected = {
            'docker': [
                ('glob', '**/Dockerfile'), ('glob', '**/Dockerfile.dev'),
                ('glob', '**/Dockerfile.prod'), ('path', 'compose.yaml'),
                ('path', 'compose.yml'), ('path', 'docker-compose.yaml'),
                ('path', 'docker-compose.yml')],
            'terraform': [('glob', '**/*.tf'), ('glob', '**/*.tf.json')],
            'helm': [('glob', '**/Chart.yaml')],
            'poetry': [('path', 'poetry.lock')],
            'pytest': [('path', 'pytest.ini')],
            'node': [('path', '.node-version')],
            'python': [('path', '.python-version')],
            'rust': [('path', 'rust-toolchain.toml'), ('path', 'rust-toolchain')],
            'kustomize': [('path', 'kustomization.yml'), ('glob', '**/kustomization.yml')],
            'playwright': [('path', 'playwright.config.mjs'),
                           ('path', 'playwright.config.mts'), ('path', 'playwright.config.cjs')],
            'vitest': [('path', 'vitest.config.mjs'), ('path', 'vitest.config.cjs'),
                       ('path', 'vitest.config.cts')],
            'eslint': [('path', 'eslint.config.ts'), ('path', '.eslintrc.cjs'),
                       ('path', '.eslintrc.yaml'), ('path', '.eslintrc.yml')],
        }
        for technology, requirements in expected.items():
            with self.subTest(technology=technology):
                rule = next(r for r in RULES if r['technology_id'] == technology)
                signals = {(s['type'], s.get('path', s.get('pattern')))
                           for s in rule['signals'] if s['type'] in ('path', 'glob')}
                for requirement in requirements:
                    self.assertIn(requirement, signals)



if __name__ == '__main__':
    unittest.main()
