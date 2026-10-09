# Guild-Sanctuary

Cross-platform social app for two connected worlds: The Sanctuary for spiritual growth and The Guild Hall for gaming and community.

Read [MASTER_BLUEPRINT.md](MASTER_BLUEPRINT.md) before making project changes. It records architecture rules, module ownership, verified progress, and the roadmap; keep it current as the codebase changes.

## Development

Requires Node.js 20.9 or newer.

```bash
npm install
npm run dev
```

Use `npm run build` to create a production build and `npm run start` to serve it.

## Architecture

- `src/types/index.ts` contains shared primitives; `src/types/database.ts` defines database entity contracts.
- `src/modules/` contains isolated feature modules. Each module owns its implementation and documents its scope in a local README.
- Modules should depend on shared types rather than importing implementation details from sibling modules.
- Keep the root app shell independent from feature implementations so a module can evolve without coupling unrelated features.