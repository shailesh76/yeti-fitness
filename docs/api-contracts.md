> **DEPRECATED / ASPIRATIONAL.** `@yeti/types` exists under `packages/types`
> but is never imported anywhere in `apps/mobile`, `apps/coach-dashboard`, or
> `supabase/functions` (confirmed by grep, 2026-07-19 documentation audit).
> Types and payload shapes are declared inline/per-file where they're used
> instead of through a shared contracts package. Kept below for historical
> reference only.
>
> ---

# API Contracts

All shared API types and Zod schemas live in `@yeti/types`.

## Example: AI Workout Generation Request
```typescript
interface GenerateWorkoutRequest {
  athleteId: string;
  focusMuscleGroups: string[];
  availableEquipment: string[];
  timeAvailableMinutes: number;
  rpeTarget: number;
}
```

## Example: Nutrition Target Schema (Zod)
```typescript
import { z } from 'zod';

export const NutritionTargetSchema = z.object({
  calories: z.number().min(1000).max(10000),
  protein: z.number().min(0).max(500),
  carbs: z.number().min(0).max(1000),
  fat: z.number().min(0).max(500),
});
```

All interactions between the Client (Mobile/Web) and Edge Functions must validate payloads using these contracts.
