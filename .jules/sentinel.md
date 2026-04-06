## 2025-05-22 - Path Traversal in File Operations
**Vulnerability:** User-controlled parameters (like `req.params.filename` or `req.file.originalname`) were used directly in `path.join('uploads', ...)` without sanitization, allowing attackers to access or overwrite files outside the intended directory using `../` patterns.
**Learning:** Even with basic validation (like checking if a string starts with a prefix), `path.join` will resolve `../` segments, which can bypass directory restrictions.
**Prevention:** Always use `path.basename()` on user-provided path components before joining them to a base directory to strip away any directory traversal characters.
