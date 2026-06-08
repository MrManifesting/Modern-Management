## 2025-05-15 - SQL Injection and Path Traversal Fixes
**Vulnerability:** SQL Injection in `DatabaseStorage.getItem` and Path Traversal in `/api/uploads/:filename` route.
**Learning:** Raw SQL queries without parameterization are dangerous even when using an ORM like Drizzle. Additionally, serving files using user-provided filenames without sanitization allows for path traversal. Redundant backup files (`storage (copy).ts`) can also harbor vulnerabilities and should be removed.
**Prevention:** Always use parameterized queries (e.g., Drizzle's `sql` tagged template) and sanitize user-provided file paths using `path.basename()`. Regularly audit and remove redundant code artifacts.
