# Work log — self-discovery answer coverage checks

- Date: 2026-10-27
- Branch: `test/self-discovery-answer-contract-coverage-2026-10-27`, stacked on `work/self-discovery-multi-answer-reflection-2026-10-27` (PR #115).
- Change: extend the self-discovery contract script to parse the six questionnaire definitions and the reflection rule keys, then assert every non-`unsure` option has a corresponding answer-specific reflection rule.
- Why: previously the contract checked that each domain existed but could miss a newly added answer option that silently fell through to the generic result.
- Privacy/safety: test-only change; no runtime data handling, persistence, network calls, clinical claims, or provider changes.
- Verification: the assertion is committed but has not been executed locally in this session. CI must validate the regex/parser against the actual source and confirm the check passes.
- Follow-up: replace source parsing with executable unit tests once a TypeScript test runner is available.
