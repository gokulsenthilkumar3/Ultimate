import {it,expect} from 'vitest';
import {BufferGeometry,Float32BufferAttribute} from 'three';
import {measureTextureDensity,closestDetailedDistance} from './textureDensity';
it('derives closest zoom from the actual UV area and atlas, scaling with output resolution',()=>{
  const geometry=new BufferGeometry();
  geometry.setAttribute('position',new Float32BufferAttribute([0,0,0,1,0,0,0,1,0],3));
  geometry.setAttribute('uv',new Float32BufferAttribute([0,0,1,0,0,1],2));
  const density=measureTextureDensity(geometry,{width:1024,height:1024},{head:[0,1,2]}).head;
  expect(density).toBeCloseTo(1024);
  const near=closestDetailedDistance({pixelHeight:600,fov:30,texelsPerUnit:density});
  const visibleUnits=2*near*Math.tan(30*Math.PI/360);
  expect(600/visibleUnits/density).toBeCloseTo(1.25);
  expect(closestDetailedDistance({pixelHeight:1200,fov:30,texelsPerUnit:density})).toBeCloseTo(near*2);
  geometry.scale(2,2,2);
  expect(measureTextureDensity(geometry,{width:1024,height:1024},{head:[0,1,2]}).head).toBeCloseTo(512);
  expect(measureTextureDensity(geometry,null,{head:[0,1,2]})).toEqual({});
});
