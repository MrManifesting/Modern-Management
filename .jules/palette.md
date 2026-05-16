## 2025-06-13 - Enhanced Search Discoverability and Accessibility
**Learning:** Adding standard keyboard shortcuts (like Cmd/Ctrl + K) significantly improves UX for power users, but they must be accompanied by a visual hint to be discoverable. Using `group-focus-within` on a parent container allows for elegant UI transitions (e.g., hiding the shortcut hint when the input is focused) without complex state management.
**Action:** Always include a visual shortcut hint (using `<kbd>`) and a visually hidden label (`sr-only`) when implementing keyboard-driven features.
