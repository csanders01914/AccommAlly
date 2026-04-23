'use client';

import { useState } from 'react';
import { useAccessibility } from './AccessibilityContext';
import { Eye, Type, Minus, Plus, Maximize, RotateCcw, X, PersonStanding } from 'lucide-react';

export default function AccessibilityToolbar() {
 const {
 highContrast,
 toggleHighContrast,
 fontSize,
 setFontSize,
 fontType,
 setFontType,
 saturation,
 setSaturation,
 readingGuide,
 toggleReadingGuide,
 resetSettings
 } = useAccessibility();

 const [isOpen, setIsOpen] = useState(false);

 if (!isOpen) {
 return (
 <button
 onClick={() => setIsOpen(true)}
 className="fixed bottom-6 right-6 z-50 p-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 high-contrast:bg-yellow-400 high-contrast:text-black"
 aria-label="Open Accessibility Options"
 >
 <PersonStanding className="w-6 h-6" />
 </button>
 );
 }

 return (
 <div className="fixed bottom-6 right-6 z-50 w-80 bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden text-slate-900 dark:text-white high-contrast:bg-black high-contrast:border-white high-contrast:text-yellow-400">
 {/* Header */}
 <div className="flex items-center justify-between p-4 bg-indigo-600 text-white high-contrast:bg-yellow-400 high-contrast:text-black">
 <div className="flex items-center gap-2">
 <PersonStanding className="w-5 h-5" />
 <span className="font-bold">Accessibility</span>
 </div>
 <button
 onClick={() => setIsOpen(false)}
 className="p-1 hover:bg-white/10 rounded-lg transition-colors"
 >
 <X className="w-5 h-5" />
 </button>
 </div>

 {/* Content */}
 <div className="p-4 space-y-6 max-h-[80vh] overflow-y-auto">

 {/* Contrast */}
 <div className="space-y-3">
 <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 high-contrast:text-white">
 <Eye className="w-4 h-4" />
 Display
 </div>
 <button
 onClick={toggleHighContrast}
 className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${highContrast
 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 high-contrast:bg-yellow-400 high-contrast:text-black high-contrast:border-yellow-400'
 : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500'
 }`}
 >
 <span className="font-medium">High Contrast Mode</span>
 <div className={`w-10 h-6 rounded-full p-1 transition-colors ${highContrast ? 'bg-indigo-600 high-contrast:bg-black' : 'bg-slate-300'}`}>
 <div className={`w-4 h-4 rounded-full bg-white transition-transform ${highContrast ? 'translate-x-4' : ''}`} />
 </div>
 </button>

 <div className="space-y-2">
 <label className="text-sm font-medium flex justify-between">
 Saturation
 <span>{saturation}%</span>
 </label>
 <input
 type="range"
 min="0"
 max="100"
 step="10"
 value={saturation}
 onChange={(e) => setSaturation(parseInt(e.target.value))}
 className="w-full"
 />
 </div>
 </div>

 {/* Typography */}
 <div className="space-y-3">
 <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 high-contrast:text-white">
 <Type className="w-4 h-4" />
 Typography
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium flex justify-between">
 Text Size
 <span>{fontSize}%</span>
 </label>
 <div className="flex items-center gap-2">
 <button
 onClick={() => setFontSize(fontSize - 10)}
 className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors high-contrast:border-white high-contrast:text-yellow-400"
 aria-label="Decrease font size"
 >
 <Minus className="w-4 h-4" />
 </button>
 <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden high-contrast:bg-gray-800">
 <div className="h-full bg-indigo-600 high-contrast:bg-yellow-400" style={{ width: `${(fontSize - 100)}%` }} />
 </div>
 <button
 onClick={() => setFontSize(fontSize + 10)}
 className="p-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors high-contrast:border-white high-contrast:text-yellow-400"
 aria-label="Increase font size"
 >
 <Plus className="w-4 h-4" />
 </button>
 </div>
 </div>

 <div className="space-y-2">
 <label className="text-sm font-medium">Font Type</label>
 <div className="grid grid-cols-1 gap-2">
 {[
 { id: 'default', name: 'Default Sans' },
 { id: 'dyslexic', name: 'Open Dyslexic' },
 { id: 'hyperlegible', name: 'Atkinson Hyperlegible' }
 ].map((font) => (
 <button
 key={font.id}
 onClick={() => setFontType(font.id as any)}
 className={`px-3 py-2 text-left text-sm rounded-lg border transition-all ${fontType === font.id
 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 high-contrast:bg-yellow-400 high-contrast:text-black high-contrast:border-yellow-400'
 : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500'
 }`}
 >
 {font.name}
 </button>
 ))}
 </div>
 </div>
 </div>

 {/* Tools */}
 <div className="space-y-3">
 <div className="flex items-center gap-2 font-semibold text-sm uppercase tracking-wider text-slate-500 dark:text-slate-400 high-contrast:text-white">
 <Maximize className="w-4 h-4" />
 Tools
 </div>
 <button
 onClick={toggleReadingGuide}
 className={`w-full flex items-center justify-between p-3 rounded-lg border-2 transition-all ${readingGuide
 ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300 high-contrast:bg-yellow-400 high-contrast:text-black high-contrast:border-yellow-400'
 : 'border-slate-200 dark:border-slate-700 hover:border-indigo-500'
 }`}
 >
 <span className="font-medium">Reading Guide</span>
 <div className={`w-10 h-6 rounded-full p-1 transition-colors ${readingGuide ? 'bg-indigo-600 high-contrast:bg-black' : 'bg-slate-300'}`}>
 <div className={`w-4 h-4 rounded-full bg-white transition-transform ${readingGuide ? 'translate-x-4' : ''}`} />
 </div>
 </button>
 </div>

 {/* Reset */}
 <div className="pt-4 border-t border-slate-200 dark:border-slate-700">
 <button
 onClick={resetSettings}
 className="w-full flex items-center justify-center gap-2 p-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 high-contrast:text-white high-contrast:hover:text-yellow-400 transition-colors text-sm font-medium"
 >
 <RotateCcw className="w-4 h-4" />
 Reset All Settings
 </button>
 </div>
 </div>

 {/* Reading Guide Overlay */}
 {readingGuide && (
 <div className="fixed inset-0 pointer-events-none z-[100] hidden md:block">
 <div
 className="w-full h-8 bg-yellow-400/20 border-y-2 border-yellow-500/50 absolute top-[50%] -translate-y-[50%]"
 style={{ top: 'var(--mouse-y, 50%)' }}
 />
 <div
 className="fixed inset-0 bg-black/10 "
 style={{ maskImage: 'linear-gradient(to bottom, black calc(var(--mouse-y, 50%) - 40px), transparent calc(var(--mouse-y, 50%) - 40px), transparent calc(var(--mouse-y, 50%) + 40px), black calc(var(--mouse-y, 50%) + 40px))' }}
 />
 </div>
 )}
 </div>
 );
}

// Global mouse tracker for reading guide
if (typeof window !== 'undefined') {
 window.addEventListener('mousemove', (e) => {
 document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`);
 });
}
