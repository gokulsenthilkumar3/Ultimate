// The UI reads the actual camera through this canvas-scoped bridge. It never
// derives a bookmark from preset labels or the last requested camera position.
const cameras=new WeakMap();
export function registerBookmarkCamera(canvas,read) {
  cameras.set(canvas,read);return()=>{if(cameras.get(canvas)===read)cameras.delete(canvas);};
}
export function readBookmarkCamera(canvas) {return cameras.get(canvas)?.() || null;}
