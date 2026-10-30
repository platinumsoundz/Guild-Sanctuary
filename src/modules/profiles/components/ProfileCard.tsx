import type { Profile, PublicProfile } from '@/types/database';
import styles from './Profiles.module.css';
import { ProfileSocialLinks } from './ProfileSocialLinks';

interface ProfileCardProps {
  profile: Profile | PublicProfile;
}

export function ProfileCard({ profile }: ProfileCardProps) {
  const badgeGlyph = profile.equippedBadge === 'profile_badge_sparkle' ? '✨' : profile.equippedBadge === 'profile_badge_moon' ? '🌙' : profile.equippedBadge === 'profile_badge_flame' ? '🔥' : profile.equippedBadge === 'profile_badge_leaf' ? '🌿' : null;
  return (
    <article className={styles.profileCard} data-border={profile.equippedBorder ?? ''} data-profile-theme={profile.equippedProfileTheme ?? ''} data-palette={profile.equippedPalette ?? ''} data-custom-accent={profile.customAccentColor ?? ''} style={{ borderColor: profile.customAccentColor ?? profile.themeColor, ['--profile-accent' as string]: profile.customAccentColor ?? profile.themeColor }}>
      {profile.bannerUrl ? <img className={styles.banner} src={profile.bannerUrl} alt="" /> : (
        <div className={styles.bannerFallback} style={{ backgroundColor: `${profile.themeColor}20` }} />
      )}
      <div className={styles.profileIdentity}>
        <div className={styles.avatar} data-frame={profile.equippedFrame ?? ''} data-effect={profile.equippedEffect ?? ''} aria-hidden="true" style={{ borderColor: profile.customAccentColor ?? profile.themeColor }}>
          {profile.avatarUrl ? <img src={profile.avatarUrl} alt="" /> : profile.displayName.slice(0, 1).toUpperCase()}
        </div>
        <div className={styles.profileDetails}>
          <p className={styles.eyebrow}>COMMUNITY PROFILE</p>
          <h1>{profile.displayName} {badgeGlyph && <span className={styles.cosmeticBadge} aria-label="Equipped profile badge">{badgeGlyph}</span>}</h1>
          <p className={styles.username}>@{profile.username}</p>
          {profile.statusMessage && <p className={styles.statusMessage}>{profile.statusMessage}</p>}
          {(profile.equippedBorder || profile.equippedProfileTheme || profile.equippedPalette) && <p className={styles.cosmeticCaption}>Profile style equipped</p>}
          <p className={styles.bio}>{profile.bio ?? 'No profile introduction yet.'}</p>
          <div className={styles.personalDetails}>
            {profile.location && <span>{profile.location}</span>}
            {profile.age && <span>{profile.age}</span>}
            {profile.starSign && <span>{profile.starSign}</span>}
            {profile.belief && <span>{profile.belief}</span>}
          </div>
          {(!('privacy' in profile) || profile.privacy.socialLinks) && <ProfileSocialLinks links={profile.socialLinks} />}
        </div>
      </div>
      <span className={styles.role}>{profile.role}</span>
    </article>
  );
}