## 2026-06-29 - SQL Aggregation for Inventory Metrics
**Learning:** Performing inventory metric calculations (count, sum) in-memory by fetching all items from the database creates an O(N) bottleneck that scales poorly with inventory size. Using SQL aggregations (`count`, `sum`, `sql`) offloads these calculations to the database engine, reducing network payload and memory usage significantly.
**Action:** Always prefer database-level aggregations for summary statistics and metrics instead of application-level reduction.
