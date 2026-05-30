## 2025-05-14 - Optimized Inventory Aggregations
**Learning:** Fetching full datasets for basic counts and sums creates O(N) memory and CPU bottlenecks. Offloading these to the database via SQL aggregations reduces the complexity to O(log N) or O(1) depending on indexes and significantly reduces the payload size between the DB and App server.
**Action:** Always check for existing bulk-fetch patterns in stats endpoints and replace them with DB-level aggregations (`count`, `sum`, `filter`).

## 2025-05-14 - Consistency in 'Active' Status
**Learning:** Different parts of the codebase might have slightly different definitions for 'active' states (e.g., 'active' vs 'available').
**Action:** When refactoring existing logic, ensure the new SQL-based filtering logic exactly matches the previous JavaScript-based filtering to avoid reporting regressions.
