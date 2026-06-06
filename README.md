# @openbase/coder-react

Shared React UI package for Openbase Coder.

This package contains the reusable application shell, pages, hooks, shared UI components, plugin registry helpers, and CSS used by the Openbase Coder browser console and desktop app. It is consumed from the workspace as `@openbase/coder-react`.

## Usage

The package is intended to be used from the Openbase Coder workspace:

```json
{
  "dependencies": {
    "@openbase/coder-react": "workspace:*"
  }
}
```

The browser console and desktop renderer import the shared app entry points:

```tsx
import App from "@openbase/coder-react/App";
import { PluginRegistryProvider } from "@openbase/coder-react/plugin-registry";
import "@openbase/coder-react/index.css";
```

## Exports

- `@openbase/coder-react/App`: the shared Openbase Coder React app and routes.
- `@openbase/coder-react/plugin-registry`: plugin registry provider, resolver, and plugin view types.
- `@openbase/coder-react/index.css`: shared Tailwind and app styles.

## Related Packages

- `console`: browser-hosted Openbase Coder frontend.
- `desktop`: Electron desktop shell for Openbase Coder.
- `multi-react`: shared diff viewer utilities.
- `boilersync-react`: shared BoilerSync template UI utilities.

## License

AGPL-3.0-only
