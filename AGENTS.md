# Testing rule

- Run only focused unit tests for code changes by default (`npm test -- --runInBand` when the small unit suite is relevant).
- Do not start Docker or run tests through Docker. Do not run integration, end-to-end, database, or smoke tests unless the user explicitly asks for them.
- If the relevant behavior has no unit test, add a meaningful unit test where practical or report the gap. Do not substitute a Docker-based test.
