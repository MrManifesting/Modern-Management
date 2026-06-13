## 2026-06-13 - SQL Aggregation for Inventory Summary
**Learning:** Using database-level aggregations (sql`count(*) filter (where ...)`) and COALESCE logic for multi-field fallbacks avoids fetching thousands of rows into application memory, which is critical for inventory systems with large catalogs.
**Action:** Always check for O(N) memory bottlenecks in stats/summary routes and offload to DB aggregations where possible.
