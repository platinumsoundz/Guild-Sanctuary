import { ResponsiveShell } from '@/components/ResponsiveShell';
import { WorldSwitcher } from '@/modules/feeds/components/WorldSwitcher';

export default function Home() {
  return (
    <ResponsiveShell>
      <WorldSwitcher />
    </ResponsiveShell>
  );
}