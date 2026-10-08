# Guild-Sanctuary

Cross-platform social app for two connected worlds: The Sanctuary for spiritual growth and The Guild Hall for gaming and community.

## Development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run start` to serve it.

## Architecture

- `src/types/index.ts` is the shared contract for data crossing feature boundaries.
- `src/modules/` contains isolated feature modules. Each module owns its implementation and documents its scope in a local README.
- Modules should depend on shared types rather than importing implementation details from sibling modules.
- Keep the root app shell independent from feature implementations so a module can evolve without coupling unrelated features.