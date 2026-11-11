import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { LocationSidebarData } from '../components/location-sidebar-data';
import { WeatherShell } from '../components/weather-shell';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'Tempo — Weather in Portugal',
  description:
    'A little perspective on the days ahead. Five-day weather forecasts across Portugal, from IPMA.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" data-theme="light" data-astryx-theme="tempo">
      <body>
        <Providers>
          <WeatherShell sidebar={<LocationSidebarData />}>
            {children}
          </WeatherShell>
        </Providers>
      </body>
    </html>
  );
}
