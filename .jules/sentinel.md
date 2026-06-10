## 2025-05-15 - [Path Traversal in File Serving Routes]
**Vulnerability:** Path traversal via unsanitized URL parameters in file-serving routes (`/api/uploads/:filename` and `/api/view-menu/:menuId`).
**Learning:** Using user-provided input directly in `path.join()` without sanitization allows attackers to use `../` sequences to access files outside the intended directory. In this codebase, dynamic imports of `fs` and `path` inside routes were common, but didn't include defensive sanitization.
**Prevention:** Always wrap user-provided path components with `path.basename()` before joining them to a base directory to ensure only the filename is used and directory navigation is impossible.
