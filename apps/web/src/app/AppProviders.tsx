import { Theme } from '@carbon/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import { AnomalyTriageProvider } from '../data/AnomalyTriageProvider';
import { MyCloudCompassProvider } from '../data/MyCloudCompassProvider';
import { RecommendationWorkflowProvider } from '../data/RecommendationWorkflowProvider';
import { ScopeProvider } from '../data/ScopeProvider';
import { ThemePreferenceProvider } from '../shell/ThemePreference';
import { useThemePreference } from '../shell/themeContext';

function ThemedRoot({ children }: { children: ReactNode }) {
  const { theme } = useThemePreference();
  return (
    <Theme theme={theme} className="cc-app">
      {children}
    </Theme>
  );
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: Infinity, retry: false } } }),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <ThemePreferenceProvider>
        <ScopeProvider>
          <RecommendationWorkflowProvider>
            <AnomalyTriageProvider>
              <MyCloudCompassProvider>
                <ThemedRoot>{children}</ThemedRoot>
              </MyCloudCompassProvider>
            </AnomalyTriageProvider>
          </RecommendationWorkflowProvider>
        </ScopeProvider>
      </ThemePreferenceProvider>
    </QueryClientProvider>
  );
}
