const fs = require('fs');
const glob = require('glob');
const path = require('path');

const files = [
    'src/app/super-admin/(authenticated)/analytics/page.tsx',
    'src/app/super-admin/(authenticated)/settings/page.tsx',
    'src/app/super-admin/(authenticated)/tenants/new/page.tsx',
    'src/app/super-admin/(authenticated)/tenants/[id]/page.tsx',
    'src/app/super-admin/(authenticated)/tenants/[id]/edit/page.tsx',
    'src/app/super-admin/(authenticated)/tenants/[id]/templates/page.tsx',
    'src/app/super-admin/(authenticated)/equipment/page.tsx'
];

// In case some files don't exist yet, we will also use a glob over src/app/super-admin
const allFilesPath = path.join(__dirname, '../../../../src/app/super-admin');

function processFile(filePath) {
    if (!fs.existsSync(filePath)) return;
    let content = fs.readFileSync(filePath, 'utf8');
    
    const replacements = [
        ['bg-slate-800/50 backdrop-blur-xl border border-slate-700/50', 'bg-white shadow-sm border border-slate-200'],
        ['bg-slate-800/50', 'bg-white'],
        ['bg-slate-900/50', 'bg-slate-50'],
        ['bg-slate-800 rounded-2xl', 'bg-white rounded-2xl shadow-sm border border-slate-200'],
        ['border-slate-700/50', 'border-slate-200'],
        ['divide-slate-700/50', 'divide-slate-200'],
        ['text-white', 'text-slate-900'],
        ['text-slate-400', 'text-slate-500'],
        ['text-slate-300', 'text-slate-600'],
        ['text-slate-200', 'text-slate-700'],
        ['hover:text-white', 'hover:text-slate-900'],
        ['hover:bg-slate-700/20', 'hover:bg-slate-50'],
        ['hover:bg-slate-700/50', 'hover:bg-slate-100'],
        // Gradients/Badges
        ['from-violet-500/20 to-purple-500/20', 'from-violet-100 to-purple-100'],
        ['text-violet-400', 'text-violet-700'],
        ['from-green-500/20 to-emerald-500/20', 'from-green-100 to-emerald-100'],
        ['text-green-400', 'text-green-700'],
        ['from-amber-500/20 to-orange-500/20', 'from-amber-100 to-orange-100'],
        ['text-amber-400', 'text-amber-700'],
        ['from-blue-500/20 to-cyan-500/20', 'from-blue-100 to-cyan-100'],
        ['text-blue-400', 'text-blue-700'],
        ['from-rose-500/20 to-pink-500/20', 'from-rose-100 to-pink-100'],
        ['text-rose-400', 'text-rose-700'],
        ['bg-slate-700/30', 'bg-slate-200'],
        ['bg-violet-500/10', 'bg-violet-100'],
        ['bg-blue-500/10', 'bg-blue-100'],
        ['bg-green-500/10', 'bg-green-100'],
        ['bg-red-500/10', 'bg-red-100'],
        ['bg-amber-500/10', 'bg-amber-100'],
        ['bg-slate-500/10', 'bg-slate-100'],
        ['focus:border-violet-500/50', 'focus:border-violet-500'],
        ['focus:ring-violet-500/20', 'focus:ring-violet-500/20'],
        ['placeholder-slate-500', 'placeholder-slate-400'],
        ['from-violet-500/10 to-purple-500/10 border-violet-500/20', 'from-violet-50 to-purple-50 border-violet-100'],
        ['from-blue-500/10 to-cyan-500/10 border-blue-500/20', 'from-blue-50 to-cyan-50 border-blue-100'],
        ['from-amber-500/10 to-orange-500/10 border-amber-500/20', 'from-amber-50 to-orange-50 border-amber-100'],
        ['from-green-500/10 to-emerald-500/10 border-green-500/20', 'from-green-50 to-emerald-50 border-green-100'],
        ['from-cyan-500/10 to-teal-500/10 border-cyan-500/20', 'from-cyan-50 to-teal-50 border-cyan-100'],
        ['from-rose-500/10 to-pink-500/10 border-rose-500/20', 'from-rose-50 to-pink-50 border-rose-100']
    ];

    let newContent = content;
    replacements.forEach(([from, to]) => {
        newContent = newContent.split(from).join(to);
    });

    // Special fix for the solid buttons that shouldn't have changed text-white
    newContent = newContent.split('bg-indigo-700 hover:bg-indigo-600 text-slate-900').join('bg-indigo-700 hover:bg-indigo-600 text-white');
    newContent = newContent.split('!text-white').join('text-white');

    if (content !== newContent) {
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Updated', filePath);
    }
}

const findTsxFiles = (dir) => {
    let results = [];
    if (!fs.existsSync(dir)) return results;
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(findTsxFiles(file));
        } else if (file.endsWith('.tsx')) {
            results.push(file);
        }
    });
    return results;
}

const allFiles = findTsxFiles('C:/Users/csand/Documents/Projects/AccommAlly/accommally/src/app/super-admin/(authenticated)');

allFiles.forEach(f => processFile(f));
console.log('Done replacing themes in all super-admin authenticated files!');
