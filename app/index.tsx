import { Redirect } from 'expo-router';
import { useAuthStore } from '../store/useAuthStore';

export default function Index() {
  const session = useAuthStore((state) => state.session);

  if (session) {
    // We assume if they have a session, they either need to onboard or go home
    // In a full app, we'd check if `profiles` exists for this user.
    // For now, redirect to home.
    return <Redirect href="/home" />;
  }

  return <Redirect href="/auth" />;
}
