const fs = require('fs');

let file = 'src/components/Tasks.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix remaining submit button in Tasks
content = content.replace(/<button type="submit"\s*style={{[^}]+}}\s*>/g, '<button type="submit" className="btn btn-primary">');
content = content.replace(/style={{ flex: 1, padding: '12px', borderRadius: '10px', fontSize: '0.85rem',\s*fontWeight: 700, background: 'var\(--accent\)', color: '#000',\s*border: 'none', cursor: 'pointer' }}/g, '');

// Clean empty lines inside tags
content = content.replace(/<button type="button" className="btn btn-secondary" onClick={resetForm}\s*>\s*Cancel<\/button>/g, '<button type="button" className="btn btn-secondary" onClick={resetForm}>Cancel</button>');

fs.writeFileSync(file, content, 'utf8');
console.log('Migrated submit buttons in Tasks.tsx');
