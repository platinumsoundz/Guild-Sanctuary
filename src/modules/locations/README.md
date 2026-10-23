# Locations

Experimental module for location preferences and radius-based distance filtering for nearby people, posts, and meetups. `RadiusFilterPlaceholder` is a presentational control only; it is **not mounted** in the active shell and has no durable location store.

Keep geospatial calculations and radius filtering logic inside this module. Use shared location and coordinate contracts from `src/types`; do not depend on sibling module internals. Before activating it, define consent and retention rules for precise location, add server-side geospatial queries, and test privacy boundaries.
