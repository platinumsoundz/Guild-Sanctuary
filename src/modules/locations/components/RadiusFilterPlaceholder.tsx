import type { LocationPreference } from '@/types/database';
import styles from './RadiusFilterPlaceholder.module.css';

interface RadiusFilterPlaceholderProps {
  preference: LocationPreference;
  onRadiusChange: (radiusKm: number) => void;
}

export function RadiusFilterPlaceholder({ preference, onRadiusChange }: RadiusFilterPlaceholderProps) {
  const radiusKm = Math.min(100, Math.max(1, preference.radiusPreferenceKm));

  return (
    <section className={styles.filter} aria-labelledby="radius-filter-title">
      <div className={styles.heading}>
        <div>
          <p className={styles.eyebrow}>NEARBY COMMUNITY</p>
          <h2 id="radius-filter-title">Distance radius</h2>
        </div>
        <output className={styles.radiusValue} htmlFor="radius-filter">{radiusKm} km</output>
      </div>
      <input
        id="radius-filter"
        className={styles.range}
        type="range"
        min="1"
        max="100"
        value={radiusKm}
        onChange={(event) => onRadiusChange(Number(event.currentTarget.value))}
        aria-label="Nearby search radius in kilometers"
      />
    </section>
  );
}