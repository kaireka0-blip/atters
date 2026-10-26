import { mobileUiScaleReady } from './init';
import React, { Suspense } from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import ErrorBoundary from './shared/ui/ErrorBoundary';
import { SimplifiedDataProvider } from './contexts/SimplifiedDataContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { getCurrentCacheScope, restoreQueryCache } from './lib/queryCachePersistence';
import './index.css';
import '../app/index.css';
import './styles/print.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30 * 1000,
      gcTime: 30 * 60 * 1000, // 30 minutes in memory
      // Data domain tetap segar lewat subscription Realtime Supabase. Refetch
      // otomatis setiap tab fokus membuat seluruh dataset (termasuk payload
      // paket yang besar) diunduh ulang tanpa diminta.
      refetchOnWindowFocus: false,
      refetchOnMount: true,
      refetchOnReconnect: true,
      retry: 1,
    },
  },
});

// Disable console.log only in production (keep for debugging in dev)
if (typeof window !== 'undefined' && typeof console !== 'undefined' && import.meta.env.PROD) {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  console.log = () => {};
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = ReactDOM.createRoot(rootElement);

async function startApp() {
  const cacheScope = getCurrentCacheScope();
  if (cacheScope) {
    try {
      await restoreQueryCache(queryClient, cacheScope);
    } catch (error) {
      console.warn('[QueryCache] Failed to restore local cache; loading from Supabase.', error);
    }
  }

  // The account's saved mobile UI scale must be active before the first paint,
  // so a logged-in user never sees the default 100% after a reload.
  try {
    await mobileUiScaleReady;
  } catch (error) {
    console.warn('[MobileUiScale] Failed to initialize the mobile UI scale preference.', error);
  }

  root.render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <SimplifiedDataProvider>
          <ErrorBoundary>
            <Suspense
              fallback={
                <div className="min-h-screen flex items-center justify-center bg-brand-bg text-brand-text-secondary">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-brand-accent/20 border-t-brand-accent rounded-full animate-spin" />
                    <span className="text-sm font-medium">Memuat Attera Visual...</span>
                  </div>
                </div>
              }
            >
              <App />
            </Suspense>
          </ErrorBoundary>
        </SimplifiedDataProvider>
      </QueryClientProvider>
    </React.StrictMode>,
  );

  if (cacheScope) {
    window.setTimeout(() => {
      void queryClient.invalidateQueries({ refetchType: 'active' });
    }, 0);
  }
}

void startApp();
