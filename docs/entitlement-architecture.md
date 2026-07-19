> **DEPRECATED / ASPIRATIONAL.** `@yeti/entitlements` and its `EntitlementService`
> exist under `packages/entitlements/src` but are never imported anywhere in
> `apps/mobile`, `apps/coach-dashboard`, or `supabase/functions` (confirmed by
> grep, 2026-07-19 documentation audit). It also queries `beta_mode_config`,
> `plan_features`, and `entitlement_history` — tables that were never applied
> to the live database (see `docs/migration-audit.md`). The real entitlements
> logic lives directly in the `manage-entitlements` Edge Function and the
> `user_entitlements` table, with no shared package abstraction. Kept below
> for historical reference only.
>
> ---

# Entitlement Architecture

Yeti's revenue logic is abstracted behind the `@yeti/entitlements` package.

## Principles
1. **Never call RevenueCat directly**: The application code must never know about RevenueCat, Stripe, or Apple Store receipt formats.
2. **Feature Flags vs Entitlements**: 
    - `Feature Flags` dictate if code executes based on rollout percentages or beta testing.
    - `Entitlements` dictate if a user is legally/financially allowed to access a feature.

## Implementation
```typescript
import { EntitlementService } from '@yeti/entitlements';
const hasAccess = await EntitlementService.canAccessFeature(user.id, 'ai_coach');
```
