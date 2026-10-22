import config from '../config/humanSurface.json';
export const HUMAN_SURFACE=config;
const finite=(value,min,max,fallback)=>typeof value==='number' && Number.isFinite(value)?Math.max(min,Math.min(max,value)):fallback;
export function sanitizeDigits(input){
  if(!input || typeof input!=='object' || Array.isArray(input))return undefined;
  const result={};
  for(const side of ['left','right']){
    const hand=input[side+'Hand'];if(hand && typeof hand==='object')result[side+'Hand']={
      shape:config.digits.shapes.some(s=>s.id===hand.shape)?hand.shape:'open',
      strength:finite(hand.strength,0,1,config.digits.strength.default),spread:finite(hand.spread,-1,1,0)};
    const foot=input[side+'Foot'];if(foot && typeof foot==='object')result[side+'Foot']={curl:finite(foot.curl,config.digits.toeCurl.min,config.digits.toeCurl.max,0)};
  }
  return Object.keys(result).length?result:undefined;
}
export function microStrength(value){return finite(value,config.micro.strength.min,config.micro.strength.max,config.micro.strength.default);}
