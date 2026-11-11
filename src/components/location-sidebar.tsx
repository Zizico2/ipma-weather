'use client';

import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import {
  SideNav,
  SideNavItem,
  SideNavSection,
} from '@astryxdesign/core/SideNav';
import { Stack } from '@astryxdesign/core/Stack';
import { StatusDot } from '@astryxdesign/core/StatusDot';
import { Text } from '@astryxdesign/core/Text';
import { TextInput } from '@astryxdesign/core/TextInput';
import { MapPin } from 'lucide-react';
import NextLink from 'next/link';
import { usePathname } from 'next/navigation';
import { type ComponentProps, Suspense, useState } from 'react';
import { parseLocationId, type WeatherLocation } from '../lib/weather';

export function LocationSidebar({
  locations,
}: {
  locations: WeatherLocation[];
}) {
  const [search, setSearch] = useState('');
  const normalize = (value: string) =>
    value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  const filtered = locations.filter((location) =>
    normalize(location.name).includes(normalize(search)),
  );
  return (
    <SideNav
      aria-label="Choose a location"
      topContent={
        <Stack gap={3} padding={3}>
          <Text type="label" color="secondary">
            Find your forecast
          </Text>
          <TextInput
            label="Search locations"
            value={search}
            onChange={setSearch}
            placeholder="Search a city…"
            type="search"
            hasClear
          />
        </Stack>
      }
      footer={
        <Stack gap={2} padding={3}>
          <StatusDot variant="success" label="Mainland & islands" />
          <Text type="supporting" color="secondary">
            One country. Many kinds of weather.
          </Text>
        </Stack>
      }
    >
      <SideNavSection
        title={search ? `${filtered.length} places found` : 'Explore locations'}
      >
        {/* URL-dependent selection stays below Suspense so search and links
            remain interactive in the prerendered shared shell. */}
        <Suspense
          fallback={<LocationLinks locations={filtered} selectedId={null} />}
        >
          <SelectedLocationLinks locations={filtered} />
        </Suspense>
        {filtered.length === 0 && (
          <EmptyState
            title="No locations found."
            description="Try another name."
            isCompact
          />
        )}
      </SideNavSection>
    </SideNav>
  );
}

function SelectedLocationLinks({
  locations,
}: {
  locations: WeatherLocation[];
}) {
  const pathname = usePathname();
  const selectedId = parseLocationId(pathname.split('/')[2] ?? '');
  return <LocationLinks locations={locations} selectedId={selectedId} />;
}

function LocationLinks({
  locations,
  selectedId,
}: {
  locations: WeatherLocation[];
  selectedId: number | null;
}) {
  return locations.map((location) => (
    <LocationLink
      key={location.id}
      location={location}
      selected={location.id === selectedId}
    />
  ));
}

// Keep Next's intent prefetching while Astryx owns navigation styling,
// focus, current-page semantics, and mobile drawer activation.
function LocationLink({
  location,
  selected,
}: {
  location: WeatherLocation;
  selected: boolean;
}) {
  return (
    <SideNavItem
      as={ForecastLink}
      href={`/weather/${location.id}`}
      label={location.name}
      icon={<Icon icon={MapPin} size="sm" />}
      isSelected={selected}
    />
  );
}

function ForecastLink({
  onMouseEnter,
  onMouseLeave,
  onFocus,
  onBlur,
  ...props
}: ComponentProps<typeof NextLink>) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <NextLink
      {...props}
      prefetch={hovered || focused ? true : 'auto'}
      onMouseEnter={(event) => {
        setHovered(true);
        onMouseEnter?.(event);
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        onMouseLeave?.(event);
      }}
      onFocus={(event) => {
        setFocused(true);
        onFocus?.(event);
      }}
      onBlur={(event) => {
        setFocused(false);
        onBlur?.(event);
      }}
    />
  );
}
