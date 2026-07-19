> **DEPRECATED / ASPIRATIONAL.** `@yeti/jobs` exists under `packages/jobs/src`
> as an interface (`JobProvider`) with no concrete implementation, and is
> never imported anywhere in `apps/mobile`, `apps/coach-dashboard`, or
> `supabase/functions` (confirmed by grep, 2026-07-19 documentation audit).
> Background-style work (push notification scheduling, etc.) is done directly
> in the mobile app or Edge Functions, not through a job-queue abstraction.
> Kept below for historical reference only.
>
> ---

# Job System

The `@yeti/jobs` package provides an abstraction over background queues.

## Current vs Future State
Currently, we may use Supabase Edge Functions with `pg_cron` or standard DB-polling workers. 
However, by coding strictly against the `JobProvider` interface, we can seamlessly migrate to AWS SQS, Temporal, or Google Cloud Tasks as Yeti scales, without modifying domain logic.

## Responsibility
Jobs should be used for:
- Delivering Notifications (retries on push notification failure)
- Scheduled AI Jobs (Sunday Weekly Reviews)
- Media Processing (Compression, thumbnail generation)
