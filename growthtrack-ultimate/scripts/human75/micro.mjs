import {deflateSync} from 'node:zlib';
const crcTable=Uint32Array.from({length:256},(_,i)=>{for(let j=0;j<8;j++)i=i&1?0xedb88320^(i>>>1):i>>>1;return i>>>0;});
function png(size,rgba){
  const chunk=(type,data)=>{const name=Buffer.from(type),bytes=Buffer.concat([name,data]);let crc=0xffffffff;for(const byte of bytes)crc=crcTable[(crc^byte)&255]^(crc>>>8);
    const head=Buffer.alloc(4),tail=Buffer.alloc(4);head.writeUInt32BE(data.length);tail.writeUInt32BE((crc^0xffffffff)>>>0);return Buffer.concat([head,bytes,tail]);};
  const header=Buffer.alloc(13);header.writeUInt32BE(size);header.writeUInt32BE(size,4);header[8]=8;header[9]=6;
  const rows=Buffer.alloc(size*(size*4+1));for(let y=0;y<size;y++)Buffer.from(rgba.buffer,y*size*4,size*4).copy(rows,y*(size*4+1)+1);
  return Buffer.concat([Buffer.from([137,80,78,71,13,10,26,10]),chunk('IHDR',header),chunk('IDAT',deflateSync(rows)),chunk('IEND',Buffer.alloc(0))]);
}
export function generateMicro(config){
  const {size,cells,seed}=config,heights=new Float32Array(size*size),height=new Uint8Array(size*size*4),normal=new Uint8Array(height.length);
  const hash=(x,y)=>{let n=(Math.imul(x+seed,374761393)^Math.imul(y+seed,668265263))>>>0;n=Math.imul(n^(n>>>13),1274126177)>>>0;return ((n^(n>>>16))>>>0)/4294967296;};
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const u=x/size*cells,v=y/size*cells;let value=.56;
    for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
      const cx=Math.floor(u)+dx,cy=Math.floor(v)+dy,ix=(cx%cells+cells)%cells,iy=(cy%cells+cells)%cells;
      const px=cx+.2+.6*hash(ix,iy),py=cy+.2+.6*hash(iy,ix+cells),radius=.1+.1*hash(ix+cells,iy);
      value-=Math.exp(-((u-px)**2+(v-py)**2)/(radius*radius))*(.3+.2*hash(ix,iy+cells));
    }
    value+=.035*Math.sin(u*Math.PI*2)*Math.sin(v*Math.PI*2);heights[y*size+x]=value;
  }
  const at=(x,y)=>heights[((y+size)%size)*size+(x+size)%size];
  for(let y=0;y<size;y++)for(let x=0;x<size;x++){
    const index=(y*size+x)*4,h=Math.round(at(x,y)*255),dx=(at(x+1,y)-at(x-1,y))*size*config.heightMetres/config.tileMetres,dy=(at(x,y+1)-at(x,y-1))*size*config.heightMetres/config.tileMetres;
    const length=Math.hypot(dx,dy,1);height.set([h,h,h,255],index);normal.set([Math.round((.5-dx/length*.5)*255),Math.round((.5-dy/length*.5)*255),Math.round((.5+.5/length)*255),255],index);
  }
  return {height:png(size,height),normal:png(size,normal),heights};
}
