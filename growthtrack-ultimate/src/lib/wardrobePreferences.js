export const CLOTHING_OPTIONS = Object.freeze({
  UNDERWEAR:{label:'Underwear',description:'Fitted briefs, trunks or boxer briefs with a shaped waistband.',top:false,
    variants:[['briefs','Briefs'],['trunks','Trunks'],['boxerBriefs','Boxer briefs']],defaultVariant:'boxerBriefs',
    colors:{top:'#263247',bottom:'#263247',trim:'#97a6bb'}},
  GYM:{label:'Gym',description:'Tank or training tee with running or compression shorts.',top:true,
    variants:[['tank','Tank + running shorts'],['training','Training tee + shorts'],['compression','Compression set']],defaultVariant:'tank',
    colors:{top:'#253a50',bottom:'#172334',trim:'#55c8c1'}},
  CASUAL:{label:'Casual',description:'Relaxed sweatshirt or tee with tapered joggers.',top:true,
    variants:[['sweatshirt','Sweatshirt + joggers'],['tee','T-shirt + joggers']],defaultVariant:'sweatshirt',
    colors:{top:'#82938c',bottom:'#343e45',trim:'#d3d9cf'}},
  FORMAL:{label:'Formal',description:'Authored collars, shirt plackets, tailored trousers and a jacket option.',top:true,variants:[['shirt','Shirt + trousers'],['suit','Suit + shirt + trousers']],defaultVariant:'shirt',colors:{top:'#e5e5df',bottom:'#343540',trim:'#a0a8b0'}},
  SWIMWEAR:{label:'Swimwear',description:'Board or shorter swim shorts with an adjustable waist and hem.',top:false,variants:[['board','Board shorts'],['short','Swim shorts']],defaultVariant:'board',colors:{top:'#2368a1',bottom:'#2368a1',trim:'#efa950'}},
});
export const CLOTHING_FITS = Object.freeze([['fitted','Fitted'],['regular','Regular'],['relaxed','Relaxed']]);
export const CLOTHING_FABRICS = Object.freeze({
  cotton:{label:'Cotton jersey',roughness:.86,sheen:.22,weave:1},
  performance:{label:'Performance knit',roughness:.62,sheen:.4,weave:0},
  linen:{label:'Linen weave',roughness:.94,sheen:.12,weave:2},
  wool:{label:'Wool suiting',roughness:.82,sheen:.28,weave:2},
});
export const CLOTHING_PATTERNS = Object.freeze([['solid','Solid fabric'],['source','Original garment texture'],['pinstripe','Pinstripe']]);
export const CLOTHING_ADJUSTMENTS = Object.freeze({
  easeCm:{label:'Garment ease',unit:'cm',min:0,max:6,step:.1,default:1.2,description:'Extra space around the garment, separate from body measurements.'},
  hemLength:{label:'Hem length',unit:'%',min:80,max:120,step:1,default:100,description:'Shortens or lengthens the selected style at its hem.'},
  waistRiseCm:{label:'Waist rise',unit:'cm',min:-3,max:3,step:.1,default:0,description:'Moves the waistband up or down.'},
  textureStrength:{label:'Fabric detail',unit:'%',min:0,max:100,step:1,default:65,description:'Strength of the garment’s surface texture and stitching.'},
});
export function wardrobeAssetKey(preset,variant) {
  return preset==='FORMAL'?(variant==='suit'?'suit':'shirt'):preset==='CASUAL'&&variant==='sweatshirt'?'sweatshirt':'tee';
}
export function wardrobeDefaults(preset) {
  const config=CLOTHING_OPTIONS[preset];
  if(!config) return null;
  return {variant:config.defaultVariant,fit:'regular',topColor:config.colors.top,bottomColor:config.colors.bottom,trimColor:config.colors.trim,
    fabric:preset==='GYM'||preset==='SWIMWEAR'?'performance':preset==='FORMAL'?'wool':'cotton',pattern:'solid',
    ...Object.fromEntries(Object.entries(CLOTHING_ADJUSTMENTS).map(([key,spec])=>[key,spec.default]))};
}
const color=(input,fallback)=>/^#[\da-f]{6}$/i.test(input || '')?input:fallback;
export function sanitizeWardrobePreferences(input = {}) {
  const preset=Object.hasOwn(CLOTHING_OPTIONS,input?.preset)?input.preset:'UNDERWEAR';
  const outfits=Object.fromEntries(Object.entries(CLOTHING_OPTIONS).map(([key,config])=> {
    const saved=input?.outfits?.[key] || {};
    const defaults=wardrobeDefaults(key);
    return [key,{ ...defaults,variant:config.variants.some(([id])=>id===saved.variant)?saved.variant:config.defaultVariant,
      fit:CLOTHING_FITS.some(([id])=>id===saved.fit)?saved.fit:'regular',
      topColor:color(saved.topColor,config.colors.top),bottomColor:color(saved.bottomColor,config.colors.bottom),trimColor:color(saved.trimColor,config.colors.trim),
      fabric:Object.hasOwn(CLOTHING_FABRICS,saved.fabric)?saved.fabric:defaults.fabric,
      pattern:CLOTHING_PATTERNS.some(([id])=>id===saved.pattern)?saved.pattern:defaults.pattern,
      ...Object.fromEntries(Object.entries(CLOTHING_ADJUSTMENTS).map(([field,spec])=> {
        const value=saved[field];return [field,value!==null && value!=='' && Number.isFinite(Number(value))?Math.max(spec.min,Math.min(spec.max,Number(value))):spec.default];
      })) }];
  }));
  return {preset,outfits};
}
