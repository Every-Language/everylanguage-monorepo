import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  const baseUrl =
    process.env.NEXT_PUBLIC_APP_URL || 'https://everylanguage.app';
  const donateEnabled = process.env.NEXT_PUBLIC_ENABLE_DONATE !== 'false';

  const allowRoutes = ['/', '/map'];
  if (donateEnabled) {
    allowRoutes.push('/donate');
  }

  return {
    rules: [
      {
        userAgent: '*',
        allow: allowRoutes,
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
