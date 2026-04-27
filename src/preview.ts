import { config } from './config.ts';

const escapeHtml = (s: string): string =>
  s.replace(/[&<>"']/g, (c) => {
    switch (c) {
      case '&': return '&amp;';
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '"': return '&quot;';
      default: return '&#39;';
    }
  });

export function renderPreviewHtml(canonicalUrl: string, redirectUrl: string): string {
  const {
    title, description, locale, imagePath, imageWidth, imageHeight,
    imageAlt, siteName, appleAppId,
  } = config.preview;

  const imageUrl = `${config.publicBaseUrl}${imagePath}`;
  const t = escapeHtml(title);
  const d = escapeHtml(description);
  const img = escapeHtml(imageUrl);
  const url = escapeHtml(canonicalUrl);
  const site = escapeHtml(siteName);
  const alt = escapeHtml(imageAlt);
  const redirect = escapeHtml(redirectUrl);

  return `<!doctype html>
<html lang="cs">
<head>
<meta charset="utf-8">
<title>${t}</title>
<meta name="description" content="${d}">
<meta name="apple-itunes-app" content="app-id=${appleAppId}">
<link rel="canonical" href="${url}">

<meta property="og:type" content="website">
<meta property="og:site_name" content="${site}">
<meta property="og:locale" content="${locale}">
<meta property="og:title" content="${t}">
<meta property="og:description" content="${d}">
<meta property="og:url" content="${url}">
<meta property="og:image" content="${img}">
<meta property="og:image:secure_url" content="${img}">
<meta property="og:image:type" content="image/png">
<meta property="og:image:width" content="${imageWidth}">
<meta property="og:image:height" content="${imageHeight}">
<meta property="og:image:alt" content="${alt}">

<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${t}">
<meta name="twitter:description" content="${d}">
<meta name="twitter:image" content="${img}">
<meta name="twitter:image:alt" content="${alt}">
</head>
<body>
<p>Přesměrování na <a href="${redirect}">${site}</a>…</p>
<script>location.replace(${JSON.stringify(redirectUrl)});</script>
</body>
</html>
`;
}
