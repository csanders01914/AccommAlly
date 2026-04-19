'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';

type FontType = 'default' | 'dyslexic' | 'hyperlegible';

interface AccessibilitySettings {
    highContrast: boolean;
    fontSize: number; // Percentage (100-200)
    fontType: FontType;
    saturation: number; // 0-100
    readingGuide: boolean;
}

interface AccessibilityContextType extends AccessibilitySettings {
    toggleHighContrast: () => void;
    setFontSize: (size: number) => void;
    setFontType: (type: FontType) => void;
    setSaturation: (saturation: number) => void;
    toggleReadingGuide: () => void;
    resetSettings: () => void;
}

const defaultSettings: AccessibilitySettings = {
    highContrast: false,
    fontSize: 100,
    fontType: 'default',
    saturation: 100,
    readingGuide: false,
};

const AccessibilityContext = createContext<AccessibilityContextType | undefined>(undefined);

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
    const [settings, setSettings] = useState<AccessibilitySettings>(defaultSettings);
    const [mounted, setMounted] = useState(false);

    // Load from localStorage on mount
    useEffect(() => {
        const saved = localStorage.getItem('accommally-a11y-settings');
        if (saved) {
            try {
                setSettings(JSON.parse(saved));
            } catch (e) {
                console.error('Failed to parse accessibility settings', e);
            }
        }
        setMounted(true);
    }, []);

    // Save to localStorage on change
    useEffect(() => {
        if (mounted) {
            localStorage.setItem('accommally-a11y-settings', JSON.stringify(settings));
            applyGlobalStyles(settings);
        }
    }, [settings, mounted]);

    const applyGlobalStyles = (s: AccessibilitySettings) => {
        const html = document.documentElement;

        // High Contrast
        if (s.highContrast) {
            html.classList.add('high-contrast');
        } else {
            html.classList.remove('high-contrast');
        }

        // Font Size
        html.style.fontSize = `${s.fontSize}%`;

        // Font Type
        html.classList.remove('font-dyslexic', 'font-hyperlegible');
        if (s.fontType === 'dyslexic') html.classList.add('font-dyslexic');
        if (s.fontType === 'hyperlegible') html.classList.add('font-hyperlegible');

        // Saturation
        html.style.filter = `saturate(${s.saturation}%)`;

        // Reading Guide (Managed by Toolbar component usually, but state is here)
    };

    const toggleHighContrast = () => setSettings(prev => ({ ...prev, highContrast: !prev.highContrast }));
    const setFontSize = (size: number) => setSettings(prev => ({ ...prev, fontSize: Math.max(100, Math.min(200, size)) }));
    const setFontType = (type: FontType) => setSettings(prev => ({ ...prev, fontType: type }));
    const setSaturation = (saturation: number) => setSettings(prev => ({ ...prev, saturation: Math.max(0, Math.min(100, saturation)) }));
    const toggleReadingGuide = () => setSettings(prev => ({ ...prev, readingGuide: !prev.readingGuide }));

    const resetSettings = () => setSettings(defaultSettings);

    // During SSR/initial mount, render the provider with defaults
    // We avoid 'mounted' check blocking the Provider itself
    return (
        <AccessibilityContext.Provider
            value={{
                ...settings,
                toggleHighContrast,
                setFontSize,
                setFontType,
                setSaturation,
                toggleReadingGuide,
                resetSettings,
            }}
        >
            {children}
        </AccessibilityContext.Provider>
    );
}

export function useAccessibility() {
    const context = useContext(AccessibilityContext);
    if (context === undefined) {
        throw new Error('useAccessibility must be used within an AccessibilityProvider');
    }
    return context;
}
