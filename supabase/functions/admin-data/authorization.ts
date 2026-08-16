export const ADMIN_HEALTH_ACTIONS = new Set(['system_errors', 'ai_logs'])

export function authorizeAdminDataAction(role: string | null, action: string | null) {
  if (!role) return { allowed: false, status: 401, error: 'Unauthenticated' }
  if (role !== 'admin' && role !== 'coach') return { allowed: false, status: 403, error: 'Forbidden: coach or admin required' }
  if (action && ADMIN_HEALTH_ACTIONS.has(action) && role !== 'admin') {
    return { allowed: false, status: 403, error: 'Forbidden: admin required for health telemetry' }
  }
  return { allowed: true, status: 200, error: null }
}

export async function dispatchAuthorizedAdminAction<T>(role: string | null, action: string | null, dispatch: () => Promise<T>) {
  const access = authorizeAdminDataAction(role, action)
  if (!access.allowed) return { ...access, value: null as T | null }
  return { ...access, value: await dispatch() }
}
