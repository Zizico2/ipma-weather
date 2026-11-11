'use client';

import { Icon } from '@astryxdesign/core/Icon';
import { CloudSun, MapPinOff } from 'lucide-react';

// Lucide component objects must stay on the client side of the RSC boundary.
export function TempoBrandIcon() {
  return <Icon icon={CloudSun} size="lg" />;
}

export function MissingLocationIcon() {
  return <Icon icon={MapPinOff} size="lg" />;
}
