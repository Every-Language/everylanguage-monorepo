import type { Metadata } from 'next';
import { DonateClientPage } from './client';

export const metadata: Metadata = {
  title: 'Support Bible Translation | EverlyLanguage',
  description:
    'Make a lasting impact by supporting Bible translation projects worldwide. Help bring Scripture to languages that need it most.',
  openGraph: {
    title: 'Support Bible Translation',
    description: 'Help bring Scripture to languages worldwide',
    type: 'website',
  },
};

export const revalidate = 3600;

export default function DonatePage() {
  return <DonateClientPage />;
}
