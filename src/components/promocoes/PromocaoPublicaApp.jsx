import React from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { queryClientInstance } from '@/lib/query-client';
import PromocaoPublica from '@/pages/PromocaoPublica';

export default function PromocaoPublicaApp() {
  return (
    <QueryClientProvider client={queryClientInstance}>
      <PromocaoPublica />
    </QueryClientProvider>
  );
}