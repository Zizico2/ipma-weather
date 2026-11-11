import { AppShell } from '@astryxdesign/core/AppShell';
import { Heading } from '@astryxdesign/core/Heading';
import { Layout, LayoutContent, LayoutFooter } from '@astryxdesign/core/Layout';
import { Link } from '@astryxdesign/core/Link';
import { Skeleton } from '@astryxdesign/core/Skeleton';
import { Stack } from '@astryxdesign/core/Stack';
import { Text } from '@astryxdesign/core/Text';
import { TopNav, TopNavHeading } from '@astryxdesign/core/TopNav';
import type { ReactNode } from 'react';
import { TempoBrandIcon } from './tempo-icons';

export function WeatherShell({
  children,
  sidebar,
}: {
  children: ReactNode;
  sidebar: ReactNode;
}) {
  return (
    <AppShell
      variant="wash"
      contentPadding={0}
      topNav={
        <TopNav
          label="Tempo"
          heading={
            <TopNavHeading
              heading="tempo."
              headingHref="/"
              logo={<TempoBrandIcon />}
            />
          }
          endContent={
            <Link href="https://www.ipma.pt/en/" as="a" size="sm">
              Weather by IPMA
            </Link>
          }
        />
      }
      sideNav={sidebar}
    >
      <Layout
        height="auto"
        contentWidth={1120}
        padding={6}
        content={<LayoutContent>{children}</LayoutContent>}
        footer={
          <LayoutFooter hasDivider>
            <Stack direction="horizontal" justify="between" gap={3} wrap="wrap">
              <Text type="supporting" color="secondary">
                Made for whatever the weather brings.
              </Text>
              <Text type="supporting" color="secondary">
                Portugal, at a glance
              </Text>
            </Stack>
          </LayoutFooter>
        }
      />
    </AppShell>
  );
}

export function WeatherLoading() {
  return (
    <Stack as="section" gap={6} aria-busy="true" aria-label="Loading forecast">
      <Stack gap={2}>
        <Text type="label" color="secondary">
          Portugal / Weather
        </Text>
        <Heading level={1}>Looking at the skies.</Heading>
        <Text color="secondary">Loading the forecast from IPMA…</Text>
      </Stack>
      <Stack gap={3} aria-hidden="true">
        <Skeleton height={280} radius={3} />
        <Skeleton width="40%" height={24} />
        <Skeleton height={180} radius={3} />
      </Stack>
    </Stack>
  );
}
