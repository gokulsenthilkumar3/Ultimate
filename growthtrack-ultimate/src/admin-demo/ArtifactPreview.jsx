import React from 'react';
import { Panel } from './components';
export default function ArtifactPreview({ title, inputs, output, state = 'Layout concept; no computed result is connected.' }) {
  return <Panel title={title} subtitle="Proposed workflow artifact" provenance="Concept"><div className="artifact-contract"><h3>{title}</h3><dl><div><dt>Inputs</dt><dd>{inputs}</dd></div><div><dt>Output</dt><dd>{output}</dd></div><div><dt>Current state</dt><dd>{state}</dd></div></dl></div></Panel>;
}
