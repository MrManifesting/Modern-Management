# Sentinel's Journal - Critical Security Learnings

## 2025-05-15 - Path Traversal Vulnerabilities in File Operations
**Vulnerability:** User-provided parameters (`menuId`, `filename`, and `req.file.originalname`) were used directly in `path.join()` without sanitization, allowing potential path traversal attacks to access or manipulate files outside the intended `uploads/` directory.
**Learning:** Even with format validation (like checking if `menuId` starts with `menu-`), attackers can use sequences like `menu-../../etc/passwd` to bypass simple prefix checks and traverse the filesystem.
**Prevention:** Always use `path.basename()` on user-provided components of a file path before joining them to a base directory. This ensures that only the final part of the path is used, effectively neutralizing any traversal sequences.
