const fs = require('fs');

const files = [
  'src/components/ProfileEditor.jsx',
  'src/components/Tasks.tsx',
  'src/components/Projects.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Replace label-caps with form-label and remove inline styles
  content = content.replace(/<label className="label-caps" style={{[^}]+}}>/g, '<label className="form-label">');
  content = content.replace(/<label style={{[^}]+}} className="label-caps">/g, '<label className="form-label">');
  content = content.replace(/<label className="label-caps"[^>]*>/g, '<label className="form-label">');

  // Clean up form-input styles that are redundant
  content = content.replace(/style={{ width: '100%', fontSize: '0.95rem', fontWeight: 500, fontFamily: 'var\(--font-display\)'(?:, paddingLeft: [^}]+)? }}/g, '');
  content = content.replace(/style={{ width: '100%' }}/g, '');
  content = content.replace(/style={{\s*width:\s*'100%',?\s*}}/g, '');

  // Glass card and panel
  content = content.replace(/style={{\s*background:\s*'var\(--bg-elevated\)',\s*borderRadius:\s*'12px',\s*border:\s*'1px solid var\(--border\)'(?:,\s*padding:\s*'[^']+')?\s*}}/g, "className=\"glass-card\"");
  content = content.replace(/style={{\s*background:\s*'var\(--bg-panel\)',\s*borderRadius:\s*'16px',\s*padding:\s*'2rem',\s*border:\s*'1px solid var\(--border\)'\s*}}/g, "className=\"glass-panel\"");
  
  // Clean up empty style attributes left behind
  content = content.replace(/ style={{\s*}}/g, '');
  content = content.replace(/ style={{ }}/g, '');
  content = content.replace(/ style={{}}/g, '');

  // Convert custom dropdowns/selects to use form-input instead of hardcoded selects
  // In Projects.jsx and Tasks.tsx, they might just need standard `form-input` for selects.
  content = content.replace(/className="[^"]*dropdown[^"]*"/g, (match) => {
    if (match.includes("form-input")) return match;
    // skip actual component names, just generic ones if they exist, but let's be safe.
    return match;
  });

  fs.writeFileSync(file, content, 'utf8');
  console.log('Migrated classes in ' + file);
});
