import type { Locator, Page } from '@playwright/test';
import { expect, OWNER, emptyState } from '../foundation-fixture';
import { writeFile } from 'node:fs/promises';

export async function setupHumanViewer(page: Page, reducedMotion: 'reduce' | 'no-preference', appearanceMetrics: Record<string, unknown> = {}, bodyOverrides: Record<string, unknown> = {}, options: { studio?: boolean, tools?: boolean } = { studio: true, tools: true }) {
  const errors: string[] = [], bodyWrites: unknown[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /THREE|shader|WebGL/i.test(message.text())) errors.push(message.text());
  });
  let targets: any = { appearanceMetrics, goalMetrics: {height:175,weight:70,waist:76}, viewerPreferences: { showStage: false, backgroundMode: 'color', backgroundColor: '#20242b', qualityPreference: 'balanced' } };
  let body = { heightCm: 175, weightKg: 74, bodyFatPct: 19, waistCm: 82, chestCm: 99, hipsCm: 96, modelPreset: 'male', biologicalSex: 'male', ...bodyOverrides };
  let nextBodyGate: { started: () => void, wait: Promise<void> } | null = null;
  let rejectNextBodyWrite = false;
  const holdNextBodyWrite = () => {
    let started!: () => void, release!: () => void;
    const entered = new Promise<void>(resolve => { started = resolve; });
    const wait = new Promise<void>(resolve => { release = resolve; });
    nextBodyGate = { started, wait };
    return { entered, release };
  };
  await page.route(url => ['/api/state', '/api/physique_targets', '/api/body-profile'].includes(url.pathname), async route => {
    const path = new URL(route.request().url()).pathname;
    if (route.request().method() !== 'GET') {
      const payload = route.request().postDataJSON();
      if (path === '/api/body-profile') {
        bodyWrites.push(payload);
        if (rejectNextBodyWrite) { rejectNextBodyWrite = false; return route.fulfill({ status: 503, json: { error: 'Fixture save failure' } }); }
        const gate = nextBodyGate; nextBodyGate = null;
        if (gate) { gate.started(); await gate.wait; }
        body = { ...body, ...payload }; return route.fulfill({ json: body });
      }
      targets = payload; return route.fulfill({ json: { id: 'synthetic-physique-targets', ...targets } });
    }
    return route.fulfill({ json: path === '/api/body-profile' ? body : { ...emptyState(), user: { ...OWNER, physiqueTargets: targets }, bodyProfile: body } });
  });
  await page.emulateMedia({ reducedMotion });
  await page.setViewportSize({ width: 1440, height: 1050 });
  await page.goto('/wellness/physique?view=3d');
  const canvas = page.locator('.chamber-canvas-wrap canvas');
  await canvas.scrollIntoViewIfNeeded();
  await expect(canvas).toHaveAttribute('data-camera-position', /.+/, { timeout: 45000 });
  // A camera can report before GLTF parsing and the first physical-material
  // compilation finish. Keep the same asset-readiness budget as the canvas;
  // the short assertion default is not a first-render loading deadline.
  await expect.poll(async () => (await surfaces(canvas,45000)).length, { timeout: 45000 }).toBe(5);
  // Specialist specs historically started with every category and model tool
  // exposed. Open their secondary workspace explicitly after the frame loads.
  if (options.studio) {
    await page.getByRole('button', { name: 'Appearance studio', exact: true }).click();
    await page.getByRole('tab', { name: 'Measure', exact: true }).click();
  }
  if (options.tools) await page.getByText('Model tools and body regions', { exact: true }).click();
  return { canvas, errors, targets: () => targets, bodyWrites, holdNextBodyWrite, failNextBodyWrite: () => { rejectNextBodyWrite = true; } };
}

export async function surfaces(canvas: Locator,timeout=15000): Promise<any[]> {
  return canvas.evaluate(element => (element as any)[Symbol.for('growthtrack.avatar.surface-evidence')]?.().surfaces ?? [],undefined,{timeout});
}
export async function bodySurface(canvas: Locator) { return (await surfaces(canvas)).find(item => /^(?:Body|GrowthTrackBody)(?:_\d+)?$/.test(item.name)); }

/** Read the original completed WebGL frame; SwiftShader compositor screenshots
 * can contain an in-progress draw. This synchronization is test-only. */
export async function paintedCanvas(canvas: Locator,path?:string): Promise<Buffer> {
  await canvas.scrollIntoViewIfNeeded();
  let previous='',stable=0;
  await expect.poll(async()=>{
    const current=[await canvas.getAttribute('data-camera-position'),await canvas.getAttribute('data-camera-target')].join('|');
    stable=current===previous?stable+1:0;previous=current;return stable;
  },{timeout:15000}).toBeGreaterThanOrEqual(2);
  let snapshot='';
  await expect.poll(async()=>{
    const frame=await canvas.evaluate(async element=>{
      await new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve())));
      const source=element as HTMLCanvasElement,gl=source.getContext('webgl2') || source.getContext('webgl');gl?.finish();
      const url=source.toDataURL(),image=new Image();image.src=url;await image.decode();
      const buffer=document.createElement('canvas');buffer.width=image.width;buffer.height=image.height;
      const context=buffer.getContext('2d')!;context.drawImage(image,0,0);
      const rgba=context.getImageData(0,0,buffer.width,buffer.height).data,bg=rgba.slice(0,3);let pixels=0;
      for(let y=Math.floor(buffer.height*.25);y<buffer.height*.85;y++)for(let x=Math.floor(buffer.width*.2);x<buffer.width*.8;x++){
        const i=(y*buffer.width+x)*4;if(Math.abs(rgba[i]-bg[0])+Math.abs(rgba[i+1]-bg[1])+Math.abs(rgba[i+2]-bg[2])>40)pixels++;
      }
      return {url,pixels};
    });snapshot=frame.url;return frame.pixels;
  },{timeout:15000}).toBeGreaterThan(500);
  const bytes=Buffer.from(snapshot.split(',')[1],'base64');if(path)await writeFile(path,bytes);return bytes;
}
