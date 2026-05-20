function svgToDataUrl(svg: string) {
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export function createImagePlaceholder(label: string, accent = "#f8b4b4") {
  const safeLabel = label.replace(/[<>]/g, "");
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="960" height="640" viewBox="0 0 960 640">
      <defs>
        <linearGradient id="bg" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="#fffdf8"/>
          <stop offset="100%" stop-color="${accent}" stop-opacity="0.18"/>
        </linearGradient>
      </defs>
      <rect width="960" height="640" rx="40" fill="url(#bg)"/>
      <circle cx="790" cy="120" r="120" fill="${accent}" fill-opacity="0.14"/>
      <circle cx="160" cy="520" r="160" fill="#a8d5ba" fill-opacity="0.18"/>
      <text x="80" y="140" font-size="40" font-family="Arial, sans-serif" fill="#4a4a4a" opacity="0.82">${safeLabel}</text>
      <text x="80" y="220" font-size="28" font-family="Arial, sans-serif" fill="#8b8b8b">AI diary placeholder</text>
    </svg>
  `;

  return svgToDataUrl(svg);
}
