## 2025-05-15 - Initial Audit
**Learning:** The application uses many icon-only buttons and interactive elements (Cards, Headers) that lack proper ARIA labels and keyboard navigation support, making it difficult for screen reader and keyboard-only users to navigate the inventory.
**Action:** Systematically add aria-labels to icon-only buttons and ensure interactive containers have appropriate roles and keyboard event handlers.
