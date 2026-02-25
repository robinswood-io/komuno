'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { ThemeProvider } from 'next-themes';
import { AuthProvider } from '@/hooks/use-auth';
import { BrandingProvider } from '@/contexts/BrandingContext';
import { FeatureConfigProvider } from '@/contexts/FeatureConfigContext';
import { Toaster } from '@/components/ui/toaster';
import { getQueryFn } from '@/lib/queryClient';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            queryFn: getQueryFn({ on401: 'throw' }),
            staleTime: 5 * 60 * 1000,
            gcTime: 10 * 60 * 1000,
            refetchOnWindowFocus: false,
            retry: 2,
            retryDelay: (attemptIndex: number) => Math.min(1000 * 2 ** attemptIndex, 30000),
          },
          mutations: {
            retry: 1,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrandingProvider>
          <FeatureConfigProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem={false}
              disableTransitionOnChange
            >
              {children}
              <Toaster />
            </ThemeProvider>
          </FeatureConfigProvider>
        </BrandingProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}
