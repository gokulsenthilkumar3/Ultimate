import React, { useState } from 'react';
import Button from './Button';
import DataTable from './DataTable';
import EmptyState from './EmptyState';
import FilterBar from './FilterBar';
import LoadingSkeleton from './LoadingSkeleton';
import Modal from './Modal';
import PageState from './PageState';
import PageTemplate from './PageTemplate';
import SelectField from './SelectField';
import Tabs from './Tabs';
import TextField from './TextField';

const galleryTabs = [
  { value: 'controls', label: 'Controls', panelId: 'gt-gallery-controls' },
  { value: 'records', label: 'Records', panelId: 'gt-gallery-records' },
  { value: 'states', label: 'States', panelId: 'gt-gallery-states' },
];
const sampleRows = [
  { id: 'one', name: 'Quarterly review', category: 'Planning', updated: 'Today' },
  { id: 'two', name: 'Training log', category: 'Wellness', updated: 'Yesterday' },
  { id: 'three', name: 'Portfolio notes', category: 'Finance', updated: 'Monday' },
];
const columns = [
  { id: 'name', header: 'Record', accessor: row => row.name, sortable: true },
  { id: 'category', header: 'Category', accessor: row => row.category, sortable: true },
  { id: 'updated', header: 'Updated', accessor: row => row.updated },
];

function GalleryContent() {
  const [tab, setTab] = useState('controls');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState([]);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('planning');
  const [modalOpen, setModalOpen] = useState(false);
  const visibleRows = sampleRows.filter(row => `${row.name} ${row.category}`.toLowerCase().includes(query.toLowerCase()));

  return <PageTemplate type="record" title="Editorial components" accent="Development gallery" subtitle="Shared page patterns, controls, data, and recovery states." actions={<Button onClick={() => setModalOpen(true)}>Open dialog</Button>}>
    <div className="gt-dev-gallery">
      <Tabs label="Gallery sections" idPrefix="gt-gallery-tab" tabs={galleryTabs} value={tab} onChange={setTab} />
      <section id="gt-gallery-controls" role="tabpanel" aria-labelledby="gt-gallery-tab-controls" hidden={tab !== 'controls'} className="gt-dev-gallery__panel">
        <h2>Actions and fields</h2>
        <div className="gt-dev-gallery__actions">
          <Button>Primary action</Button>
          <Button variant="secondary">Secondary action</Button>
          <Button variant="ghost">Quiet action</Button>
          <Button variant="danger">Destructive action</Button>
          <Button loading loadingLabel="Saving…">Save</Button>
        </div>
        <div className="gt-dev-gallery__fields">
          <TextField label="Project name" hint="Give this project a short, recognizable name." value={name} onChange={event => setName(event.target.value)} placeholder="New project" />
          <SelectField label="Category" value={category} onChange={event => setCategory(event.target.value)} options={[{ value: 'planning', label: 'Planning' }, { value: 'wellness', label: 'Wellness' }, { value: 'finance', label: 'Finance' }]} />
          <TextField label="Validation example" value="" onChange={() => {}} error="A name is required." />
        </div>
      </section>
      <section id="gt-gallery-records" role="tabpanel" aria-labelledby="gt-gallery-tab-records" hidden={tab !== 'records'} className="gt-dev-gallery__panel">
        <h2>Search and records</h2>
        <FilterBar query={query} onQueryChange={setQuery} resultCount={visibleRows.length} onReset={() => setQuery('')} activeFilters={query ? [{ id: 'query', label: query, onRemove: () => setQuery('') }] : []} />
        <DataTable caption="Sample records" rows={visibleRows} columns={columns} rowKey={row => row.id} selectedKeys={selected} onSelectionChange={setSelected} />
      </section>
      <section id="gt-gallery-states" role="tabpanel" aria-labelledby="gt-gallery-tab-states" hidden={tab !== 'states'} className="gt-dev-gallery__panel">
        <h2>Recovery and progress</h2>
        <PageState state="loading" />
        <PageState state="empty" />
        <PageState state="error" onRetry={() => {}} />
        <EmptyState title="No notes yet" description="Capture the first thought when you are ready." actionLabel="New note" onAction={() => setModalOpen(true)} />
        <LoadingSkeleton variant="workspace" />
      </section>
    </div>
    <Modal open={modalOpen} title="Example dialog" onClose={() => setModalOpen(false)} actions={<><Button variant="secondary" data-dialog-autofocus onClick={() => setModalOpen(false)}>Cancel</Button><Button onClick={() => setModalOpen(false)}>Done</Button></>}>
      <p>This dialog demonstrates the shared heading, focus behavior, actions, and responsive layout.</p>
    </Modal>
  </PageTemplate>;
}

/** Route owners can mount this component in development; production renders nothing. */
export default function DevGallery() {
  if (!import.meta.env.DEV) return null;
  return <GalleryContent />;
}
