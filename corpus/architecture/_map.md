# architecture

Cross-cutting system logic — how data flows and stays in sync.

- [[data-flow]] — server data is a named cache; a write owns marking its own data stale ⚠️
- [[layering]] — a finished animation still traps the popovers inside it ⚠️
- [[dialog-card]] — `layout-kit/dialog-card` owns its scrolling body, toolbar row, and content-grid padding, so call sites stop hand-rolling them ⚠️
- [[draft-pattern]] — `useDraft` is the shared shape behind every editor that stages changes before deciding whether to save them
- [[responsive]] — how the app asks "is this a small screen?"; the short vocabulary every screen shares
