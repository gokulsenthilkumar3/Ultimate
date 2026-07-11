const fs = require('fs');
const glob = require('glob'); // Note: we can just use fs.readdirSync recursively
const path = require('path');

function getFiles(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        file = path.join(dir, file);
        const stat = fs.statSync(file);
        if (stat && stat.isDirectory()) { 
            results = results.concat(getFiles(file));
        } else if (file.endsWith('.jsx')) {
            results.push(file);
        }
    });
    return results;
}

const files = getFiles('src/components');
files.push('src/App.jsx');

let totalReplaced = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // Pattern 1: hover-bg-subtle (rgba(255,255,255,0.06) or 0.02)
    content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.background = 'rgba\(255,255,255,0\.0[26]\)'\}\s*onMouseLeave=\{e => e\.currentTarget\.style\.background = 'transparent'\}/g, '');
    
    // Pattern 2: hover-text-danger
    content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.color = 'var\(--danger\)'\}\s*onMouseLeave=\{e => e\.currentTarget\.style\.color = 'var\(--text-3\)'\}/g, '');
    
    // Pattern 3: hover-border-accent
    content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.borderColor = 'var\(--accent\)'\}\s*onMouseLeave=\{e => e\.currentTarget\.style\.borderColor = 'var\(--border\)'\}/g, '');
    
    // Pattern 4: hover-scale-125
    content = content.replace(/onMouseEnter=\{\(e\) => \(e\.currentTarget\.style\.transform = 'scale\(1\.25\)'\)\}\s*onMouseLeave=\{\(e\) => \(e\.currentTarget\.style\.transform = 'scale\(1\)'\)\}/g, '');
    
    // Pattern 5: hover-scale-11
    content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.transform = 'scale\(1\.1\)'\}\s*onMouseLeave=\{e => e\.currentTarget\.style\.transform = 'scale\(1\)'\}/g, '');
    
    // Pattern 6: hover-text-1
    content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.color = 'var\(--text-1\)'\}\s*onMouseLeave=\{e => e\.currentTarget\.style\.color = 'var\(--text-3\)'\}/g, '');

    // Pattern 7: hover-bg-elevated
    content = content.replace(/onMouseEnter=\{e => \{ if \(selected !== note\.id\) e\.currentTarget\.style\.background = 'var\(--bg-elevated\)'; \}\}\s*onMouseLeave=\{e => \{ if \(selected !== note\.id\) e\.currentTarget\.style\.background = 'transparent'; \}\}/g, '');
    
    // Pattern 8: hover-opacity-100
    content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.opacity = 1\}\s*onMouseLeave=\{e => e\.currentTarget\.style\.opacity = 0\.5\}/g, '');
    
    // Pattern 9: hover-opacity-75
    content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.opacity = '0\.75'\}\s*onMouseLeave=\{e => e\.currentTarget\.style\.opacity = '1'\}/g, '');
    
    // Pattern 10: Timesheet delete
    content = content.replace(/onMouseEnter=\{e => \{ e\.currentTarget\.style\.color = 'var\(--danger\)'; e\.currentTarget\.style\.background = 'rgba\(248,113,113,0\.1\)'; \}\}\s*onMouseLeave=\{e => \{ e\.currentTarget\.style\.color = 'var\(--text-3\)'; e\.currentTarget\.style\.background = 'transparent'; \}\}/g, '');

    // Pattern 11: Notification center
    content = content.replace(/onMouseEnter=\{e => \{ e\.currentTarget\.style\.borderColor = 'rgba\(255,255,255,0\.15\)'; e\.currentTarget\.style\.color = 'var\(--text-1\)'; \}\}\s*onMouseLeave=\{e => \{ e\.currentTarget\.style\.borderColor = 'rgba\(255,255,255,0\.05\)'; e\.currentTarget\.style\.color = 'var\(--text-3\)'; \}\}/g, '');
    
    // Clean up empty lines left behind
    content = content.replace(/^\s*/gm, '\n');

    if (original !== content) {
        fs.writeFileSync(file, content, 'utf8');
        totalReplaced++;
        console.log('Updated: ' + file);
    }
});

console.log('Total files updated: ' + totalReplaced);
