import { Stack } from 'expo-router';

export default function OnboardingLayout() {
  return (
    <Stack screenOptions={{ 
      headerShown: false,
      animation: 'slide_from_right',
      contentStyle: { backgroundColor: '#131313' }
    }}>
      <Stack.Screen name="BetaAgreementScreen" />
      <Stack.Screen name="basic-info" />
      <Stack.Screen name="body-metrics" />
      <Stack.Screen name="goals" />
      <Stack.Screen name="notifications" />
    </Stack>
  );
}
