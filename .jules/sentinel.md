## 2026-05-01 - Path Traversal in File Handling Endpoints
**Vulnerability:** User-provided filenames and IDs were used directly in `path.join()` without sanitization, leading to potential path traversal vulnerabilities.
**Learning:** Endpoints that handle file uploads or downloads using dynamic parameters from requests (like `:filename` or `:menuId`) are prime targets for directory traversal if not sanitized with `path.basename()`.
**Prevention:** Always use `path.basename()` on any user-controlled input before using it to construct file paths on the server.
