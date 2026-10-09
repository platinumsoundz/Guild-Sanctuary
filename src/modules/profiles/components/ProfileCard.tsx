import type { Profile } from '@/types/database';
import styles from './Profiles.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

interface ProfileCardProps {
  profile: Profile;
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
          {profile.cosmeticFrames[0] && <span className={styles.frameRing} style={{ borderColor: profile.themeColor }} />}
        </div>
        <div className={styles.profileDetails}>
          <p className={styles.eyebrow}>COMMUNITY PROFILE</p>
          <h1>{profile.displayName}</h1>
          <p className={styles.username}>@{profile.username}</p>
          <p className={styles.bio}>{profile.bio ?? 'No profile introduction yet.'}</p>
          <div className={styles.personalDetails}>
            {profile.location && <span>{profile.location}</span>}
            {profile.age && <span>{profile.age}</span>}
            {profile.starSign && <span>{profile.starSign}</span>}
            {profile.belief && <span>{profile.belief}</span>}
          </div>
          {profile.privacy.socialLinks && <ProfileSocialLinks links={profile.socialLinks} />}
        </div>
      </div>
      <span className={styles.role}>{profile.role}</span>
    </article>
  );
}