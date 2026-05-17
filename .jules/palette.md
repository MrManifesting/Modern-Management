## 2025-06-13 - Enhance Search Accessibility and Shortcuts

**Learning:** When adding keyboard shortcut hints (like ⌘K) to input fields, it's crucial to make the padding adjustments conditional on the visibility of the hint to avoid awkward empty spaces on smaller screens. Additionally, for accessibility, combining a visually hidden label (`sr-only`) with an `aria-label` is redundant; a single clear label is preferred.

**Action:** Use responsive utility classes (e.g., `lg:pr-10`) to align input padding with visible elements and stick to one semantic labeling method for screen readers.
