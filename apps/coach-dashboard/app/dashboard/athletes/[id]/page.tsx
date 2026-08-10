import { redirect } from 'next/navigation';

/**
 * Legacy duplicate of the athlete detail screen. Nothing ever linked here — all
 * navigation (dashboard inbox, dashboard roster, athletes table) points at
 * /dashboard/{id}, which is the canonical route. This used to render a static
 * placeholder athlete with a fabricated strength chart and an invented score,
 * and ignored its own :id param entirely, so anyone who reached it by typing a
 * URL saw made-up data attributed to a real athlete.
 *
 * Kept as a redirect rather than deleted so existing links/bookmarks resolve to
 * the real athlete instead of 404ing.
 */
export default function LegacyAthleteDetailRedirect({ params }: { params: { id: string } }) {
  redirect(`/dashboard/${params.id}`);
}
