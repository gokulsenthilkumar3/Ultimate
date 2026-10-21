const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    isDirectory ? walkDir(dirPath, callback) : callback(path.join(dir, f));
  });
}

walkDir('./src', (filePath) => {
  if (filePath.endsWith('.js') || filePath.endsWith('.jsx') || filePath.endsWith('.ts') || filePath.endsWith('.tsx')) {
    let content = fs.readFileSync(filePath, 'utf-8');
    let changed = false;
    
    // Fix broken imports like: import safeLocalStorage from \'..\utils\safeLocalStorage\';\n
    if (content.includes("import safeLocalStorage from \\'..\\utils\\safeLocalStorage\\';\\n")) {
      content = content.replace("import safeLocalStorage from \\'..\\utils\\safeLocalStorage\\';\\n", "import safeLocalStorage from '../utils/safeLocalStorage';\n");
      changed = true;
    }
    // Also handle possible other paths
    if (content.includes("import safeLocalStorage from \\'") || content.includes("\\nimport")) {
       content = content.replace(/import safeLocalStorage from \\'([^']+)\\';\\n/g, "import safeLocalStorage from '$1';\n");
       changed = true;
    }
    
    // Fix \\'localStorage\\' -> 'localStorage'
    if (content.includes("\\'localStorage\\'")) {
        content = content.replace(/\\'localStorage\\'/g, "'localStorage'");
        changed = true;
    }

    if (changed) {
      fs.writeFileSync(filePath, content);
      console.log('Fixed syntax in ' + filePath);
    }
  }
});
