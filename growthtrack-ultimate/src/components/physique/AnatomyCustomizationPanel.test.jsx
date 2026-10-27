import { fireEvent,render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import AnatomyCustomizationPanel from './AnatomyCustomizationPanel';
import { createAnatomyCustomization } from '../../lib/anatomyCustomization';

vi.mock('./MeasurementHelp', () => ({ default: () => null }));

describe('private anatomy editing', () => {
  it('saves fit mode, padding and mirrored placement without overwriting either side or Goal',()=>{
    const value=createAnatomyCustomization({current:{scrotum:{
      leftTestis:{lengthCm:4,placement:{verticalCm:.3}},rightTestis:{lengthCm:3,placement:{verticalCm:-.5}},
    }},goal:{scrotum:{fitMode:'envelope',leftTestis:{lengthCm:5}}}});
    const save=vi.fn();const {rerender}=render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    fireEvent.click(screen.getByRole('button',{name:'Scrotum',exact:true}));
    expect(screen.getByRole('slider',{name:'Guide padding'})).toBeDisabled();
    fireEvent.change(screen.getByRole('combobox',{name:'Scrotal envelope mode'}),{target:{value:'guides'}});
    const fitted=save.mock.calls.at(-1)[0];
    expect(fitted.current.scrotum).toMatchObject({...value.current.scrotum,fitMode:'guides'});
    expect(fitted.goal).toEqual(value.goal);
    rerender(<AnatomyCustomizationPanel value={fitted} onSave={save}/>);
    fireEvent.change(screen.getByRole('slider',{name:'Guide padding'}),{target:{value:'.35'}});
    expect(save.mock.calls.at(-1)[0].current.scrotum.paddingCm).toBe(.35);
    fireEvent.click(screen.getByRole('checkbox',{name:'Mirror guide placement'}));
    const linked=save.mock.calls.at(-1)[0];
    expect(linked.current.scrotum.rightTestis).toEqual(value.current.scrotum.rightTestis);
    rerender(<AnatomyCustomizationPanel value={linked} onSave={save}/>);
    expect(screen.getByRole('slider',{name:'Right guide vertical offset',hidden:true})).toBeDisabled();
    fireEvent.click(screen.getByRole('checkbox',{name:'Mirror guide placement'}));
    expect(save.mock.calls.at(-1)[0].current.scrotum.rightTestis).toEqual(value.current.scrotum.rightTestis);
    expect(screen.getByLabelText('Left testicle length current (cm)')).toHaveValue(4);
    expect(screen.getByLabelText('Right testicle length current (cm)')).toHaveValue(3);
  });
  it('reports a measured attachment limit instead of presenting an unrestricted successful fit',()=>{
    const value=createAnatomyCustomization({current:{scrotum:{fitMode:'guides'}}});
    render(<AnatomyCustomizationPanel value={value} onSave={vi.fn()} evidence={{centrelineCm:9,midCircumferenceCm:9,midWidthCm:3,midDepthCm:3,
      scrotumFit:{mode:'guides',status:'attachment-limited',achieved:{widthCm:8,heightCm:9,depthCm:6},maxOutsideCm:.4,sampleCount:52,unresolvedRays:0}}}/>);
    fireEvent.click(screen.getByRole('button',{name:'Scrotum',exact:true}));
    expect(screen.getByLabelText('Scrotal fit result')).toHaveTextContent('Attachment limits the fit');
    expect(screen.getByLabelText('Scrotal fit result')).toHaveTextContent('4.0 mm');
    expect(screen.getByText(/Some padded guide samples extend beyond/)).toBeInTheDocument();
  });
  it('names shape sliders and saves retraction separately from coverage and the other state',()=> {
    const value=createAnatomyCustomization({current:{penis:{resting:{shape:{foreskinCoverage:100}},erect:{shape:{foreskinCoverage:30}}}}});
    const save=vi.fn();render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    const retraction=screen.getByRole('slider',{name:'Foreskin retraction'});
    fireEvent.change(retraction,{target:{value:'70'}});
    expect(save.mock.calls.at(-1)[0].current.penis).toMatchObject({resting:{shape:{foreskinCoverage:100,foreskinRetraction:70}},erect:{shape:{foreskinCoverage:30}}});
    expect(screen.getByRole('slider',{name:'Elevation from horizontal'})).toBeInTheDocument();
  });
  it('warns outside suggested limits and saves the entered value without a hard maximum', () => {
    const value=createAnatomyCustomization({current:{penis:{resting:{measurements:{lengthCm:22}}}}});
    const save=vi.fn();render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    expect(screen.getByText(/Outside suggested preview range 3–16/)).toBeInTheDocument();
    const input=screen.getByLabelText('Resting length current (cm)');
    expect(input).not.toHaveAttribute('max');
    fireEvent.focus(input);fireEvent.change(input,{target:{value:'25'}});fireEvent.blur(input);
    expect(save.mock.calls.at(-1)[0].current.penis.resting.measurements.lengthCm).toBe(25);
    fireEvent.focus(input);fireEvent.change(input,{target:{value:'-2'}});fireEvent.blur(input);
    expect(save).toHaveBeenCalledTimes(1);expect(input).toHaveAttribute('aria-invalid','true');
  });
  it('selects dimensions mode when width is edited and retains circumference records',()=> {
    const value=createAnatomyCustomization({current:{penis:{resting:{measurements:{midCircumferenceCm:10}}}}});
    const save=vi.fn();render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    const input=screen.getByLabelText('Width current (cm)');
    fireEvent.focus(input);fireEvent.change(input,{target:{value:'4'}});fireEvent.blur(input);
    expect(save.mock.calls.at(-1)[0].current.penis.resting).toMatchObject({inputMode:'dimensions',measurements:{widthCm:4,midCircumferenceCm:10}});
  });
  it('saves anatomical shape controls independently for Current/Goal and each state',()=> {
    const value=createAnatomyCustomization({
      current:{penis:{resting:{measurements:{lengthCm:10}},erect:{shape:{glansLength:20}}}},
      goal:{penis:{resting:{shape:{coronaDefinition:30}},erect:{shape:{frenulumDefinition:40}}}},
    });
    const save=vi.fn();render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    for(const [label,key] of [['Glans length','glansLength'],['Corona definition','coronaDefinition'],['Frenulum definition','frenulumDefinition']]) {
      const slider=screen.getByRole('slider',{name:label});
      expect(slider).toHaveValue('50');
      expect(slider).toHaveAttribute('aria-valuetext','50 / 100');
      fireEvent.change(slider,{target:{value:'75'}});
      const saved=save.mock.calls.at(-1)[0];
      expect(saved.current.penis.resting).toMatchObject({measurements:{lengthCm:10},shape:{[key]:75}});
      expect(saved.current.penis.erect).toEqual(value.current.penis.erect);
      expect(saved.goal).toEqual(value.goal);
    }
    fireEvent.change(screen.getByRole('combobox',{name:'Profile'}),{target:{value:'goal'}});
    fireEvent.click(screen.getByRole('button',{name:'Erect',exact:true}));
    expect(screen.getByRole('slider',{name:'Frenulum definition'})).toHaveValue('40');
    fireEvent.change(screen.getByRole('slider',{name:'Glans length'}),{target:{value:'65'}});
    const saved=save.mock.calls.at(-1)[0];
    expect(saved.current).toEqual(value.current);
    expect(saved.goal.penis.resting).toEqual(value.goal.penis.resting);
    expect(saved.goal.penis.erect.shape).toEqual({frenulumDefinition:40,glansLength:65});
  });
  it('counts optional recorded dimensions for the displayed profile and state without counting generic shape defaults',()=> {
    const value=createAnatomyCustomization({current:{
      penis:{resting:{measurements:{lengthCm:0,midCircumferenceCm:10,widthCm:null,depthCm:''},shape:{glansLength:75}},erect:{measurements:{lengthCm:14}}},
      scrotum:{leftTestis:{volumeMl:15}},buttocks:{measurements:{pelvicBreadthCm:30}},
    }});
    render(<AnatomyCustomizationPanel value={value} onSave={vi.fn()}/>);
    const summary=()=>screen.getByLabelText('Saved measurement completeness');
    expect(summary()).toHaveTextContent('Current · Resting: 2 of 6 measurements recorded; 4 not recorded');
    expect(summary()).toHaveTextContent('not anatomical accuracy');
    fireEvent.click(screen.getByRole('button',{name:'Erect',exact:true}));
    expect(summary()).toHaveTextContent('Current · Erect: 1 of 6 measurements recorded; 5 not recorded');
    fireEvent.click(screen.getByRole('button',{name:'Scrotum',exact:true}));
    expect(summary()).toHaveTextContent('Current · Scrotum: 1 of 13 measurements recorded; 12 not recorded');
    fireEvent.click(screen.getByRole('button',{name:'Buttocks',exact:true}));
    expect(summary()).toHaveTextContent('Current · Buttocks: 1 of 6 measurements recorded; 5 not recorded');
    fireEvent.change(screen.getByRole('combobox',{name:'Profile'}),{target:{value:'goal'}});
    expect(summary()).toHaveTextContent('Goal · Buttocks: 0 of 6 measurements recorded; 6 not recorded');
    fireEvent.click(screen.getByRole('button',{name:'Skin regions',exact:true}));
    expect(screen.queryByLabelText('Saved measurement completeness')).not.toBeInTheDocument();
  });
  it('explains the visible-surface boundary for a bone-pressed record without converting the saved length',()=> {
    const value=createAnatomyCustomization({current:{penis:{resting:{measurementMethod:'bone-pressed',measurements:{lengthCm:11}}}}});
    const save=vi.fn();render(<AnatomyCustomizationPanel value={value} onSave={save}/>);
    expect(screen.getByText(/Bone-pressed length starts beneath/)).toHaveTextContent('cannot reproduce that measurement exactly');
    expect(screen.getByLabelText('Resting length current (cm)')).toHaveValue(11);
    expect(save).not.toHaveBeenCalled();
  });
});
