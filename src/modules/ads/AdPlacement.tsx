import styles from './AdPlacement.module.css';

interface AdPlacementProps {
  isPaidMember: boolean;
  placement: 'feed' | 'shorts';
}

const placementCopy = {
  feed: {
    label: 'Community spotlight',
    description: 'A space reserved for relevant sponsored recommendations.',
  },
  shorts: {
    label: 'Creator spotlight',
    description: 'A space reserved for a sponsored short-form placement.',
  },
};

export function AdPlacement({ isPaidMember, placement }: AdPlacementProps) {
  if (isPaidMember) return null;
  const copy = placementCopy[placement];

  return (
    <aside className={styles.placement} aria-label="Advertisement">
      <span className={styles.label}>Ad · demo placement</span>
      <strong>{copy.label}</strong>
      <p>{copy.description}</p>
      <span className={styles.disclosure}>Provider integration is not configured; this placement does not generate ad revenue.</span>
    </aside>
  );
}
