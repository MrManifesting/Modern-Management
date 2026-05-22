## 2025-05-15 - Offload Aggregations to Database
**Learning:** Performing inventory stats calculations (count, sum) in-memory by fetching all items from the database is a significant bottleneck as the dataset grows. Moving these calculations to the database level using SQL aggregation (`count`, `filter`, `sum`) reduces network overhead and memory consumption in the application process.
**Action:** Always prioritize database-level aggregations for summary data rather than fetching full records and processing them in the application code.
