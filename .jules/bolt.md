## 2026-06-15 - Inventory Summary Optimization
**Learning:** Performing in-memory aggregations on large datasets (like inventory) is a major bottleneck. Offloading these to the database using SQL `count` and `sum` significantly reduces memory usage and improves response time from O(N) to O(1) from the application's perspective.
**Action:** Always prefer database-level aggregations for statistics and summary endpoints. Centralize these in the storage layer to ensure consistency and facilitate caching.
