import "@/styles/globals.scss";
import "@/lib/i18n";
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
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#242424] gap-6">
        <ProgressSpinner
          style={{ width: '48px', height: '48px' }}
          strokeWidth="3"
          fill="transparent"
          animationDuration=".5s"
        />
        <div className="flex flex-col items-center gap-2">
          <h2 className="text-xl font-semibold text-[#F0F0F0] tracking-tight">Flowtime</h2>
          <p className="text-xs text-[#757575]">Loading...</p>
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