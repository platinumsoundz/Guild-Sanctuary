import type { Profile, PublicProfile } from '@/types/database';
import styles from './Profiles.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

interface ProfileCardProps {
  profile: Profile | PublicProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  return (
    <article className={styles.profileCard} style={{ borderColor: profile.themeColor }}>
      {profile.bannerUrl ? <img className={styles.banner} src={profile.bannerUrl} alt="" /> : (
        <div className={styles.bannerFallback} style={{ backgroundColor: `${profile.themeColor}20` }} />
      )}
      <div className={styles.profileIdentity}>
        <div className={styles.avatar} aria-hidden="true" style={{ borderColor: profile.themeColor }}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className={styles.profileDetails}>
          <p className={styles.eyebrow}>COMMUNITY PROFILE</p>
          <h1>{profile.displayName}</h1>
          <p className={styles.username}>@{profile.username}</p>
          {profile.statusMessage && <p className={styles.statusMessage}>{profile.statusMessage}</p>}\n          <p className={styles.bio}>{profile.bio ?? 'No profile introduction yet.'}</p>
          <div className={styles.personalDetails}>
            {profile.location && <span>{profile.location}</span>}
            {profile.age && <span>{profile.age}</span>}
            {profile.starSign && <span>{profile.starSign}</span>}
            {profile.belief && <span>{profile.belief}</span>}
          </div>
          {profile.selfDiscoverySummary && Object.keys(profile.selfDiscoverySummary).length > 0 && (
            <section className={styles.selfDiscoverySummary} aria-label="Shared self-discovery summary">
              <p className={styles.eyebrow}>SELF-DISCOVERY · SHARED BY CHOICE</p>
              {Object.entries(profile.selfDiscoverySummary).map(([key, value]) => (
                <div className={styles.selfDiscoveryItem} key={key}>
                  <span>{({ connection: 'How I recharge', decisions: 'Decision style', motivation: 'Motivation', communication: 'Communication preference', learning: 'Learning preference', zodiac: 'Zodiac lens' } as Record<string, string>)[key] ?? key}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            </section>
          )}
          {(!('privacy' in profile) || profile.privacy.socialLinks) && <ProfileSocialLinks links={profile.socialLinks} />}
        </div>
      </div>
      <span className={styles.role}>{profile.role}</span>
    </article>
  );
}