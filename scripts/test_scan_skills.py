"""Offline integration tests for scan_skills.py: run `python -m unittest -v`."""
import json
from pathlib import Path
import subprocess
import sys
import tempfile
import unittest
import urllib.error
from types import SimpleNamespace
from unittest import mock

import scan_skills


class TestSkillScanner(unittest.TestCase):
    def test_backoff_only_for_transient_errors(self):
        attempts = []

        def flaky():
            attempts.append(True)
            if len(attempts) < 3:
                raise RuntimeError("HTTP/2 429 Too Many Requests")
            return "ok"

        with mock.patch.object(scan_skills.time, "sleep") as sleep:
            self.assertEqual("ok", scan_skills.retry_network(
                flaky, retries=4, base_delay=1, max_delay=30))
            self.assertEqual(2, sleep.call_count)

        with self.assertRaises(RuntimeError):
            scan_skills.retry_network(lambda: (_ for _ in ()).throw(
                RuntimeError("Repository not found")), retries=5, base_delay=0, max_delay=0)
        self.assertTrue(scan_skills.is_transient_error(
            urllib.error.HTTPError("https://example.org", 503, "busy", {}, None)))
        self.assertFalse(scan_skills.is_transient_error(
            urllib.error.HTTPError("https://example.org", 404, "missing", {}, None)))

    def test_catalog_http_cache(self):
        catalog = {"skills": [{"id": "alice/demo/test", "repository": "alice/demo", "skill_name": "test"}]}

        class FakeResponse:
            def __enter__(self):
                return self

            def __exit__(self, *args):
                return False

            def read(self, limit):
                return json.dumps(catalog).encode()

        with tempfile.TemporaryDirectory() as td:
            with mock.patch.object(scan_skills.urllib.request, "urlopen", return_value=FakeResponse()) as get:
                self.assertEqual(catalog, scan_skills.load_catalog(
                    "https://example.org/catalog.json", 10, cache_dir=Path(td)))
                self.assertEqual(catalog, scan_skills.load_catalog(
                    "https://example.org/catalog.json", 10, cache_dir=Path(td)))
                self.assertEqual(1, get.call_count)
            with mock.patch.object(scan_skills.urllib.request, "urlopen", side_effect=urllib.error.URLError("offline")):
                self.assertEqual(catalog, scan_skills.load_catalog(
                    "https://example.org/catalog.json", 10, cache_dir=Path(td),
                    refresh=True, retries=0))

    def test_remote_sparse_checkout_batch_fetch(self):
        """Blobless file:// remote: only SKILL.md blobs become locally available."""
        with tempfile.TemporaryDirectory() as td:
            root = Path(td)
            remote = root / "origin"
            remote.mkdir()
            subprocess.run(["git", "init", "-q", str(remote)], check=True)
            subprocess.run(["git", "-C", str(remote), "config", "user.email", "test@localhost"], check=True)
            subprocess.run(["git", "-C", str(remote), "config", "user.name", "Test"], check=True)
            subprocess.run(["git", "-C", str(remote), "config", "uploadpack.allowFilter", "true"], check=True)
            for name in ("alpha", "beta", "gamma", "a[1]"):
                folder = remote / "skills" / name
                folder.mkdir(parents=True)
                (folder / "SKILL.md").write_text(f"---\nname: {name}\n---\nUse Python and Docker\n")
            (remote / "unrelated.bin").write_bytes(b"x" * 100_000)
            subprocess.run(["git", "-C", str(remote), "add", "."], check=True)
            subprocess.run(["git", "-C", str(remote), "commit", "-qm", "fixture"], check=True)

            args = SimpleNamespace(local_repos=None, output=root / "out", refresh=False,
                fetch_mode="sparse", transport="https", retries=1, backoff=0, max_backoff=0,
                timeout=30, network_pacer=scan_skills.NetworkPacer(0), max_file_bytes=2_000_000,
                no_save_sources=False)
            with mock.patch.object(scan_skills, "git_remote_url", return_value=remote.as_uri()):
                clone = scan_skills.obtain_repo("alice/demo", args)
            self.assertEqual("true", scan_skills.git([
                "-C", str(clone), "config", "--get", "remote.origin.promisor"]).decode().strip())

            entries = scan_skills.tracked_skill_files(clone, 30)
            self.assertEqual(4, len(entries))
            other = scan_skills.git(["-C", str(remote), "rev-parse", "HEAD:unrelated.bin"]).decode().strip()
            with self.assertRaises(RuntimeError):
                scan_skills.git(["-C", str(clone), "cat-file", "-e", entries[0][1]], no_lazy_fetch=True)

            scan_skills.materialize_skill_blobs("alice/demo", clone, entries, args)
            for name, oid in entries:
                self.assertIn("Docker", scan_skills.read_git_blob(clone, oid, 30, 2_000_000))
                self.assertTrue((clone / name).is_file())
            with self.assertRaises(RuntimeError):
                scan_skills.git(["-C", str(clone), "cat-file", "-e", other], no_lazy_fetch=True)
            self.assertFalse((clone / "unrelated.bin").exists())

            # Reusing a cached clone must not re-download or lose already fetched blobs.
            with mock.patch.object(scan_skills, "git_remote_url", side_effect=AssertionError("reclone")):
                self.assertEqual(clone, scan_skills.obtain_repo("alice/demo", args))

            # A failed refresh must preserve the already usable cache.
            args.refresh = True
            with mock.patch.object(scan_skills, "git_remote_url", return_value=(root / "absent").as_uri()):
                with self.assertRaises(RuntimeError):
                    scan_skills.obtain_repo("alice/demo", args)
            args.refresh = False
            self.assertEqual(clone, scan_skills.obtain_repo("alice/demo", args))
            self.assertTrue((clone / "skills" / "alpha" / "SKILL.md").exists())

    def test_sparse_pattern_escapes_gitignore_metacharacters(self):
        self.assertEqual("/skills/a\\[1\\]/SKILL.md", scan_skills.sparse_pattern("skills/a[1]/SKILL.md"))
        with self.assertRaises(ValueError):
            scan_skills.sparse_pattern("../SKILL.md")

    def test_evidence_and_automatic_detection(self):
        sample = """---
name: browser-testing-with-devtools
---
Set up Chrome DevTools MCP with `npx -y chrome-devtools-mcp@latest`.
Write `.mcp.json` with mcpServers.
```bash
npm install playwright
```
Playwright is an option, but not installed by this document.
"""
        results = {t["technology"]: t for t in scan_skills.scan_text(sample)}
        self.assertIn("Chrome DevTools MCP", results)
        self.assertIn("MCP", results)
        self.assertIn("Playwright", results)
        self.assertIn("npm", results)
        self.assertEqual("integration_signal", results["npm"]["classification"])
        self.assertEqual("mentioned", results["Playwright"]["classification"])
        self.assertEqual("browser-testing-with-devtools", scan_skills.frontmatter_name(sample))

    def test_complete_local_catalog(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            local = root / "local"
            a = local / "alice" / "multi"
            b = local / "bob" / "single"
            for repo in (a, b):
                repo.mkdir(parents=True)
                subprocess.run(["git", "init", "-q", str(repo)], check=True)
                subprocess.run(["git", "-C", str(repo), "config", "user.name", "Example"], check=True)
                subprocess.run(["git", "-C", str(repo), "config", "user.email", "example@localhost"], check=True)
            (a / "skills" / "web-check").mkdir(parents=True)
            (a / "skills" / "web-check" / "SKILL.md").write_text("---\nname: web-check\n---\nUse Playwright and run `npm install playwright`.\n")
            (a / "skills" / "db-check").mkdir(parents=True)
            (a / "skills" / "db-check" / "SKILL.md").write_text("---\nname: db-check\n---\nPostgreSQL via psql -d demo.\n")
            (a / "docs").mkdir()
            (a / "docs" / "skill.md").write_text("---\nname: unmatched\n---\nUses Docker.\n")
            (a / "package.json").write_text('{"dependencies":{"playwright":"1.0.0"}}')
            (b / "SKILL.md").write_text("The CLI uses Docker and GitHub Actions.\n")
            for repo in (a, b):
                subprocess.run(["git", "-C", str(repo), "add", "."], check=True)
                subprocess.run(["git", "-C", str(repo), "commit", "-qm", "fixture"], check=True)
            catalog = {"schema_version": 1, "count": 4, "snapshot_date": "2026-11-01", "skills": [
                {"id": "alice/multi/web-check", "repository": "alice/multi", "skill_name": "web-check"},
                {"id": "alice/multi/db-check", "repository": "alice/multi", "skill_name": "db-check"},
                {"id": "alice/multi/missing", "repository": "alice/multi", "skill_name": "missing"},
                {"id": "bob/single/something", "repository": "bob/single", "skill_name": "something"},
            ]}
            catfile = root / "catalog.json"
            catfile.write_text(json.dumps(catalog))
            out = root / "out"
            proc = subprocess.run([sys.executable, str(Path(scan_skills.__file__)), "--catalog", str(catfile),
                                   "--output", str(out), "--local-repos", str(local), "--workers", "2"],
                                  check=True, capture_output=True, text=True)
            summary = json.loads((out / "run_summary.json").read_text())
            self.assertEqual(4, summary["requested_skills"])
            self.assertEqual(4, summary["skill_documents_scanned"])
            self.assertEqual(3, summary["catalog_skills_by_status"]["matched"])
            self.assertEqual(1, summary["catalog_skills_by_status"]["not_found"])
            rows = [json.loads(s) for s in (out / "catalog_scans.jsonl").read_text().splitlines()]
            self.assertEqual("skills/web-check/SKILL.md", rows[0]["source_path"])
            self.assertEqual("skills/db-check/SKILL.md", rows[1]["source_path"])
            self.assertEqual("SKILL.md", rows[3]["source_path"])
            self.assertTrue((out / "sources" / "alice" / "multi" / "docs" / "skill.md").exists())
            signals = [json.loads(s) for s in (out / "repository_signals.jsonl").read_text().splitlines()]
            self.assertTrue(any(x["technology"] == "Node.js" for x in signals[0]["project_signals"]))


if __name__ == "__main__":
    unittest.main()
