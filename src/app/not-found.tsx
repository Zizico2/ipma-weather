import Link from 'next/link';

export default function NotFound() {
  return (
    <section style={{ maxWidth: 640, padding: 24 }}>
      <p>Tempo / IPMA</p>
      <h1>That place isn’t in our forecast.</h1>
      <p>Choose one of IPMA’s supported locations.</p>
      <Link href="/">Back to Lisbon →</Link>
    </section>
  );
}
