const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(file));
        } else {
            if (file.endsWith('.tsx') || file.endsWith('.ts')) {
                results.push(file);
            }
        }
    });
    return results;
}

const files = walk('./src/app/dashboard');

let replacements = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    content = content.replace(/\bbg-white\b(?!\sdark:)/g, 'bg-white dark:bg-slate-950');
    content = content.replace(/\bbg-slate-50\b(?!\/)(?!\sdark:)/g, 'bg-slate-50 dark:bg-slate-900');
    content = content.replace(/\bbg-slate-50\/50\b(?!\sdark:)/g, 'bg-slate-50/50 dark:bg-slate-900/50');
    content = content.replace(/\bbg-slate-100\b(?!\sdark:)/g, 'bg-slate-100 dark:bg-slate-800');

    content = content.replace(/\bhover:bg-slate-50\b(?!\/)(?!\sdark:)/g, 'hover:bg-slate-50 dark:hover:bg-slate-800');
    content = content.replace(/\bhover:bg-slate-50\/50\b(?!\sdark:)/g, 'hover:bg-slate-50/50 dark:hover:bg-slate-800/50');
    content = content.replace(/\bhover:bg-slate-100\b(?!\sdark:)/g, 'hover:bg-slate-100 dark:hover:bg-slate-800');

    content = content.replace(/\bborder-slate-200\b(?!\sdark:)/g, 'border-slate-200 dark:border-slate-800');
    content = content.replace(/\bborder-slate-100\b(?!\sdark:)/g, 'border-slate-100 dark:border-slate-800');
    content = content.replace(/\bborder-slate-300\b(?!\sdark:)/g, 'border-slate-300 dark:border-slate-700');

    content = content.replace(/\btext-slate-800\b(?!\sdark:)/g, 'text-slate-800 dark:text-slate-200');
    content = content.replace(/\btext-slate-700\b(?!\sdark:)/g, 'text-slate-700 dark:text-slate-300');
    content = content.replace(/\btext-slate-600\b(?!\sdark:)/g, 'text-slate-600 dark:text-slate-400');
    content = content.replace(/\btext-slate-500\b(?!\sdark:)/g, 'text-slate-500 dark:text-slate-400');

    content = content.replace(/\bbg-blue-50\b(?!\sdark:)/g, 'bg-blue-50 dark:bg-blue-900/40');
    content = content.replace(/\bborder-blue-100\b(?!\sdark:)/g, 'border-blue-100 dark:border-blue-800/50');
    content = content.replace(/\bbg-amber-50\b(?!\sdark:)/g, 'bg-amber-50 dark:bg-amber-900/40');
    content = content.replace(/\bborder-amber-200\b(?!\sdark:)/g, 'border-amber-200 dark:border-amber-800/50');
    content = content.replace(/\bbg-amber-100\/50\b(?!\sdark:)/g, 'bg-amber-100/50 dark:bg-amber-900/40');

    content = content.replace(/\btext-amber-800\b(?!\sdark:)/g, 'text-amber-800 dark:text-amber-400');
    content = content.replace(/\btext-blue-800\b(?!\sdark:)/g, 'text-blue-800 dark:text-blue-400');

    if (content !== original) {
        fs.writeFileSync(file, content, 'utf8');
        replacements++;
        console.log('Updated', file);
    }
});

console.log('Total files updated:', replacements);
