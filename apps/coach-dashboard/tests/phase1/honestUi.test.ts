import { describe, expect, it } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

const dashboard = fs.readFileSync(path.resolve(__dirname, '../../app/dashboard/page.tsx'), 'utf8');
const sidebar = fs.readFileSync(path.resolve(__dirname, '../../components/Sidebar.tsx'), 'utf8');

describe('dashboard honest static states', () => {
  it('does not contain the retired mock identity, counts, revenue, or date', () => {
    for (const fake of ['Coach Alex', '28 athletes', '$8,450', 'May 20, 2024']) {
      expect(dashboard).not.toContain(fake);
      expect(sidebar).not.toContain(fake);
    }
  });

  it('uses honest unsupported revenue and schedule states', () => {
    expect(dashboard).toContain('Billing isn&apos;t connected yet.');
    expect(dashboard).toContain('Scheduling isn&apos;t available yet');
    expect(dashboard).toContain('workoutsToday === null');
  });

  it('does not claim active athlete or premium subscription status', () => {
    expect(dashboard).not.toContain('Active Athletes');
    expect(sidebar).not.toContain('Premium Coach');
  });
});
