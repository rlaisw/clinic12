'use client';

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";
import { useState } from "react";
import { UserProvider } from "@/contexts/user-context";
import { ThemeProvider } from "@/contexts/theme-context";

export default function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <UserProvider>
          {children}
        </UserProvider>
        <ReactQueryDevtools initialIsOpen={false} buttonPosition="top-right" />
      </QueryClientProvider>
    </ThemeProvider>
  );
}