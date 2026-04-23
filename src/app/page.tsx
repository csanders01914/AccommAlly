import type { Metadata } from 'next';
import { LandingHeroPage } from '@/components/LandingHeroPage';

export const metadata: Metadata = {
 title: 'AccommAlly — Accommodation Case Management',
 description:
 'Secure, compliant case management for HR and disability accommodation teams.',
};

export default function Home() {
 return <LandingHeroPage />;
}
