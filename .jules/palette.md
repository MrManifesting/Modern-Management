## 2025-05-15 - Enhanced Search Accessibility and Keyboard Shortcuts

**Learning:** Users often expect standard keyboard shortcuts like Cmd/Ctrl + K for search in modern web applications. Providing both a visual hint (`<kbd>`) and a screen reader label (`sr-only`) ensures the feature is discoverable and accessible for all users. Additionally, responsive padding on the search input is necessary to maintain layout integrity when the shortcut hint is visible.

**Action:** Always include keyboard shortcuts for primary navigation/search actions and ensure they are properly documented visually and via ARIA attributes.

## 2025-05-15 - Mobile Sidebar Accessibility

**Learning:** Icon-only buttons without explicit labels are a common accessibility barrier for screen reader users. In mobile views, the sidebar close button often lacks a text label.

**Action:** Ensure all icon-only buttons, especially in navigation components, have descriptive `aria-label` attributes.
