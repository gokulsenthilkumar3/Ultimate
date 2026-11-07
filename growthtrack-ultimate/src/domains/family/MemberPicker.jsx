import React, { useDeferredValue, useEffect, useId, useRef, useState } from 'react';
import { yearLabel } from './familyDates';
import { useQuery } from '@tanstack/react-query';
import { Field } from '../native/ModuleUI';
import { familyRequest } from './familyClient';

/** Keyboard-accessible typeahead, backed by the full authorized directory. */
export default function MemberPicker({ name, label, account, treeId, initial = [], optional = true, defaultPerson = null, onPick, excludeId, emptyLabel = 'No person selected' }) {
  const [search, setSearch] = useState(''), [picked, setPicked] = useState(defaultPerson), [open, setOpen] = useState(false), [active, setActive] = useState(-1);
  const deferred = useDeferredValue(search), id = useId(), input = useRef(null), container = useRef(null);
  const query = useQuery({ queryKey: ['native-family', account.owner, account.user.id, treeId, 'picker', deferred], queryFn: ({ signal }) => familyRequest(`/members?treeId=${encodeURIComponent(treeId)}&page=0&limit=25&search=${encodeURIComponent(deferred)}`, { connection: account, signal }), enabled: open && Boolean(deferred.trim()), retry: false });
  const local = initial.filter(person => person.name.toLocaleLowerCase().includes(deferred.trim().toLocaleLowerCase()));
  const choices = [...new Map([...(picked ? [picked] : []), ...local, ...(query.data?.rows || [])].filter(person => person.id !== excludeId).map(person => [person.id, person])).values()].slice(0,25);
  const options = [...(optional ? [{ person: null, label: emptyLabel }] : []), ...choices.map(person => ({ person, label: person.name }))];
  const choose = person => { setPicked(person); setSearch(''); setOpen(false); setActive(-1); onPick?.(person); };
  useEffect(() => { input.current?.setCustomValidity(!picked && (!optional || search.trim()) ? 'Choose a person from the suggestions, or clear the optional search.' : ''); }, [optional, picked, search]);
  useEffect(() => { if (active >= 0) document.getElementById(`${id}-${active}`)?.scrollIntoView?.({ block: 'nearest' }); }, [active, id]);
  return <div ref={container} className="family-picker" onBlur={event => { if (!container.current?.contains(event.relatedTarget)) setOpen(false); }}>
    <Field label={label} hint="Type a name, then choose a result."><input ref={input} type="text" role="combobox" aria-label={label} autoComplete="off" aria-autocomplete="list" aria-expanded={open} aria-controls={`${id}-list`} aria-activedescendant={open && active >= 0 ? `${id}-${active}` : undefined} value={picked ? picked.name : search} placeholder={optional ? emptyLabel : 'Find a person…'} required={!optional}
      onFocus={() => setOpen(true)} onChange={event => { setPicked(null); onPick?.(null); setSearch(event.target.value); setActive(-1); setOpen(true); }}
      onKeyDown={event => {
        if (event.key === 'Escape' && open) { event.stopPropagation(); event.preventDefault(); setOpen(false); }
        if (['ArrowDown','ArrowUp'].includes(event.key) && options.length) { event.preventDefault(); setOpen(true); setActive(value => value < 0 ? (event.key==='ArrowDown'?0:options.length-1) : (value + (event.key === 'ArrowDown' ? 1 : -1) + options.length) % options.length); }
        if (event.key === 'Enter' && open && active >= 0 && options[active]) { event.preventDefault(); choose(options[active].person); }
      }} /></Field>
    <input type="hidden" name={name} value={picked?.id || ''} />
    {picked && optional && <button type="button" className="native-link family-picker__clear" aria-label={`Clear ${label}`} onClick={() => choose(null)}>Clear</button>}
    {open && <div className="family-picker__popup"><ul id={`${id}-list`} role="listbox" aria-label={`${label} suggestions`}>
      {options.map((option,index) => <li key={option.person?.id || 'empty'} id={`${id}-${index}`} role="option" aria-selected={picked?.id === option.person?.id} data-active={active === index} onMouseDown={event => event.preventDefault()} onMouseEnter={() => setActive(index)} onClick={() => choose(option.person)}><strong>{option.label}</strong>{option.person?.birthDate && <small>Born {yearLabel(option.person.birthDate, option.person.birthDateApproximate)}</small>}</li>)}
    </ul>{query.isFetching && <small role="status">Searching the full tree…</small>}{!options.length && !query.isFetching && <small role="status">No matching people. Try another name.</small>}{query.isError && <small className="native-form-error" role="alert">{query.error.message}</small>}</div>}
  </div>;
}
