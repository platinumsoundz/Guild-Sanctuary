import { AppWorkspace } from '@/components/AppWorkspace';
import { AppContextProvider } from '@/context/AppContext';

export default function Home() {
  return (
    <AppContextProvider>
      <AppWorkspace />
    </AppContextProvider>
  );
}