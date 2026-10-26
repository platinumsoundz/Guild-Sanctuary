'use client';

import { AppWorkspace } from '@/components/AppWorkspace';
import { useAppContext } from '@/context/AppContext';

export default function Home() {
  const { loginAsGuest, isAuthenticated } = useAppContext();

  return (
    <main className="min-h-screen">
      <AppWorkspace />
    </main>
  );
}
