## 2025-05-20 - Fix Path Traversal and SQL Injection
**Vulnerability:** Path traversal in file upload/view endpoints and SQL injection in raw database queries.
**Learning:** Raw string interpolation in SQL queries and direct use of user-provided filenames in path joining are common but dangerous patterns.
**Prevention:** Always use `sql` tagged templates for raw queries and `path.basename()` for user-provided filenames.
