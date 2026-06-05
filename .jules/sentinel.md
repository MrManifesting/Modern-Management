## 2025-05-15 - Path Traversal Vulnerabilities in File Handling Endpoints
**Vulnerability:** Several endpoints in `server/routes.ts` and `server/services/telegram.ts` were using user-provided filenames or IDs directly in `path.join()` without sanitization, allowing for potential directory traversal attacks.
**Learning:** Even when using `path.join()`, user-controlled strings can contain `../` sequences that escape the intended base directory. Validating the prefix (e.g., `startsWith('menu-')`) is insufficient if the string is later used as a path component.
**Prevention:** Always use `path.basename()` on user-provided input that will be used to construct a file system path. This ensures only the filename part is used and any directory components are stripped.
