import { EmptyState } from '@astryxdesign/core/EmptyState';
import { Link } from '@astryxdesign/core/Link';
import { MissingLocationIcon } from '../components/tempo-icons';

export default function NotFound() {
  return (
    <EmptyState
      headingLevel={1}
      title="That place isn’t in our forecast."
      description="Choose one of IPMA’s supported locations."
      icon={<MissingLocationIcon />}
      actions={<Link href="/">Back to Lisbon →</Link>}
    />
  );
}
