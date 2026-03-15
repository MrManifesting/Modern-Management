## 2025-05-22 - Path Traversal Vulnerability in Upload and Menu Routes
**Vulnerability:** Path traversal vulnerability in several API endpoints (`/api/uploads/:filename`, `/api/view-menu/:menuId`) where user-provided parameters were directly joined with a base directory using `path.join()`. This could allow an attacker to read or write files outside the intended `uploads/` directory.
**Learning:** Even when some rudimentary URL validation exists in middleware, it's critical to sanitize file-related parameters at the point of use using robust utilities like `path.basename()`.
**Prevention:** Always use `path.basename()` on any user-influenced string that will be used in file system operations to ensure it contains only a filename and no directory traversal components.
