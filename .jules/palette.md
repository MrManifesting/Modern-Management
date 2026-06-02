## 2025-06-13 - Global Search Shortcut and Accessibility Polish
**Learning:** Keyboard shortcut hints within input fields (e.g., Cmd+K) require responsive padding to avoid overlapping the hint text on smaller screens or creating empty space when the hint is hidden. Using `lg:pr-12` only when the `<kbd>` hint is visible (`lg:flex`) maintains a clean UI.
**Action:** Always sync the input's padding with the visibility breakpoints of the shortcut hint.
