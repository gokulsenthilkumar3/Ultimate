import React, { useState } from 'react';
import { Field } from '../native/ModuleUI';
import MemberPicker from './MemberPicker';
import { KINSHIP, kinshipLabel } from './kinship';

export function KinshipSelect({ value, onChange }) {
  const groups = [...new Set(KINSHIP.map(item => item.group))];
  return <Field label="Relationship to this person"><select name="kinshipId" value={value} onChange={event => onChange(event.target.value)} required><option value="">Choose a relationship…</option>{groups.map(group => <optgroup key={group} label={group}>{KINSHIP.filter(item => item.group === group).map(item => <option key={item.id} value={item.id}>{kinshipLabel(item)}</option>)}</optgroup>)}</select></Field>;
}

export default function RelationshipFields({ account, treeId, people, anchor: initialAnchor, addingPerson = false, allowNoAnchor = false, subjectName = 'New person' }) {
  const [anchor, setAnchor] = useState(initialAnchor || null), [relative, setRelative] = useState(null), [kind, setKind] = useState('');
  const choice = KINSHIP.find(item => item.id === kind);
  const active = !allowNoAnchor || Boolean(anchor);
  return <div className="family-relationship-fields">
    <MemberPicker name="anchorId" label="Person already in your tree" account={account} treeId={treeId} initial={people} defaultPerson={initialAnchor} optional={allowNoAnchor} emptyLabel="No connection — standalone person" onPick={person => { setAnchor(person); setRelative(null); }} />
    {active && <>
    {!addingPerson && <MemberPicker key={anchor?.id || 'unselected'} name="relativeId" label="Their relative" account={account} treeId={treeId} initial={people} optional={false} excludeId={anchor?.id} onPick={setRelative} />}
    <KinshipSelect value={kind} onChange={setKind} />
    <p className="family-relationship-preview" role="status">{addingPerson ? subjectName : relative?.name || 'The selected relative'} will be recorded as {choice ? kinshipLabel(choice) : '…'} of {anchor?.name || 'the selected person'}.</p>
    <Field label="Your family’s term (optional)" hint="Use your own spelling or regional name. The underlying relationship stays the same."><input name="customLabel" maxLength={160} placeholder={choice?.roman || 'Your preferred name'} /></Field>
    <details><summary>Grandparents and larger branches</summary><p className="native-notice">Add a grandparent as a parent of your parent. For an aunt or uncle, also connect them to your parent as a sibling. These links give the tree its structure; the Tamil label records what you call them.</p></details>
    {choice?.type === 'spouse' && <details><summary>Marriage date (optional)</summary><Field label="Marriage date"><input name="marriageDate" type="date" /></Field></details>}
    </>}
    {!active && <p className="family-inline-help">Leave this blank to save a standalone person. Choose someone to add a relationship in the same save.</p>}
  </div>;
}
