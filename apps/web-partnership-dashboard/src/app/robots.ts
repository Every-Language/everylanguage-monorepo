import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://everylanguage.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/map', '/donate'],
        disallow: [
          '/dashboard',
          '/partner-org',
          '/profile',
          '/project',
          '/team',
          '/base',
        ],
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
