> **PARTIALLY ACCURATE — corrected 2026-07-19.** Item 2 below is true: the old
> `useOfflineSyncStore` really was removed (see the abandoned
> `scripts/migrate-repo.js`, which attempted to automate exactly this
> migration and was never finished — direct Supabase calls remain widespread).
> Item 3 mostly holds for the tables that are WatermelonDB-backed. **Item 1 is
> false**: there is no enforced rule against direct Supabase access. The
> entire coach dashboard, and many mobile screens, call `supabase.from()` /
> `supabase.functions.invoke()` directly and always have. See
> `docs/offline-sync.md` (rewritten in the same audit) for what's actually
> offline-first vs. direct-Supabase.
>
> ---

# Repository Pattern

All data access in the Yeti mobile app MUST flow through the Repository pattern to ensure separation of concerns and safely encapsulate the offline-first WatermelonDB sync logic.

## Allowed Flow
`Component` -> `Hooks (useRepositories)` -> `Repository Layer` -> `WatermelonDB`

## Prohibited Behaviors
1.  **Direct Supabase Access**: UI components must never import or call `supabase.from()` or `supabase.rpc()`.
2.  **Legacy State Management**: The old `useOfflineSyncStore` has been deprecated and completely removed. Do not re-introduce it.
3.  **Direct WatermelonDB Queries**: Do not import `@nozbe/watermelondb` directly into `app/` or `components/` files. Always use the provided repositories (`WorkoutRepository`, `UserRepository`, etc.).
