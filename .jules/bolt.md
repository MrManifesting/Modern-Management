## 2025-06-27 - Database-Level Aggregation for Inventory Stats
**Learning:** Performing inventory aggregations (counts and total value) in Node.js memory using O(N) filtering/reducing is a massive bottleneck for large catalogs. Offloading these to SQL aggregates (count, sum) with COALESCE/NULLIF for price fallbacks is significantly more efficient and maintains a constant O(1) processing time at the app level.
**Action:** Always check for O(N) in-memory aggregations on database collections and move them to SQL aggregates in the storage layer.
