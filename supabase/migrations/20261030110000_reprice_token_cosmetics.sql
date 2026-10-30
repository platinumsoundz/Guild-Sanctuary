-- Affordable, impulse-purchase token shop pricing.
-- 100 tokens = £1 at the current standard bundle rate; every cosmetic is 20-50 tokens.
begin;

update public.token_spend_catalog
set price_tokens = case item_id
  -- Premium palettes
  when 'theme_nebula' then 50
  when 'theme_aurora' then 50
  when 'theme_celestial' then 50
  when 'theme_eclipse' then 50

  -- Profile frames
  when 'profile_frame_sanctuary' then 30
  when 'profile_frame_aurora' then 30
  when 'profile_frame_ember' then 30
  when 'frame_crystal' then 30
  when 'frame_starlight' then 30
  when 'frame_solar' then 50
  when 'frame_void' then 50

  -- Portrait effects
  when 'profile_effect_sparkle' then 20
  when 'profile_effect_glow' then 20
  when 'effect_comet' then 30
  when 'effect_moonlight' then 30
  when 'effect_constellation' then 40

  -- Identity badges
  when 'profile_badge_sparkle' then 20
  when 'profile_badge_moon' then 20
  when 'profile_badge_flame' then 20
  when 'profile_badge_leaf' then 20
  when 'badge_starborn' then 20
  when 'badge_cosmic' then 20
  when 'badge_comet' then 20
  when 'badge_crystal' then 25
  when 'badge_sunrise' then 25

  -- Profile banners
  when 'profile_banner_aurora' then 30
  when 'profile_banner_ember' then 30
  when 'profile_banner_tide' then 30
  when 'banner_starry_sky' then 40
  when 'banner_moonlit' then 40
  when 'banner_solar_flare' then 50
  when 'banner_crystal_garden' then 50
  else price_tokens
end
where item_id in (
  'theme_nebula','theme_aurora','theme_celestial','theme_eclipse',
  'profile_frame_sanctuary','profile_frame_aurora','profile_frame_ember',
  'frame_crystal','frame_starlight','frame_solar','frame_void',
  'profile_effect_sparkle','profile_effect_glow','effect_comet','effect_moonlight','effect_constellation',
  'profile_badge_sparkle','profile_badge_moon','profile_badge_flame','profile_badge_leaf',
  'badge_starborn','badge_cosmic','badge_comet','badge_crystal','badge_sunrise',
  'profile_banner_aurora','profile_banner_ember','profile_banner_tide',
  'banner_starry_sky','banner_moonlit','banner_solar_flare','banner_crystal_garden'
);

commit;
