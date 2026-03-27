# Sentinel Security Journal

## 2025-05-22 - Path Traversal in File Operations
**Vulnerability:** User-controlled input (menuId, filename, originalname) was used directly in `path.join('uploads', ...)` in `server/routes.ts`.
**Learning:** Even with existing security middleware (`server/middleware/security.ts`), endpoints that handle direct file system access are still vulnerable if they don't explicitly sanitize input with `path.basename()`.
**Prevention:** Always use `path.basename()` on any user-provided string that will be used to construct a file path, even if it has passed through general URL pattern validation.
