import styles from './Profiles.module.css';

export function CosmeticFramePlaceholder() {
  return (
    <section className={styles.cosmetics} aria-labelledby="cosmetic-frame-title">
      <div className={styles.framePreview} aria-hidden="true">+</div>
      <div>
        <p className={styles.eyebrow}>PROFILE CUSTOMIZATION</p>
        <h2 id="cosmetic-frame-title">Cosmetic frames</h2>
        <p className={styles.bio}>Frame selection and preview will be managed here.</p>
      </div>
    </section>
  );
}