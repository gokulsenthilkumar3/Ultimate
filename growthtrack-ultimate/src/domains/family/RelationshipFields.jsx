import React, { useState } from 'react';
import { Field } from '../native/ModuleUI';
import MemberPicker from './MemberPicker';
import { KINSHIP, kinshipLabel } from './kinship';

export function KinshipSelect({value,onChange}) {
  const [search,setSearch]=useState(''),[expanded,setExpanded]=useState(false);
  const quick=['appa','amma','magan','magal','general-friend','general-mentor','general-spouse','general-sibling'];
  const items=KINSHIP.filter(item=>item.id===value||(search?kinshipLabel(item).toLocaleLowerCase().includes(search.toLocaleLowerCase()):expanded||quick.includes(item.id)));
  return <fieldset className="family-kinship-selector"><legend>Relationship — who are they to the other person?</legend>
    <Field label="Find a relationship"><input type="search" value={search} onChange={e=>setSearch(e.target.value)} placeholder="Father, Chithi, அத்தை…"/></Field>
    <div className="family-kinship-quick">{items.map(item=><label key={item.id} data-selected={value===item.id} title={kinshipLabel(item)}><input type="radio" name="kinshipId" value={item.id} checked={value===item.id} onChange={()=>onChange(item.id)} required/><strong>{item.roman||item.meaning}</strong><small>{item.tamil||item.group}</small><small>{item.meaning}</small></label>)}</div>
    {!items.length&&<p role="status">No matching relationship. Try a Tamil term or English meaning.</p>}
    {!search&&<button type="button" className="native-link" onClick={()=>setExpanded(v=>!v)}>{expanded?'Show common relationships':'Browse all Tamil & extended relationships'}</button>}
  </fieldset>;
}

export default function RelationshipFields({ account, treeId, people, anchor: initialAnchor, addingPerson=false, allowNoAnchor=false, subjectName='New person' }) {
  const [anchor,setAnchor]=useState(initialAnchor||null),[relative,setRelative]=useState(null),[kind,setKind]=useState('');
  const choice=KINSHIP.find(item=>item.id===kind),active=!allowNoAnchor||Boolean(anchor);
  return <div className="family-relationship-fields">
    <MemberPicker name="anchorId" label={addingPerson?'Connect to this existing person':'Person 2 — the person they relate to'} account={account} treeId={treeId} initial={people} defaultPerson={initialAnchor} optional={allowNoAnchor} emptyLabel="No connection — standalone person" onPick={person=>{setAnchor(person);setRelative(null);}}/>
    {active&&<>
      {!addingPerson&&<MemberPicker key={anchor?.id||'unselected'} name="relativeId" label="Person 1 — whose relationship are you describing?" account={account} treeId={treeId} initial={people} optional={false} excludeId={anchor?.id} onPick={setRelative}/>}
      <p className="family-relationship-preview" role="status"><strong>{addingPerson?subjectName:relative?.name||'Person 1'}</strong> is the <strong>{choice?kinshipLabel(choice):'…'}</strong> of <strong>{anchor?.name||'Person 2'}</strong>.</p>
      <KinshipSelect value={kind} onChange={setKind}/>
      <Field label="Your family’s term (optional)" hint="Your spelling or regional name; the structural relationship stays the same."><input name="customLabel" maxLength={160} placeholder={choice?.roman||'Your preferred name'}/></Field>
      <details><summary>Grandparents and larger branches</summary><p className="native-notice">Connect a grandparent as a parent of your parent. Connect an aunt or uncle to your parent as a sibling. Recorded links establish generations; a Tamil term alone does not create these intermediate connections.</p></details>
      {choice?.type==='spouse'&&<details><summary>Marriage date (optional)</summary><Field label="Marriage date"><input name="marriageDate" type="date"/></Field></details>}
    </>}
    {!active&&<p className="family-inline-help">Leave blank to save a standalone person, or choose someone to connect them in the same save.</p>}
  </div>;
}
