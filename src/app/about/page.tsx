import type { Metadata } from 'next';
import { AboutPage } from '@/components/AboutPage';

export const metadata: Metadata = {
  title: 'AccommAlly — Accommodation Case Management',
  description:
    'Secure case management, claimant portals, and compliance-ready decisions for HR and disability teams.',
};

export default function AboutRoute() {
  return <AboutPage />;
}
