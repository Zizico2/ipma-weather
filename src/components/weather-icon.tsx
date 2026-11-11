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
  size = 32,
}: {
  code: number | null;
  size?: number;
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
  const Icon = icons[conditionKind(code)];
  return <Icon size={size} strokeWidth={1.5} aria-hidden="true" />;
}
