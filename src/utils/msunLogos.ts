/**
 * Official MSUN Visual Brand Assets
 * Mindanao State University at Naawan Seal and Brand Logos
 */

// Official MSU at Naawan Circular Seal (SVG)
export const MSUN_SEAL_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200" width="100" height="100">
  <defs>
    <radialGradient id="goldGrad" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="70%" stop-color="#EAB308" />
      <stop offset="100%" stop-color="#CA8A04" />
    </radialGradient>
    <linearGradient id="shieldGrad" cx="0%" cy="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DC2626" />
      <stop offset="50%" stop-color="#B91C1C" />
      <stop offset="100%" stop-color="#991B1B" />
    </linearGradient>
  </defs>

  <!-- Outer Navy Ring -->
  <circle cx="100" cy="100" r="96" fill="#002060" stroke="#CA8A04" stroke-width="4" />
  
  <!-- Outer Gold Ring Border -->
  <circle cx="100" cy="100" r="88" fill="none" stroke="#FDE047" stroke-width="2" />
  
  <!-- Inner Ring with Gold Fill -->
  <circle cx="100" cy="100" r="76" fill="#0F172A" stroke="#CA8A04" stroke-width="3" />

  <!-- Circular Text Path: Top Arch -->
  <path id="topArch" d="M 28 100 A 72 72 0 1 1 172 100" fill="none" />
  <text fill="#FDE047" font-family="Arial, Helvetica, sans-serif" font-size="11.5" font-weight="900" letter-spacing="1.2">
    <textPath href="#topArch" startOffset="50%" text-anchor="middle">
      MINDANAO STATE UNIVERSITY
    </textPath>
  </text>

  <!-- Circular Text Path: Bottom Arch -->
  <path id="bottomArch" d="M 170 105 A 72 72 0 0 1 30 105" fill="none" />
  <text fill="#FDE047" font-family="Arial, Helvetica, sans-serif" font-size="11" font-weight="900" letter-spacing="1.5">
    <textPath href="#bottomArch" startOffset="50%" text-anchor="middle">
      AT NAAWAN • 1973 •
    </textPath>
  </text>

  <!-- Central Shield -->
  <path d="M 64 68 Q 100 62 136 68 L 136 106 Q 136 138 100 152 Q 64 138 64 106 Z" fill="url(#goldGrad)" stroke="#78350F" stroke-width="2" />

  <!-- Inner Red Shield -->
  <path d="M 72 74 Q 100 70 128 74 L 128 104 Q 128 130 100 142 Q 72 130 72 104 Z" fill="url(#shieldGrad)" stroke="#FEF08A" stroke-width="1.5" />

  <!-- Lamp of Knowledge / Torch -->
  <path d="M 94 92 L 106 92 L 103 124 L 97 124 Z" fill="#FDE047" stroke="#78350F" stroke-width="1" />
  <!-- Flame -->
  <path d="M 100 76 Q 106 84 100 90 Q 94 84 100 76 Z" fill="#F97316" stroke="#FEF08A" stroke-width="1" />
  <!-- Open Book at Base -->
  <path d="M 84 126 Q 100 121 100 131 Q 100 121 116 126 L 114 135 Q 100 130 100 138 Q 100 130 86 135 Z" fill="#FFFFFF" stroke="#0F172A" stroke-width="1" />
</svg>`;

// Bagong Pilipinas / National Footer Emblem (SVG)
export const MSUN_FOOTER_EMBLEM_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" width="80" height="80">
  <defs>
    <linearGradient id="sunGrad" cx="0%" cy="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="blueRibbon" cx="0%" cy="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#002060" />
      <stop offset="100%" stop-color="#1E40AF" />
    </linearGradient>
    <linearGradient id="redRibbon" cx="0%" cy="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#DC2626" />
      <stop offset="100%" stop-color="#991B1B" />
    </linearGradient>
  </defs>

  <!-- Circular background badge -->
  <circle cx="80" cy="80" r="76" fill="#FFFFFF" stroke="#E2E8F0" stroke-width="2" />

  <!-- Stylized Philippine Sunburst -->
  <circle cx="80" cy="56" r="22" fill="url(#sunGrad)" />
  <!-- 8 Sun Rays -->
  <g stroke="#F59E0B" stroke-width="3.5" stroke-linecap="round">
    <line x1="80" y1="26" x2="80" y2="16" />
    <line x1="80" y1="86" x2="80" y2="94" />
    <line x1="50" y1="56" x2="40" y2="56" />
    <line x1="110" y1="56" x2="120" y2="56" />
    <line x1="59" y1="35" x2="52" y2="28" />
    <line x1="101" y1="77" x2="108" y2="84" />
    <line x1="59" y1="77" x2="52" y2="84" />
    <line x1="101" y1="35" x2="108" y2="28" />
  </g>

  <!-- Blue and Red Interlocking Swirling Ribbons -->
  <path d="M 32 94 Q 80 78 128 94 Q 105 138 80 144 Q 55 138 32 94 Z" fill="url(#blueRibbon)" opacity="0.95" />
  <path d="M 46 106 Q 80 94 114 106 Q 98 140 80 144 Q 62 140 46 106 Z" fill="url(#redRibbon)" opacity="0.95" />

  <!-- Stars -->
  <polygon points="46,42 49,49 56,49 50,53 52,60 46,55 40,60 42,53 36,49 43,49" fill="#FBBF24" />
  <polygon points="114,42 117,49 124,49 118,53 120,60 114,55 108,60 110,53 104,49 111,49" fill="#FBBF24" />
  <polygon points="80,20 82,25 87,25 83,28 85,33 80,30 75,33 77,28 73,25 78,25" fill="#FBBF24" />
</svg>`;

/**
 * Converts an SVG string into a PNG Uint8Array for docx ImageRun embedding
 */
export async function svgToPngUint8Array(svgString: string, width = 160, height = 160): Promise<Uint8Array> {
  return new Promise((resolve) => {
    try {
      if (typeof window === 'undefined') {
        resolve(new Uint8Array());
        return;
      }
      const img = new Image();
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const URL = window.URL || window.webkitURL || window;
      const blobURL = URL.createObjectURL(svgBlob);
      
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.clearRect(0, 0, width, height);
            ctx.drawImage(img, 0, 0, width, height);
            canvas.toBlob((blob) => {
              if (blob) {
                blob.arrayBuffer().then((buf) => {
                  resolve(new Uint8Array(buf));
                }).catch(() => resolve(new Uint8Array()));
              } else {
                resolve(new Uint8Array());
              }
            }, 'image/png');
          } else {
            resolve(new Uint8Array());
          }
        } catch {
          resolve(new Uint8Array());
        } finally {
          URL.revokeObjectURL(blobURL);
        }
      };

      img.onerror = () => {
        URL.revokeObjectURL(blobURL);
        resolve(new Uint8Array());
      };

      img.src = blobURL;
    } catch {
      resolve(new Uint8Array());
    }
  });
}
