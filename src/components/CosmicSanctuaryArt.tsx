import type { SVGProps } from 'react';

export function CosmicSanctuaryArt(props: SVGProps<SVGSVGElement>) {
  return (
    <svg viewBox="0 0 760 520" role="img" aria-labelledby="cosmic-art-title cosmic-art-description" {...props}>
      <title id="cosmic-art-title">The Sanctuary among the stars</title>
      <desc id="cosmic-art-description">A luminous portal framed by ethereal wings, a distant celestial skyline, a ringed planet, stars, and flowing cosmic energy.</desc>
      <defs>
        <linearGradient id="cosmic-sky" x1="0" y1="0" x2="0.8" y2="1"><stop stopColor="#111447"/><stop offset=".55" stopColor="#25205f"/><stop offset="1" stopColor="#090e2b"/></linearGradient>
        <linearGradient id="cosmic-wing" x1="0" y1="0" x2="1" y2="1"><stop stopColor="#fffaff"/><stop offset=".4" stopColor="#d7c5ff"/><stop offset="1" stopColor="#7e9cff"/></linearGradient>
        <linearGradient id="cosmic-energy" x1="0" y1="0" x2="1" y2="0"><stop stopColor="#9d5cff" stopOpacity="0"/><stop offset=".5" stopColor="#8feaff"/><stop offset="1" stopColor="#e49bff" stopOpacity="0"/></linearGradient>
        <radialGradient id="cosmic-portal"><stop stopColor="#e7fbff"/><stop offset=".22" stopColor="#a9f0ff"/><stop offset=".65" stopColor="#a38aff" stopOpacity=".85"/><stop offset="1" stopColor="#9e5bff" stopOpacity="0"/></radialGradient>
        <radialGradient id="cosmic-planet"><stop stopColor="#c9b6ff"/><stop offset=".65" stopColor="#6b62c7"/><stop offset="1" stopColor="#28285d"/></radialGradient>
        <filter id="cosmic-glow" x="-80%" y="-80%" width="260%" height="260%"><feGaussianBlur stdDeviation="12"/></filter>
        <g id="cosmic-wing-feathers" fill="url(#cosmic-wing)" stroke="#f4eaff" strokeOpacity=".65" strokeWidth="1.2">
          <path d="M0 10 C-34 -20 -78 -38 -115 -25 C-91 0 -61 20 -10 34Z"/>
          <path d="M-8 32 C-48 0 -102 -1 -139 22 C-103 42 -65 53 -12 54Z"/>
          <path d="M-12 53 C-54 35 -107 45 -130 73 C-92 86 -52 81 -12 74Z"/>
          <path d="M-12 73 C-45 68 -85 91 -99 120 C-63 124 -35 105 -8 91Z"/>
          <path d="M-8 90 C-34 96 -56 127 -54 154 C-26 141 -10 117 0 100Z"/>
          <path d="M0 10 C-10 43 -12 83 -8 116 C8 84 13 44 0 10Z" fill="#f5edff"/>
        </g>
      </defs>
      <rect width="760" height="520" rx="28" fill="url(#cosmic-sky)"/>
      <circle cx="380" cy="215" r="165" fill="url(#cosmic-portal)" opacity=".85"/>
      <circle cx="380" cy="215" r="100" fill="none" stroke="#b6f5ff" strokeOpacity=".45" strokeWidth="2"/>
      <circle cx="380" cy="215" r="118" fill="none" stroke="#d8b5ff" strokeOpacity=".35" strokeDasharray="3 12" strokeWidth="2"/>
      <ellipse cx="380" cy="224" rx="130" ry="160" fill="none" stroke="#b4eaff" strokeOpacity=".25" strokeWidth="8" filter="url(#cosmic-glow)"/>
      <g transform="translate(380 150)"><use href="#cosmic-wing-feathers"/><use href="#cosmic-wing-feathers" transform="scale(-1 1)"/></g>
      <path d="M380 112 C354 150 353 198 380 240 C407 198 406 150 380 112Z" fill="#fff" opacity=".72" filter="url(#cosmic-glow)"/>
      <path d="M380 112 C354 150 353 198 380 240 C407 198 406 150 380 112Z" fill="#f4fdff" opacity=".85"/>
      <g fill="#fff">
        <circle cx="82" cy="72" r="2"/><circle cx="143" cy="143" r="1.6"/><circle cx="223" cy="61" r="2.5"/><circle cx="285" cy="108" r="1.5"/><circle cx="520" cy="76" r="2"/><circle cx="608" cy="129" r="2.5"/><circle cx="688" cy="66" r="1.6"/><circle cx="654" cy="220" r="1.8"/><circle cx="104" cy="260" r="1.8"/><circle cx="208" cy="340" r="2"/><circle cx="552" cy="315" r="1.5"/><circle cx="710" cy="340" r="2"/>
      </g>
      <g stroke="#dffaff" strokeWidth="1.5" strokeLinecap="round" opacity=".9"><path d="M132 96v12m-6-6h12"/><path d="M592 57v14m-7-7h14"/><path d="M680 276v12m-6-6h12"/><path d="M76 202v10m-5-5h10"/></g>
      <circle cx="626" cy="185" r="38" fill="url(#cosmic-planet)"/><ellipse cx="626" cy="185" rx="59" ry="13" fill="none" stroke="#c6c1ff" strokeWidth="5" transform="rotate(-19 626 185)" opacity=".8"/>
      <path d="M0 385 Q75 336 150 374 T300 374 T455 366 T610 377 T760 352 V520 H0Z" fill="#111943"/>
      <path d="M0 422 Q100 389 200 419 T400 413 T590 411 T760 398 V520 H0Z" fill="#171c4a"/>
      <g fill="#27285f" stroke="#8d8cff" strokeOpacity=".4">
        <path d="M55 425v-53h18v-27h14v80z"/><path d="M86 425v-76h22v-17h10v93z"/><path d="M132 425v-48h17v-24h11v72z"/>
        <path d="M593 420v-72h18v-28h12v100z"/><path d="M623 420v-48h14v-22h18v70z"/><path d="M658 420v-86h20v-16h11v102z"/><path d="M689 420v-58h17v-24h12v82z"/>
      </g>
      <path d="M0 458 C130 430 184 481 286 451 S490 434 568 457 S694 478 760 445" fill="none" stroke="url(#cosmic-energy)" strokeWidth="15" opacity=".8" filter="url(#cosmic-glow)"/>
      <path d="M0 458 C130 430 184 481 286 451 S490 434 568 457 S694 478 760 445" fill="none" stroke="url(#cosmic-energy)" strokeWidth="2.5"/>
      <path d="M0 489 Q130 458 260 488 T510 483 T760 470" fill="none" stroke="#8e87ff" strokeOpacity=".35" strokeWidth="1.5"/>
      <g fill="#d8faff"><circle cx="180" cy="454" r="2"/><circle cx="478" cy="469" r="1.5"/><circle cx="720" cy="450" r="2"/></g>
    </svg>
  );
}
