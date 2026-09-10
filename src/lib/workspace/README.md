# Workspace Panes

FlexLayout is the single source of truth for pane geometry, tab order, selection, and docking. `WorkspaceController` adapts that model to Openbase commands and maintains a separate in-memory navigation history and draft cache for each tab ID. Moving a tab never changes its ID. Layout undo/redo uses FlexLayout snapshots and preserves surviving tab views.

`WorkspaceSurface` renders registered content components. The `route` component currently uses the existing page routes, so new pages automatically work inside panes. Page-level `DashboardLayout` wrappers become content containers inside a pane; the window owns the single sidebar, top bar, and shared services. Report overlays and keyboard handlers are scoped to their pane.

The browser router and pane routers are siblings in the React tree. The docking surface is portalled into the shell's content element, giving each pane an independent router without nesting routers or depending on React Router internals. `WorkspaceUrlBridge` maps the focused resource to the browser address. Normal navigation replaces the focused tab's destination; only explicit open/split commands add tabs. No double-click behavior opens or preserves tabs.

Layout persistence is versioned and scoped to the backend and console base path. It stores resource paths and layout geometry, not drafts, auth tokens, or live connections. Invalid layouts fall back to a fresh workspace. Unfinished text is retained across tab switches and route changes during the session, marked in the tab header, and protected by close/unload confirmation. Narrow windows temporarily maximize the focused pane; the desktop arrangement is preserved, and the global view selector can focus any tab.

Thread views share one ref-counted connection per thread through `ThreadConnectionsProvider`. Content state and subscriptions do not belong to the layout engine. Native popout windows are disabled; supporting them later requires a window host and lifecycle policy, not new pane or tab models.
