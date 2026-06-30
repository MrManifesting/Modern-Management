## 2026-06-30 - Caching Enhanced Inventory Endpoint
**Learning:** The `/api/inventory/enhanced` endpoint performs intensive regex-based transformations and multi-criteria sorting on the entire inventory dataset. This computation was repeated for every request, creating a significant CPU bottleneck.
**Action:** Implemented a 30-second in-memory cache using existing `getCachedData` and `setCachedData` helpers to mitigate the impact of these expensive operations.
