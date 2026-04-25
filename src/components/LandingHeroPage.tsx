'use client';

import Image from 'next/image';
import Link from 'next/link';
import { Shield, ArrowRight } from 'lucide-react';

export function LandingHeroPage() {
 return (
 <div className="min-h-screen flex" style={{ backgroundColor: '#FAF6EE' }}>

 {/* Left panel — brand */}
 <div
 className="hidden lg:flex lg:w-[42%] xl:w-[38%] flex-col justify-between p-12 relative overflow-hidden"
 style={{ backgroundColor: '#1C1A17' }}
 >
 <div
 className="absolute inset-0 pointer-events-none"
 style={{
 backgroundImage: `radial-gradient(ellipse at 30% 20%, rgba(13,148,136,0.12) 0%, transparent 55%),
 radial-gradient(ellipse at 80% 80%, rgba(13,148,136,0.06) 0%, transparent 50%)`,
 }}
 />

 <div className="relative z-10">
 <div className="flex items-center gap-3 mb-16">
 <div
 className="w-8 h-8 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: '#0D9488' }}
 >
 <Shield className="w-4 h-4 text-white" aria-hidden="true" />
 </div>
 <span
 className="text-xl"
 style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
 >
 AccommAlly
 </span>
 </div>

 <h2
  className="text-4xl xl:text-5xl leading-[1.15] mb-6"
  style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#F0EEE8' }}
 >
  Where accommodation meets advocacy.
 </h2>
 <p className="text-base leading-relaxed" style={{ color: 'rgba(240,238,232,0.5)' }}>
 Trusted by HR and disability teams.
 </p>
 </div>

 <div className="relative z-10">
 <p className="text-xs" style={{ color: 'rgba(240,238,232,0.25)' }}>
 AccommAlly &nbsp;&middot;&nbsp; Accommodation Management Platform
 </p>
 </div>

 <div
 className="absolute bottom-0 left-0 right-0 h-px"
 style={{ background: 'linear-gradient(to right, transparent, rgba(13,148,136,0.4), transparent)' }}
 />
 </div>

 {/* Right panel — hero content */}
 <div className="flex-1 flex flex-col items-center justify-center px-6 py-12 sm:px-12">

 {/* Mobile logo */}
 <div className="flex items-center gap-2.5 mb-10 lg:hidden">
 <div
 className="w-7 h-7 rounded-lg flex items-center justify-center"
 style={{ backgroundColor: '#0D9488' }}
 >
 <Shield className="w-3.5 h-3.5 text-white" aria-hidden="true" />
 </div>
 <span
 className="text-lg"
 style={{ fontFamily: 'var(--font-instrument-serif), Georgia, serif', color: '#1C1A17' }}
 >
 AccommAlly
 </span>
 </div>

 <div className="w-full max-w-sm mb-8 rounded-xl overflow-hidden shadow-sm">
  <Image
   src="/images/main-hero.png"
   alt="ADA expert consulting with a client"
   width={480}
   height={280}
   className="w-full h-auto object-cover"
   priority
  />
 </div>

 <div className="w-full max-w-sm">
 <p
 className="text-xs font-semibold uppercase tracking-widest mb-4"
 style={{ color: '#0D9488' }}
 >
 Accommodation Case Management
 </p>
 <h1
 className="text-2xl font-semibold leading-snug mb-4"
 style={{ color: '#1C1A17' }}
 >
 Manage every accommodation request, end to end.
 </h1>
 <p className="text-sm leading-relaxed mb-8" style={{ color: '#5C5850' }}>
 AccommAlly gives HR and disability teams a secure, compliant platform to track cases,
 communicate with claimants, and make defensible decisions — from first request to final
 resolution.
 </p>

 <div className="space-y-3">
 <Link
 href="/login"
 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
 style={{ backgroundColor: '#0D9488', color: '#FFFFFF' }}
 onMouseEnter={e => {
     e.currentTarget.style.backgroundColor = '#0F766E';
     e.currentTarget.style.color = '#FFFFFF';
 }}
 onMouseLeave={e => {
     e.currentTarget.style.backgroundColor = '#0D9488';
     e.currentTarget.style.color = '#FFFFFF';
 }}
 >
 Sign In
 <ArrowRight className="w-4 h-4" aria-hidden="true" />
 </Link>
 <Link
 href="/about"
 className="w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all duration-150"
 style={{ border: '1px solid #0D9488', color: '#0D9488' }}
 onMouseEnter={e => { e.currentTarget.style.backgroundColor = '#F0FDFA'; }}
 onMouseLeave={e => { e.currentTarget.style.backgroundColor = 'transparent'; }}
 >
 See how it works
 <ArrowRight className="w-4 h-4" aria-hidden="true" />
 </Link>
 </div>
 </div>

 <div className="mt-auto pt-12">
 <Link
 href="/request"
 className="text-xs transition-colors"
 style={{ color: '#8C8880' }}
 onMouseEnter={e => (e.currentTarget.style.color = '#5C5850')}
 onMouseLeave={e => (e.currentTarget.style.color = '#8C8880')}
 aria-label="For claimants, visit the portal"
 >
 For claimants, visit the portal <span aria-hidden="true">→</span>
 </Link>
 </div>
 </div>
 </div>
 );
}
