const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        let dirPath = path.join(dir, f);
        let isDirectory = fs.statSync(dirPath).isDirectory();
        isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
    });
}

const OLD_BG = /#F8F7F5/gi;
const NEW_BG = '#FAF6EE';

let fileCount = 0;
let modifiedCount = 0;

walkDir('c:/Users/csand/Documents/Projects/AccommAlly/accommally/src', function(filePath) {
    if (!filePath.endsWith('.tsx') && !filePath.endsWith('.ts') && !filePath.endsWith('.css')) return;

    fileCount++;
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(OLD_BG, NEW_BG);

    if (content !== original) {
        fs.writeFileSync(filePath, content, 'utf8');
        modifiedCount++;
    }
});

console.log(`Scanned ${fileCount} files, modified ${modifiedCount} files.`);
