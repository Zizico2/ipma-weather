'use client';

import { Button } from '@astryxdesign/core/Button';

export default function WeatherError({ reset }: { reset: () => void }) {
  return (
    <main style={{ maxWidth: 640, margin: '100px auto', padding: 24 }}>
      <p>Tempo / IPMA</p>
      <h1>The forecast is taking a rain check.</h1>
      <p>
        We couldn’t reach the weather service. Please try again in a moment.
      </p>
      <Button label="Try again" onClick={reset} />
    </main>
  );
}
