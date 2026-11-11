'use client';

import { Theme } from '@astryxdesign/core/theme';
import { neutralTheme } from '@astryxdesign/theme-neutral/built';
import { DbProvider } from '@tanstack/react-db';
import { type ReactNode, useState } from 'react';
import { createWeatherDb } from '../lib/collections';
import { httpLoader } from '../lib/http';

export function Providers({ children }: { children: ReactNode }) {
  // One DB per browser app (and per server render), so Next's Activity can
  // hide and restore city views without destroying their live-query state.
  const [scope] = useState(() => createWeatherDb(httpLoader));
  return (
    <DbProvider client={scope.db}>
      <Theme theme={neutralTheme} mode="light">
        {children}
      </Theme>
    </DbProvider>
  );
}
