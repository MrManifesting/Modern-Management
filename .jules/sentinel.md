## 2025-05-15 - SQL Injection in Raw Database Execution

**Vulnerability:** SQL injection in `DatabaseStorage.getItem` where `db.execute()` used string interpolation instead of parameterization.
**Learning:** Even when using an ORM like Drizzle, "escape hatches" like raw SQL execution can reintroduce classic vulnerabilities if not handled with care (e.g., using the `sql` tagged template literal). Redundant backup files like `server/storage (copy).ts` can persist these vulnerabilities and should be removed.
**Prevention:** Always use the ORM's query builder or, when raw SQL is necessary, use the provided `sql` tag for parameterization. Implement a CI check or lint rule to flag string interpolation inside `db.execute()`. Clean up redundant source files to maintain a clear security boundary.
