const fs = require('fs');
const path = require('path');

const fileToModify = path.join(__dirname, '../src/components/calendar/EnhancedCalendarView.tsx');
let content = fs.readFileSync(fileToModify, 'utf8');

// Colors replacement mapping
const replacements = [
  // Type Colors definitions
  ['bg-blue-500/20', 'bg-blue-50'],
  ['bg-purple-500/20', 'bg-purple-50'],
  ['bg-red-500/20', 'bg-red-50'],
  ['text-blue-400', 'text-blue-700'],
  ['text-purple-400', 'text-purple-700'],
  ['text-red-400', 'text-red-700'],
  ['bg-red-500/20 text-red-400', 'bg-red-100 text-red-700'],
  ['bg-red-600/20 text-red-400', 'bg-red-100 text-red-700'],
  ['hover:bg-red-600/30', 'hover:bg-red-200'],

  // Borders
  ['border-gray-700/50', 'border-[#E5E2DB]'],
  ['border-gray-700/30', 'border-[#E5E2DB]'],
  ['border-gray-700', 'border-[#E5E2DB]'],
  ['border-gray-200', 'border-[#E5E2DB]'],

  // Background and hovers
  ['hover:bg-gray-800/50', 'hover:bg-[#F8F7F5]'],
  ['hover:bg-gray-800/30', 'hover:bg-[#F8F7F5]'],
  ['hover:bg-gray-800', 'hover:bg-[#F8F7F5]'],
  ['hover:bg-gray-700/50', 'hover:bg-[#E5E2DB]'],
  ['hover:bg-gray-700', 'hover:bg-[#E5E2DB]'],
  ['hover:bg-gray-600', 'hover:bg-[#D4D0C5]'],
  
  ['bg-gray-900/50', 'bg-[#F8F7F5]'],
  ['bg-gray-900', 'bg-[#FFFFFF]'],
  ['bg-gray-800/50', 'bg-[#F8F7F5]'],
  ['bg-gray-800/30', 'bg-[#F8F7F5]'],
  ['bg-gray-800', 'bg-[#FFFFFF]'],
  ['bg-gray-700', 'bg-[#F8F7F5]'],
  ['bg-gray-600', 'bg-[#E5E2DB]'],

  // Text colors
  ['text-gray-300', 'text-[#1C1A17]'],
  ['text-gray-400', 'text-[#8C8880]'],
  ['text-gray-500', 'text-[#8C8880]'],
  ['text-gray-600', 'text-[#8C8880]'],
  
  // Custom text-white to text-[#1C1A17] outside of bg-blue-600 buttons
  ['text-white', 'text-[#1C1A17]'],
];

replacements.forEach(([from, to]) => {
  content = content.split(from).join(to);
});

// Since we replaced all text-white with text-[#1C1A17], we need to add it back to bg-blue-600 components
content = content.split('bg-blue-600 text-[#1C1A17]').join('bg-blue-600 text-white');

fs.writeFileSync(fileToModify, content, 'utf8');
console.log('Done refactoring EnhancedCalendarView.tsx');
