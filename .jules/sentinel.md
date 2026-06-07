## 2026-06-07 - Fix SQL injection in item lookup
**Vulnerability:** SQL Injection in DatabaseStorage.getItem due to string interpolation in raw SQL query.
**Learning:** Even when using an ORM like Drizzle, falling back to raw SQL for "simplicity" or to avoid mapping issues can introduce severe vulnerabilities if string interpolation is used instead of the provided `sql` template literal.
**Prevention:** Always use the `sql` tagged template literal for any raw SQL execution in Drizzle to ensure proper parameterization.
