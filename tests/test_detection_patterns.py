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


if __name__ == '__main__':
    unittest.main()
