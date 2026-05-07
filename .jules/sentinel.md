## 2025-05-07 - Path Traversal in File Serving Routes
**Vulnerability:** User-provided filenames and IDs were directly used in `path.join('uploads', ...)` without sanitization, allowing potential path traversal attacks (e.g., `../../../etc/passwd`).
**Learning:** Even when using `path.join`, if the base directory is intended to be a sandbox, the user-controlled component must be sanitized with `path.basename()` to ensure it doesn't contain directory traversal sequences.
**Prevention:** Always wrap user-provided path components in `path.basename()` before joining them to a local directory path for file system operations.
