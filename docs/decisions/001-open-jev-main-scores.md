# Open JEV owns canonical model scores

Status: accepted. Date: 2026-11-03.

The user chose to replace existing model scores with Open JEV rather than retain
multiple evaluators or average their outputs. Its typed class scores, confidence
and excerpt input differ from the previous SDK Jev results, so canonical scores
use schema v3 with an explicit `open_jev_scores` result kind.

`data/scores.json` is the only maintained score report. The Open JEV action
produces it through reviewed incremental/bulk workflow PRs. Old evaluators require
explicit alternate outputs and cannot write the canonical path. Format migration
preserves the original inference fingerprint, keeping saved Open JEV results valid.

The initial migration used eight scores. The completed report from
[PR #47](https://github.com/rigerc/skills-catalog/pull/47), commit
`e54886ce3e678a922ca0aa196c04de8a1dfd3184`, supplies all 867 current evaluations;
its completed 14-batch progress ledger is retained. Old provider scores remain in
Git history, not as a production fallback. Open JEV now supplies
normal score display, filters, sorting and repository means. No calibration claim
is added, and static quality eligibility remains independent.

Manifest v1.1 preserves the existing primary `evaluation` fields and retains
`open_jev` as a deprecated alias sourced from the same report. This avoids removing
a field existing consumers may read. The old alias's ranking flag does not govern
the primary evaluation. Strict score consumers must adopt the v3 schema.

Workflow writers share a concurrency group and progress branch. Resume restores
only report/progress data onto current scripts and source pins; explicit push
leases and base checks reject conflicting changes. Source-update PRs refresh
coverage offline so they remain compatible with canonical CI checks.

Implementation, compatibility and verification details: [score documentation](../quality.md).
