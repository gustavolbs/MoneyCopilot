import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MoneyCopilot',
    short_name: 'MoneyCopilot',
    description: 'PWA privado de gestao financeira offline-first.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F7F2',
    theme_color: '#F7F7F2',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
