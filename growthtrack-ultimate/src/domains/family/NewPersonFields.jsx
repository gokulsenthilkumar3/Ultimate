import React, { useState } from 'react';
import { Field } from '../native/ModuleUI';
import RelationshipFields from './RelationshipFields';

export default function NewPersonFields({ account, treeId, people, anchor, markAsMe = false, currentMe }) {
  const [isMe, setIsMe] = useState(markAsMe), [name, setName] = useState('');
  return <div className="family-person-editor">
    <section className="family-person-editor__person"><h3>1. Person</h3>
      <Field label="Full name"><input name="name" maxLength={160} required autoComplete="off" autoFocus value={name} onChange={event => setName(event.target.value)} /></Field>
      <label className="family-check family-identity-switch"><input name="markAsMe" type="checkbox" role="switch" checked={isMe} onChange={event => setIsMe(event.target.checked)} /><span>This person is me{currentMe && <small>Currently {currentMe.name}</small>}</span></label>
      {isMe && currentMe && <p className="family-inline-help" role="status">Your Me marker will move to this person. Your login and permissions stay the same.</p>}
      <Field label="Birth date (optional)"><input name="birthDate" type="date" /></Field>
      <details><summary>More profile details</summary><div className="native-form">
        <Field label="Gender"><select name="gender" defaultValue=""><option value="">Unspecified</option>{['male','female','other'].map(value => <option key={value}>{value}</option>)}</select></Field>
        <Field label="Birth location"><input name="birthLocation" maxLength={300} /></Field><Field label="Occupation"><input name="occupation" maxLength={300} /></Field><Field label="Religion (optional)"><input name="religion" maxLength={200} /></Field><Field label="Their story"><textarea name="bio" maxLength={10000} /></Field>
      </div></details>
    </section>
    <section className="family-person-editor__connection"><h3>2. Connection <small>Optional</small></h3>
      {people.length > 0 ? <RelationshipFields account={account} treeId={treeId} people={people} anchor={anchor} addingPerson allowNoAnchor subjectName={name.trim() || 'New person'} /> : <p className="family-inline-help">This is the first person in your tree. You can add their relatives after saving.</p>}
    </section>
  </div>;
}
