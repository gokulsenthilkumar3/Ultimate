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
  FORMAL:{label:'Formal',description:'Collared shirt and trousers.',top:true,variants:[['shirt','Shirt + trousers']],defaultVariant:'shirt',colors:{top:'#e5e5df',bottom:'#343540',trim:'#a0a8b0'}},
  SWIMWEAR:{label:'Swimwear',description:'Board shorts with contrast side panels.',top:false,variants:[['board','Board shorts']],defaultVariant:'board',colors:{top:'#2368a1',bottom:'#2368a1',trim:'#efa950'}},
});
export const CLOTHING_FITS = Object.freeze([['fitted','Fitted'],['regular','Regular'],['relaxed','Relaxed']]);
const color=(input,fallback)=>/^#[\da-f]{6}$/i.test(input || '')?input:fallback;
export function sanitizeWardrobePreferences(input = {}) {
  const preset=Object.hasOwn(CLOTHING_OPTIONS,input?.preset)?input.preset:'UNDERWEAR';
  const outfits=Object.fromEntries(Object.entries(CLOTHING_OPTIONS).map(([key,config])=> {
    const saved=input?.outfits?.[key] || {};
    return [key,{ variant:config.variants.some(([id])=>id===saved.variant)?saved.variant:config.defaultVariant,
      fit:CLOTHING_FITS.some(([id])=>id===saved.fit)?saved.fit:'regular',
      topColor:color(saved.topColor,config.colors.top),bottomColor:color(saved.bottomColor,config.colors.bottom),trimColor:color(saved.trimColor,config.colors.trim) }];
  }));
  return {preset,outfits};
}
