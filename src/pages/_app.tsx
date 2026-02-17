import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Provider } from 'react-redux';
import { store } from '@/store/store';
import { PrimeReactProvider } from 'primereact/api';
import { ProgressSpinner } from 'primereact/progressspinner';
import { useAuthInit } from "@/features/auth/useAuthInit";
import { useAppSelector } from "@/hooks/storeHooks";

import "primereact/resources/themes/lara-dark-blue/theme.css";
import "primereact/resources/primereact.min.css";
import "primeicons/primeicons.css";

function AuthInitializer({ children }: { children: React.ReactNode }) {
  useAuthInit();
  const { isLoading } = useAppSelector((state) => state.auth);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#0f172a] gap-6">
        <ProgressSpinner
          style={{ width: '64px', height: '64px' }}
          strokeWidth="3"
          fill="transparent"
          animationDuration=".5s"
        />
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-2xl font-serif text-[#fffdd0] tracking-widest animate-pulse">FLOWTIME</h2>
          <div className="h-[1px] w-24 bg-[#c5a059]/30"></div>
          <p className="text-[10px] text-[#c5a059]/50 uppercase tracking-[0.4em]">Calibrating Focus</p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

export default function App({ Component, pageProps }: AppProps) {
  return (
    <Provider store={store}>
      <PrimeReactProvider value={{ ripple: true }}>
        <AuthInitializer>
          <Component {...pageProps} />
        </AuthInitializer>
      </PrimeReactProvider>
    </Provider>
  );
}