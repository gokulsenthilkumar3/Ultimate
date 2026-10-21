const fs = require('fs');
let css = fs.readFileSync('src/styles/chamber.css', 'utf8');
css = css.replace(/(\s+)backdrop-filter:(.*?);/g, '$1-webkit-backdrop-filter:$2;$1backdrop-filter:$2;');
fs.writeFileSync('src/styles/chamber.css', css);
console.log('Fixed chamber.css successfully.');
