## 2026-05-23 - Offload inventory aggregations to Database
**Learning:** In large-scale inventory systems, fetching all items into memory to calculate simple statistics like total count or total value creates an O(N) bottleneck in both memory and CPU. Offloading these calculations to the database using SQL aggregations (count, sum) reduces the complexity to O(1) in terms of application-layer processing and significantly reduces data transfer.
**Action:** Always prioritize database-level aggregations for summary statistics and dashboard widgets to ensure scalability as the inventory grows.
