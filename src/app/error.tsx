'use client';

import { Button } from '@astryxdesign/core/Button';
import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Icon } from '@astryxdesign/core/Icon';
import { CloudOff } from 'lucide-react';

export default function WeatherError({ reset }: { reset: () => void }) {
  return (
    <EmptyState
      headingLevel={1}
      title="The forecast is taking a rain check."
      description="We couldn’t reach the weather service. Please try again in a moment."
      icon={<Icon icon={CloudOff} size="lg" />}
      actions={<Button label="Try again" onClick={reset} />}
    />
  );
}
