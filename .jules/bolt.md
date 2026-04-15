## 2025-05-15 - [Database Aggregation vs In-Memory Processing]
**Learning:** Performing aggregations (count, sum) in-memory on large datasets (O(N)) creates significant memory pressure and latency. Offloading these to the database (O(1) from app perspective) is significantly more efficient as the dataset grows.
**Action:** Always check for opportunities to use Drizzle's `count()`, `sum()`, and `sql` helpers for dashboard-style summaries instead of fetching all records.
