const fs = require('fs');

const files = [
  'src/components/ProfileEditor.jsx',
  'src/components/Tasks.tsx',
  'src/components/Projects.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Simplify inputs by removing style block inside form-input completely if it contains width 100%
  // or font stuff.
  content = content.replace(/style={{\s*width:\s*'100%',\s*fontSize:\s*'0.95rem',\s*fontWeight:\s*500,\s*fontFamily:\s*'var\(--font-display\)'(?:,\s*paddingLeft:[^}]+)?\s*}}/g, "style={prefix ? { paddingLeft: `calc(18px + ${prefix.length}ch)` } : {}}");

  // Fix custom buttons to use .btn-primary
  content = content.replace(/style={{\s*background:\s*'var\(--accent\)',\s*color:\s*'white',\s*border:\s*'none',\s*padding:\s*'0.75rem 1.5rem',\s*borderRadius:\s*'12px',\s*fontWeight:\s*700,\s*cursor:\s*'pointer',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'0.5rem',\s*opacity:\s*[^,]+,\s*transition:\s*'all 0.2s'\s*}}/g, "className=\"btn btn-primary\"");

  // Another save button format
  content = content.replace(/style={{\s*background:\s*'var\(--accent\)',\s*color:\s*'#fff',\s*border:\s*'none',\s*padding:\s*'0.75rem 1.5rem',\s*borderRadius:\s*'12px',\s*fontWeight:\s*700,\s*cursor:\s*'pointer',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'0.5rem',\s*transition:\s*'all 0.2s'\s*}}/g, "className=\"btn btn-primary\"");

  // Tasks generic submit button
  content = content.replace(/style={{\s*background:\s*'var\(--accent\)',\s*color:\s*'#000',\s*border:\s*'none',\s*padding:\s*'10px 20px',\s*borderRadius:\s*'10px',\s*fontWeight:\s*700,\s*cursor:\s*'pointer'\s*}}/g, "className=\"btn btn-primary\"");

  // Projects save button
  content = content.replace(/style={{\s*padding:\s*'0.5rem 1.5rem',\s*background:\s*'var\(--accent\)',\s*color:\s*'#000',\s*border:\s*'none',\s*borderRadius:\s*'12px',\s*fontWeight:\s*700,\s*cursor:\s*'pointer',\s*display:\s*'flex',\s*alignItems:\s*'center',\s*gap:\s*'0.5rem'\s*}}/g, "className=\"btn btn-primary\"");

  // Clean empty styles again
  content = content.replace(/ style={{}}/g, '');

  fs.writeFileSync(file, content, 'utf8');
  console.log('Migrated more classes in ' + file);
});
