const fs = require('fs');

const files = [
  'src/components/Tasks.tsx',
  'src/components/Projects.jsx'
];

files.forEach(file => {
  let content = fs.readFileSync(file, 'utf8');

  // Tasks generic form inputs
  content = content.replace(/style={{\s*width:\s*'100%',\s*background:\s*'var\(--bg-input\)',\s*border:\s*'1px solid var\(--border\)',\s*borderRadius:\s*'10px',\s*padding:\s*'12px 14px',\s*color:\s*'var\(--text-1\)',\s*fontSize:\s*'0.88rem'\s*}}/g, '');
  content = content.replace(/style={{\s*width:\s*'100%',\s*resize:\s*'none',\s*background:\s*'var\(--bg-input\)',\s*border:\s*'1px solid var\(--border\)',\s*borderRadius:\s*'10px',\s*padding:\s*'12px 14px',\s*color:\s*'var\(--text-1\)',\s*fontSize:\s*'0.88rem'\s*}}/g, '');
  content = content.replace(/style={{\s*width:\s*'100%',\s*background:\s*'var\(--bg-input\)',\s*border:\s*'1px solid var\(--border\)',\s*borderRadius:\s*'10px',\s*padding:\s*'10px 12px',\s*color:\s*'var\(--text-1\)'\s*}}/g, '');

  // Cancel buttons in forms
  content = content.replace(/style={{\s*flex:\s*1,\s*padding:\s*'12px',\s*borderRadius:\s*'10px',\s*fontSize:\s*'0.85rem',\s*fontWeight:\s*700,\s*background:\s*'none',\s*border:\s*'1px solid var\(--border\)',\s*color:\s*'var\(--text-2\)',\s*cursor:\s*'pointer'\s*}}/g, '');
  content = content.replace(/onMouseEnter={e => e\.currentTarget\.style\.borderColor\s*=\s*'var\(--text-3\)'}/g, '');
  content = content.replace(/onMouseLeave={e => e\.currentTarget\.style\.borderColor\s*=\s*'var\(--border\)'}/g, '');
  content = content.replace(/<button type="button" onClick={resetForm}/g, '<button type="button" className="btn btn-secondary" onClick={resetForm}');
  
  // Projects.jsx specific
  content = content.replace(/style={{\s*width:\s*'100%',\s*background:\s*'var\(--bg-input\)',\s*border:\s*'1px solid var\(--border\)',\s*color:\s*'var\(--text-1\)',\s*padding:\s*'0.8rem',\s*borderRadius:\s*'12px'\s*}}/g, '');
  content = content.replace(/style={{\s*width:\s*'100%',\s*background:\s*'var\(--bg-input\)',\s*border:\s*'1px solid var\(--border\)',\s*color:\s*'var\(--text-1\)',\s*padding:\s*'0.8rem',\s*borderRadius:\s*'12px',\s*minHeight:\s*'100px',\s*resize:\s*'vertical'\s*}}/g, '');
  
  content = content.replace(/ style={{\s*}}/g, '');
  
  fs.writeFileSync(file, content, 'utf8');
  console.log('Migrated final classes in ' + file);
});
