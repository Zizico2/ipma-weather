'use client';

import { LinkProvider } from '@astryxdesign/core/Link';
import { Theme } from '@astryxdesign/core/theme';
import { DbProvider } from '@tanstack/react-db';
import NextLink from 'next/link';
import { type ReactNode, useState } from 'react';
import { createWeatherDb } from '../lib/collections';
import { weatherClient } from '../sdk/weather';
import { tempoTheme } from '../themes/tempo/generated/tempo';

export function Providers({ children }: { children: ReactNode }) {
  // One DB per browser app (and per server render), so Next's Activity can
  // hide and restore city views without destroying their live-query state.
  const [scope] = useState(() => createWeatherDb(weatherClient));
  return (
    <DbProvider client={scope.db}>
      <Theme theme={tempoTheme} mode="light">
        <LinkProvider component={NextLink}>{children}</LinkProvider>
      </Theme>
    </DbProvider>
  );
}
