## 2025-06-03 - Path Traversal in File Operations
**Vulnerability:** User-provided filenames in `req.file.originalname` and `req.params.filename` were used directly in `path.join()`, allowing for potential path traversal attacks.
**Learning:** File system operations that use user-provided parameters must always be sanitized using `path.basename()` to prevent attackers from accessing or creating files outside the intended directory.
**Prevention:** Establish a pattern of using `path.basename()` on all user-controlled components of a file path before passing them to `path.join()` or other FS functions.

## 2025-06-03 - SQL Injection in Raw Queries
**Vulnerability:** A raw SQL query in `server/storage.ts` used string interpolation with a user-provided ID, creating a potential SQL injection risk.
**Learning:** Even when input is expected to be a number, using the `sql` tagged template literal from Drizzle ORM ensures that parameters are properly handled and escaped by the database driver.
**Prevention:** Always use the `sql` tagged template for any raw queries executed via `db.execute()`, and avoid direct string interpolation in SQL strings.
