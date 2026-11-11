'use client';

import { Icon } from '@astryxdesign/core/Icon';
import * as stylex from '@stylexjs/stylex';
import {
  CircleHelp,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Sun,
} from 'lucide-react';
import { conditionKind } from '../lib/weather';

export function WeatherIcon({
  code,
  size = 'forecast',
}: {
  code: number | null;
  size?: 'forecast' | 'hero';
}) {
  const icons = {
    sun: Sun,
    cloud: CloudSun,
    rain: CloudRain,
    snow: CloudSnow,
    storm: CloudLightning,
    fog: CloudFog,
    unknown: CircleHelp,
  };
  return (
    <Icon
      icon={icons[conditionKind(code)]}
      size="lg"
      strokeWidth={1.5}
      xstyle={styles[size]}
    />
  );
}

// Artwork uses theme-owned dimensions while ordinary UI icons use Icon's sizes.
const styles = stylex.create({
  forecast: {
    width: 'var(--tempo-weather-icon-forecast)',
    height: 'var(--tempo-weather-icon-forecast)',
  },
  hero: {
    width: 'var(--tempo-weather-icon-hero)',
    height: 'var(--tempo-weather-icon-hero)',
  },
});
