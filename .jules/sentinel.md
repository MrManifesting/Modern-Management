## 2025-05-04 - SQL Injection Risk with db.execute
**Vulnerability:** Raw SQL string interpolation in `db.execute()`.
**Learning:** Even when using Drizzle, `db.execute()` can be misused by passing a plain template string, which skips parameterization.
**Prevention:** Always use the `sql` template tag (e.g., `db.execute(sql`SELECT...`)) to ensure variables are treated as parameters.

## 2025-05-04 - Path Traversal in File Uploads and Servicing
**Vulnerability:** User-controlled parameters (`menuId`, `filename`, `originalname`) used directly in `path.join()` for filesystem operations.
**Learning:** Standard Express route parameters and `multer` filenames can contain `../` sequences if not sanitized, allowing access outside intended directories.
**Prevention:** Apply `path.basename()` to any user-provided component of a file path before joining it.
