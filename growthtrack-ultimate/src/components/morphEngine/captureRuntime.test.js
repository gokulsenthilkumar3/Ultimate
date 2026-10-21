import {describe,it,expect,vi} from 'vitest';
import {captureAvatarImage,registerCaptureScene,registerCaptureComposer} from './captureRuntime';
import {pngFileFromDataUrl,exportSize} from '../../lib/avatarCapturePolicy';

function fixture() {
  let width=640,height=480,ratio=1.5;
  const canvas={width:960,height:720,toDataURL:vi.fn(()=> 'data:image/png;base64,iVBORw==')};
  const gl={capabilities:{maxTextureSize:8192},getSize:v=>v.set(width,height),getPixelRatio:()=>ratio,
    setPixelRatio:vi.fn(value=>{ratio=value;}),setSize:vi.fn((w,h)=>{width=w;height=h;canvas.width=w*ratio;canvas.height=h*ratio;}),render:vi.fn()};
  const camera={aspect:4/3,updateProjectionMatrix:vi.fn()},composer={setSize:vi.fn(),render:vi.fn()};
  registerCaptureScene(canvas,{gl,scene:{},camera});registerCaptureComposer(canvas,composer);
  return {canvas,gl,camera,composer};
}
describe('rendered still capture',()=>{
  it('renders above viewport resolution through the active composer and restores the live scene',()=>{
    const {canvas,gl,camera,composer}=fixture();
    canvas.toDataURL.mockImplementation(()=>{
      expect(canvas.width).toBe(1920);expect(canvas.height).toBe(1440);
      return 'data:image/png;base64,iVBORw==';
    });
    captureAvatarImage(canvas,{scale:2});
    expect(composer.render).toHaveBeenCalledTimes(2);expect(gl.render).not.toHaveBeenCalled();
    expect(gl.getPixelRatio()).toBe(1.5);expect(canvas.width).toBe(960);expect(canvas.height).toBe(720);expect(camera.aspect).toBe(4/3);
    expect(composer.setSize).toHaveBeenLastCalledWith(640,480);
  });
  it('restores resolution and projection when image encoding fails',()=>{
    const {canvas,gl,camera}=fixture();canvas.toDataURL.mockImplementation(()=>{throw new Error('encoding failed');});
    expect(()=>captureAvatarImage(canvas,{scale:4})).toThrow('encoding failed');
    expect(gl.getPixelRatio()).toBe(1.5);expect(canvas.width).toBe(960);expect(camera.aspect).toBe(4/3);
  });
  it('keeps large images inside device and pixel limits, preserving aspect',()=>{
    const size=exportSize(3000,2000,{scale:4,maxPixels:16777216,maxTexture:4096});
    expect(size.width).toBeLessThanOrEqual(4096);expect(size.width*size.height).toBeLessThanOrEqual(16777216);
    expect(size.width/size.height).toBeCloseTo(1.5,2);expect(size.clamped).toBe(true);
  });
  it('prepares a real PNG file without including the owner or measurement data',()=>{
    const file=pngFileFromDataUrl('data:image/png;base64,iVBORw==');
    expect(file.type).toBe('image/png');expect(file.size).toBe(4);expect(file.name).toMatch(/^physique-\d{4}-\d{2}-\d{2}\.png$/);
    expect(pngFileFromDataUrl('data:text/html;base64,YQ==')).toBeNull();
  });
});
