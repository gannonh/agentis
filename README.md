# shadcn/ui monorepo template

This is a Vite monorepo template with shadcn/ui.

## Adding components

To add components to your app, run the following command at the root of your `web` app:

```bash
pnpm dlx shadcn@latest add button -c apps/web
```

This will place the ui components in the `packages/ui/src/components` directory.

## Using components

To use the components in your app, import them from the `ui` package.

```tsx
import { Button } from "@workspace/ui/components/button";
```

## Switching presets

When you're working on a new app, it can take a few tries to find something you like so we've made switching presets really easy. Run init --preset in your app, and the CLI will take care of reconfiguring everything, including your components.

`pnpm dlx shadcn@latest init --preset ad3qkJ7`
