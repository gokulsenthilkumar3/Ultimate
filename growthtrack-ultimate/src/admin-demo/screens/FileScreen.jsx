import React from 'react';
import { FileText, Panel, RecordsTable } from '../components';
import { FILES } from '../fixtures';

export function FileScreen({ openRecord, workspace: workspaceScope }) { return <Panel title="Files, neatly together" subtitle={workspaceScope ? 'Sample Raman family files and collections; metadata only.' : 'Personal documents and shared collections; sample metadata only.'} provenance={workspaceScope ? 'Sample · Raman family' : undefined}><RecordsTable rows={FILES.filter(file => !workspaceScope || file[2] === workspaceScope).map(([name, type, workspace, size, updated]) => ({ name, type, workspace, size, updated }))} columns={[{ key: 'name', label: 'Name', render: r => <span className="file-name"><FileText size={18} /><strong>{r.name}</strong></span> }, { key: 'type', label: 'Type' }, { key: 'workspace', label: 'Workspace' }, { key: 'size', label: 'Size' }, { key: 'updated', label: 'Updated' }]} onRow={r => openRecord({ ...r, title: r.name, notes: 'Sample metadata only; no private document is attached.' })} searchPlaceholder="Search files and collections…" /></Panel>; }

export default FileScreen;
