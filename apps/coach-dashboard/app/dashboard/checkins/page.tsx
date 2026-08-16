import { ClipboardCheck } from 'lucide-react';

export default function CheckInsPage() {
  return <main className="min-h-screen bg-[#0B1117] p-6 text-gray-100 md:p-8">
    <h1 className="text-2xl font-bold text-white">Check-ins</h1>
    <div className="mt-7 border border-amber-500/30 bg-amber-500/5 p-8 text-center">
      <ClipboardCheck className="mx-auto mb-3 text-amber-400"/>
      <h2 className="font-semibold text-white">Check-ins are not available yet</h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-gray-400">The production database does not currently contain a supported check-in table. No athlete check-in data is being inferred or displayed.</p>
    </div>
  </main>;
}
