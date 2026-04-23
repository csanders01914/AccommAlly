'use client';

import { useEffect } from 'react';

interface BrandingSettings {
 primaryColor?: string;
 secondaryColor?: string;
 logo?: string;
 sidebarBackground?: string;
 sidebarForeground?: string;
 pageBackground?: string; // Kept for backward compatibility or solid mode
 pageBackgroundMode?: 'solid' | 'gradient';
 pageGradientStart?: string;
 pageGradientEnd?: string;
 pageGradientDirection?: string; // e.g., 'to right', 'to bottom right'
}

interface TenantThemeProviderProps {
 settings?: {
 branding?: BrandingSettings;
 } | null;
 children: React.ReactNode;
}

export function TenantThemeProvider({ settings, children }: TenantThemeProviderProps) {
 useEffect(() => {
 const root = document.documentElement;
 const branding = settings?.branding;

 if (branding?.primaryColor) {
 root.style.setProperty('--primary', branding.primaryColor);
 } else {
 root.style.removeProperty('--primary');
 }

 if (branding?.secondaryColor) {
 root.style.setProperty('--secondary', branding.secondaryColor);
 } else {
 root.style.removeProperty('--secondary');
 }

 if (branding?.sidebarBackground) {
 root.style.setProperty('--sidebar-background', branding.sidebarBackground);
 } else {
 root.style.removeProperty('--sidebar-background');
 }

 if (branding?.sidebarForeground) {
 root.style.setProperty('--sidebar-foreground', branding.sidebarForeground);
 } else {
 root.style.removeProperty('--sidebar-foreground');
 }

 // Handle Background
 if (branding?.pageBackgroundMode === 'gradient') {
 const start = branding.pageGradientStart || '#ffffff';
 const end = branding.pageGradientEnd || '#ffffff';
 const direction = branding.pageGradientDirection || 'to bottom right';
 root.style.setProperty('--background', `linear-gradient(${direction}, ${start}, ${end})`);
 } else {
 // Solid mode or legacy
 if (branding?.pageBackground) {
 root.style.setProperty('--background', branding.pageBackground);
 } else {
 root.style.removeProperty('--background');
 }
 }

 }, [settings]);

 return <>{children}</>;
}
