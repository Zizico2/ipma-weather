'use client';

import { TextInput } from '@astryxdesign/core/TextInput';
import * as stylex from '@stylexjs/stylex';
import { ArrowUpRight, MapPin } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense, useState } from 'react';
import {
  DEFAULT_LOCATION_ID,
  parseLocationId,
  type WeatherLocation,
} from '../lib/weather';

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
    <aside {...stylex.props(styles.sidebar)} aria-label="Locations">
      <p {...stylex.props(styles.eyebrow)}>FIND YOUR FORECAST</p>
      <h2 {...stylex.props(styles.sidebarTitle)}>
        Somewhere
        <br />
        in Portugal.
      </h2>
      <TextInput
        label="Search locations"
        value={search}
        onChange={setSearch}
        placeholder="Search a city…"
        type="search"
        hasClear
      />
      <p {...stylex.props(styles.listLabel)}>
        {search ? `${filtered.length} PLACES FOUND` : 'EXPLORE LOCATIONS'}
      </p>
      <nav {...stylex.props(styles.locations)} aria-label="Choose a location">
        {/* Only the active-link appearance depends on the URL. The cached list
          and its interactive search remain in the shared static shell. */}
        <Suspense
          fallback={<LocationLinks locations={filtered} selectedId={null} />}
        >
          <SelectedLocationLinks locations={filtered} />
        </Suspense>
        {filtered.length === 0 && (
          <p {...stylex.props(styles.muted)}>
            No locations found. Try another name.
          </p>
        )}
      </nav>
      <div {...stylex.props(styles.sidebarFoot)}>
        <span {...stylex.props(styles.greenDot)} /> Mainland & islands
        <br />
        <span {...stylex.props(styles.muted)}>
          One country. Many kinds of weather.
        </span>
      </div>
    </aside>
  );
}

function SelectedLocationLinks({
  locations,
}: {
  locations: WeatherLocation[];
}) {
  const pathname = usePathname();
  const selectedId =
    pathname === '/'
      ? DEFAULT_LOCATION_ID
      : parseLocationId(pathname.split('/')[2] ?? '');
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

function LocationLink({
  location,
  selected,
}: {
  location: WeatherLocation;
  selected: boolean;
}) {
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  return (
    <Link
      href={`/weather/${location.id}`}
      prefetch={hovered || focused ? true : 'auto'}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onFocus={() => setFocused(true)}
      onBlur={() => setFocused(false)}
      aria-current={selected ? 'page' : undefined}
      {...stylex.props(styles.location, selected && styles.locationActive)}
    >
      <span>{location.name}</span>
      {selected ? (
        <MapPin size={15} aria-hidden="true" />
      ) : (
        <ArrowUpRight size={14} aria-hidden="true" />
      )}
    </Link>
  );
}

const styles = stylex.create({
  sidebar: {
    display: 'flex',
    flexDirection: 'column',
    paddingRight: { default: 26, '@media (max-width: 700px)': 0 },
    borderRightWidth: { default: 1, '@media (max-width: 700px)': 0 },
    borderRightStyle: 'solid',
    borderRightColor: '#d9ded7',
  },
  eyebrow: {
    color: '#697b70',
    fontSize: 10,
    letterSpacing: '1.8px',
    fontWeight: 700,
    marginBottom: 12,
  },
  sidebarTitle: {
    fontSize: 28,
    fontWeight: 500,
    letterSpacing: '-1px',
    lineHeight: 1.15,
    marginBottom: 30,
    display: { default: 'block', '@media (max-width: 700px)': 'none' },
  },
  listLabel: {
    color: '#718077',
    fontSize: 9,
    letterSpacing: '1.7px',
    marginTop: 28,
    marginBottom: 12,
  },
  locations: {
    display: 'flex',
    flexDirection: 'column',
    gap: 5,
    maxHeight: { default: 405, '@media (max-width: 700px)': 130 },
    overflowY: 'auto',
    scrollbarWidth: 'thin',
    paddingRight: 4,
  },
  location: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    textDecoration: 'none',
    padding: '12px 14px',
    borderRadius: 8,
    fontSize: 13,
    color: '#5d7067',
    backgroundColor: { default: 'transparent', ':hover': '#e9ece2' },
  },
  locationActive: {
    backgroundColor: { default: '#e4ebd6', ':hover': '#dce7c7' },
    color: '#243a2a',
    fontWeight: 700,
  },
  sidebarFoot: {
    marginTop: 32,
    fontSize: 11,
    lineHeight: 2.1,
    display: { default: 'block', '@media (max-width: 700px)': 'none' },
  },
  greenDot: {
    display: 'inline-block',
    width: 6,
    height: 6,
    backgroundColor: '#64844c',
    borderRadius: '50%',
    marginRight: 8,
  },
  muted: { color: '#65756e', fontSize: 11 },
});
