# Guild & Sanctuary - Master Architectural Blueprint

## Core Architecture Rules (Master-Child / Modular System)
1. **Isolated Modules:** Every major feature must live in its own independent folder inside `/src/modules/` (e.g., `/modules/auth`, `/modules/profiles`, `/modules/events`, `/modules/locations`, `/modules/feeds`).
2. **Independent Failure:** A bug or syntax error in one module (e.g., Events) must never break or crash the root system or other modules. 
3. **Shared Contracts:** All cross-module data types must reference a central type file at `/src/types/index.ts`.
4. **Zero Bloat & Free-First:** Keep the core features free. Optional cosmetics or paid extensions must be handled via modular add-on flags, not core locks.