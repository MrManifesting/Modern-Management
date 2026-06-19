## 2025-06-19 - SQL Injection in Raw Queries
**Vulnerability:** A critical SQL injection vulnerability was found in `server/storage.ts` where user-provided `id` was directly interpolated into a raw `db.execute()` string.
**Learning:** Even when using an ORM like Drizzle, falling back to raw queries for "simplicity" or to avoid mapping issues can introduce severe security risks if standard parameterization isn't used.
**Prevention:** Always use the ORM's built-in query builder or the `sql` tagged template literal for any raw database operations to ensure inputs are properly escaped.

## 2025-06-19 - Path Traversal in File Operations
**Vulnerability:** Multiple endpoints in `server/routes.ts` and functions in `server/services/telegram.ts` were using user-provided filenames and IDs to construct file paths without sanitization.
**Learning:** Using `path.join()` with unsanitized user input is insufficient to prevent path traversal; attackers can use `../` to access files outside the intended directory.
**Prevention:** Always apply `path.basename()` to user-provided file identifiers before using them in path construction to strip directory traversal components.
