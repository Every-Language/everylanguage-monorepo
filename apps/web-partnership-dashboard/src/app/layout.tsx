import type { Metadata } from 'next';
import Script from 'next/script';
import './globals.css';
import { Providers } from './providers';
import { SandboxBanner } from '@/shared/components/SandboxBanner';

export const metadata: Metadata = {
  title: 'Every Language Partnership Dashboard',
  description:
    'Track Bible translation progress and support language projects worldwide',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang='en' suppressHydrationWarning>
      <body>
        <Script
          id='theme-init'
          strategy='beforeInteractive'
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  const savedTheme = localStorage.getItem('omt-theme');
                  let theme = savedTheme || 'system';
                  
                  if (!['light', 'dark', 'system'].includes(theme)) {
                    theme = 'system';
                  }
                  
                  let resolvedTheme;
                  if (theme === 'system') {
                    resolvedTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                  } else {
                    resolvedTheme = theme;
                  }
                  
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add(resolvedTheme);
                } catch (e) {
                  document.documentElement.classList.remove('light', 'dark');
                  document.documentElement.classList.add('light');
                }
              })();
            `,
          }}
        />
        <Providers>
          <SandboxBanner />
          {children}
        </Providers>
      </body>
    </html>
  );
}
