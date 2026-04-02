import sharp from 'sharp';
import { writeFileSync } from 'fs';

// Profile picture SVG — 1024x1024 circular-safe
const pfpSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1024" height="1024" rx="192" fill="#1e1e22"/>
  <!-- Ambient glow -->
  <circle cx="512" cy="512" r="400" fill="url(#glow)" opacity="0.12"/>
  <!-- Hex outline -->
  <path d="M512 128L896 350v444L512 1016 128 794V350L512 128z" fill="#E8254B" opacity="0.12"/>
  <path d="M512 128L896 350v444L512 1016 128 794V350L512 128z" stroke="#E8254B" stroke-width="18" fill="none"/>
  <!-- Orbit ring -->
  <circle cx="512" cy="572" r="220" stroke="#E8254B" stroke-width="16" fill="none" opacity="0.35"/>
  <!-- Core -->
  <circle cx="512" cy="572" r="120" fill="#E8254B"/>
  <!-- Inner shimmer -->
  <circle cx="512" cy="572" r="60" fill="white" opacity="0.08"/>
  <!-- Tick marks -->
  <path d="M704 344l40-24" stroke="#E8254B" stroke-width="14" stroke-linecap="round" opacity="0.5"/>
  <path d="M280 344l-40-24" stroke="#E8254B" stroke-width="14" stroke-linecap="round" opacity="0.25"/>
  <!-- Orbiting dot -->
  <circle cx="732" cy="572" r="10" fill="#E8254B" opacity="0.6"/>
  <defs>
    <radialGradient id="glow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#E8254B" stop-opacity="1"/>
      <stop offset="100%" stop-color="#E8254B" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`;

// Banner SVG — 1500x500 (Twitter/X) / also works for YouTube
const bannerSvg = `<svg width="1500" height="500" viewBox="0 0 1500 500" fill="none" xmlns="http://www.w3.org/2000/svg">
  <rect width="1500" height="500" fill="#1e1e22"/>
  
  <!-- Subtle grid dots -->
  <pattern id="dots" x="0" y="0" width="40" height="40" patternUnits="userSpaceOnUse">
    <circle cx="2" cy="2" r="1" fill="#f0f0f4" opacity="0.04"/>
  </pattern>
  <rect width="1500" height="500" fill="url(#dots)"/>
  
  <!-- Left glow -->
  <circle cx="300" cy="250" r="350" fill="url(#lglow)" opacity="0.08"/>
  
  <!-- Diagonal accent lines left -->
  <line x1="80" y1="0" x2="40" y2="500" stroke="#E8254B" stroke-width="1" opacity="0.06"/>
  <line x1="120" y1="0" x2="80" y2="500" stroke="#E8254B" stroke-width="1" opacity="0.04"/>
  <line x1="160" y1="0" x2="120" y2="500" stroke="#E8254B" stroke-width="1" opacity="0.03"/>
  
  <!-- Diagonal accent lines right -->
  <line x1="1380" y1="0" x2="1420" y2="500" stroke="#E8254B" stroke-width="1" opacity="0.06"/>
  <line x1="1340" y1="0" x2="1380" y2="500" stroke="#E8254B" stroke-width="1" opacity="0.04"/>
  
  <!-- Small hex mark left-center -->
  <g transform="translate(320, 250) scale(0.45)">
    <path d="M0 -180L156 -90 156 90 0 180 -156 90 -156 -90Z" fill="#E8254B" opacity="0.08"/>
    <path d="M0 -180L156 -90 156 90 0 180 -156 90 -156 -90Z" stroke="#E8254B" stroke-width="6" fill="none" opacity="0.3"/>
    <circle cx="0" cy="0" r="60" stroke="#E8254B" stroke-width="6" fill="none" opacity="0.2"/>
    <circle cx="0" cy="0" r="32" fill="#E8254B"/>
  </g>
  
  <!-- Text: redcore OS -->
  <text x="520" y="230" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="72" font-weight="800" letter-spacing="-2">
    <tspan fill="#f0f0f4">red</tspan><tspan fill="#E8254B">core</tspan><tspan fill="#a0a0ac" font-weight="400"> OS</tspan>
  </text>
  
  <!-- Tagline -->
  <text x="522" y="290" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="22" fill="#6a6a76" letter-spacing="0.5">
    Windows optimization. Open source. 250 actions.
  </text>
  
  <!-- URL -->
  <text x="522" y="340" font-family="'SF Mono', 'Cascadia Code', monospace" font-size="16" fill="#E8254B" opacity="0.6" letter-spacing="1">
    redcoreos.net
  </text>
  
  <!-- Bottom accent line -->
  <line x1="0" y1="498" x2="1500" y2="498" stroke="#E8254B" stroke-width="2" opacity="0.3"/>
  
  <!-- Right side floating dots -->
  <circle cx="1200" cy="150" r="3" fill="#E8254B" opacity="0.15"/>
  <circle cx="1280" cy="200" r="2" fill="#E8254B" opacity="0.1"/>
  <circle cx="1350" cy="120" r="4" fill="#E8254B" opacity="0.08"/>
  <circle cx="1150" cy="350" r="2" fill="#E8254B" opacity="0.12"/>
  <circle cx="1300" cy="380" r="3" fill="#E8254B" opacity="0.06"/>
  
  <defs>
    <radialGradient id="lglow" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#E8254B" stop-opacity="1"/>
      <stop offset="100%" stop-color="#E8254B" stop-opacity="0"/>
    </radialGradient>
  </defs>
</svg>`;

const s = (await import('sharp')).default;

// Profile picture — 1024x1024
await s(Buffer.from(pfpSvg)).resize(1024, 1024).png({ quality: 100 }).toFile('/tmp/social-assets/redcore-pfp-1024.png');
console.log('PFP 1024x1024 done');

// Profile picture — 400x400 (Discord/Twitter)
await s(Buffer.from(pfpSvg)).resize(400, 400).png({ quality: 100 }).toFile('/tmp/social-assets/redcore-pfp-400.png');
console.log('PFP 400x400 done');

// Banner — 1500x500 (Twitter/X)
await s(Buffer.from(bannerSvg), { density: 150 }).resize(1500, 500).png({ quality: 100 }).toFile('/tmp/social-assets/redcore-banner-1500x500.png');
console.log('Banner 1500x500 done');

// Banner — 2560x1440 (YouTube) — same SVG scaled
await s(Buffer.from(bannerSvg), { density: 300 }).resize(2560, 854).png({ quality: 100 }).toFile('/tmp/social-assets/redcore-banner-2560x854.png');
console.log('Banner 2560x854 done');

console.log('All done! Files in /tmp/social-assets/');
