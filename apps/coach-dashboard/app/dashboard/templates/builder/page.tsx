import { redirect } from 'next/navigation';

export default function LegacyTemplateBuilderRedirect() {
  redirect('/plans/builder');
}
