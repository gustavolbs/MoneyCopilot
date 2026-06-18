import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'MoneyCopilot',
    short_name: 'MoneyCopilot',
    description: 'PWA privado de gestão financeira offline-first.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#F7F7F2',
    theme_color: '#F7F7F2',
    icons: [
      { src: '/favicon.ico', sizes: '48x48', type: 'image/x-icon' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
