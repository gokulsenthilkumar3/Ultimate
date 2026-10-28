import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'node:fs';
import path from 'node:path';
const root=process.cwd(),output=path.join(root,'.tmp/realism-review/results');
export default defineConfig({root,base:'/',plugins:[react(),{name:'local-render-evidence',configureServer(server){server.middlewares.use(async(req,res,next)=>{
  if(req.url==='/__realism-review/result' && req.method==='POST') {try {let data='';for await(const chunk of req){data+=chunk;if(data.length>6000000)throw new Error('Evidence too large');}const {evidence,image}=JSON.parse(data),id=(evidence.model+'-'+evidence.id).replace(/[^a-zA-Z0-9_-]/g,'');fs.mkdirSync(output,{recursive:true});fs.writeFileSync(path.join(output,id+'.json'),JSON.stringify(evidence,null,2));fs.writeFileSync(path.join(output,id+'.png'),Buffer.from(image.split(',')[1],'base64'));res.statusCode=200;res.end('Saved');}catch(error){res.statusCode=400;res.end(error.message);}return;}
  if(req.url?.startsWith('/__realism-review/image/')){const id=decodeURIComponent(req.url.split('/').pop()).replace(/[^a-zA-Z0-9_.-]/g,'');const file=path.join(output,id);if(fs.existsSync(file)){res.setHeader('Content-Type','image/png');res.end(fs.readFileSync(file));return;}}
  next();
});}}],server:{host:'127.0.0.1',port:5182,strictPort:true},build:{outDir:'.tmp/realism-review/dist'}});
