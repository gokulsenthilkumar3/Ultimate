import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import useAvatarRecord from '../../hooks/useAvatarRecord';
import useParametricAvatar from '../../hooks/useParametricAvatar';
import { PARAMETRIC_HUMAN, PARAMETRIC_REIMPORT_ASSET, PARAMETRIC_GROUPS, PARAMETRIC_PARAMETERS, SIMPLE_HUMAN_CONTROLS, patchParametricContext, setSimpleControl, simpleControlValue, validateParametricDocument } from '../../lib/parametricHuman';
import { loadParametricCandidate, loadParametricLicenseFiles } from '../morphEngine/parametricAssetLoader';
import { exportAvatarPackage, importAvatarPackage, MAX_AVATAR_PACKAGE_BYTES } from '../morphEngine/avatarPackage';
import { exportRiggedParametricAvatar } from '../morphEngine/parametricExport';
import TabErrorBoundary from '../TabErrorBoundary';
import '../../styles/parametric-studio.css';

const Viewport = lazy(() => import('./ParametricAvatarViewport'));
const mib = bytes => (bytes / (1024 * 1024)).toFixed(1);

function download(bytes, name, type) {
  const url = URL.createObjectURL(new Blob([bytes], { type }));
  const link = document.createElement('a');
  link.href = url; link.download = name; document.body.appendChild(link); link.click(); link.remove();
  // Downloads can consume the object URL after this event handler returns.
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export default function ParametricAvatarStudio() {
  const record = useAvatarRecord(), editor = useParametricAvatar();
  const [candidate, setCandidate] = useState(null), [loadError, setLoadError] = useState('');
  const [evidence, setEvidence] = useState(null), [operationError, setOperationError] = useState('');
  const [fitting, setFitting] = useState({ status: 'idle' });
  const [appearanceMode, setAppearanceMode] = useState('skin'), [view, setView] = useState('front');
  const [advanced, setAdvanced] = useState(false), [group, setGroup] = useState('body'), [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false), [notice, setNotice] = useState(''), [pendingImport, setPendingImport] = useState(null);
  const [benchmark, setBenchmark] = useState(null), [benchmarkResult, setBenchmarkResult] = useState(null);
  const runtime = useRef(null), fileInput = useRef(null), mounted = useRef(true), busyRef = useRef(false);
  const captureRuntime = useCallback(value => { runtime.current = value; }, []);
  const reportEvidence = useCallback(value => setEvidence(value), []);
  const reportFitting = useCallback(value => setFitting(value), []);
  const reportContextError = useCallback(message => { setLoadError(message); runtime.current = null; }, []);
  const benchmarkComplete = useCallback(result => { setBenchmark(null); setBenchmarkResult(result); }, []);
  useEffect(() => {
    mounted.current = true;
    loadParametricCandidate().then(value => { if (mounted.current) setCandidate(value); }).catch(error => { if (mounted.current) setLoadError(error.message); });
    return () => { mounted.current = false; };
  }, []);
  const document = editor.document;
  const context = document?.contexts[document.activeContext];
  const update = patch => {
    try { editor.replace(patchParametricContext(editor.read(), patch)); setNotice(''); }
    catch (error) { setOperationError(error.message); }
  };
  const setContext = activeContext => editor.replace({ ...editor.read(), activeContext, updatedAt: new Date().toISOString() });
  const perform = async operation => {
    if (busyRef.current) return;
    busyRef.current = true; setBusy(true); setOperationError(''); setNotice('');
    try { await operation(); } catch (error) { if (mounted.current) setOperationError(error.message || 'The avatar operation failed.'); }
    finally { busyRef.current = false; if (mounted.current) setBusy(false); }
  };
  const exportAvatar = kind => perform(async () => {
    const active = runtime.current;
    if (!active || loadError) throw new Error('Wait for the 3D body to load before exporting.');
    const safeDocument = validateParametricDocument(editor.read());
    await editor.flush();
    if (!mounted.current || runtime.current !== active) throw new Error('The avatar editor changed before export completed.');
    if (kind === 'editing') {
      const { exportParametricEditingAvatar } = await import('../morphEngine/parametricEditingExport');
      const glb = await exportParametricEditingAvatar(candidate.scene, { parameters: safeDocument.contexts[safeDocument.activeContext].parameters, skinMaterial: active.skin, eyeColor: safeDocument.contexts[safeDocument.activeContext].appearance.eyeColor || '#523b2d', asset: safeDocument.asset, context: safeDocument.activeContext, attachmentAssets: candidate.attachments, eyeAssets: candidate.eyes });
      if (!mounted.current) return;
      download(glb, `avatar-${safeDocument.activeContext}-shape-editing.glb`, 'model/gltf-binary');
      setNotice('Desktop editing GLB exported with named shape keys, selected weights and fitted rest joints. Further shape edits in Blender need joint and garment refitting.');
      return;
    }
    active.setWeights(safeDocument.contexts[safeDocument.activeContext].parameters);
    active.cover.update(); active.attachments.update(); active.eyes.update({ eyeColor: safeDocument.contexts[safeDocument.activeContext].appearance.eyeColor || '#523b2d' });
    await active.attachments.flush();
    if (!mounted.current || runtime.current !== active) throw new Error('The avatar editor changed before garment fitting completed.');
    active.scene.updateMatrixWorld(true);
    const glb = await exportRiggedParametricAvatar(active.scene, { asset: safeDocument.asset, context: safeDocument.activeContext, units: 'm', geometry: 'identity-baked-rigged', rigFitting: active.statistics.rigFitting, browserSkinScattering: 'not-exported', eyeOptics: active.eyes.statistics.eyeOptics, attachments: active.attachments.statistics.attachmentFit }, { bodyMaterial: active.skin });
    if (!mounted.current) return;
    if (kind === 'glb') {
      download(glb, `avatar-${safeDocument.activeContext}.glb`, 'model/gltf-binary');
      setNotice('GLB exported with its rig and current shape. Use the editable package to preserve GrowthTrack sliders and both versions.');
    } else {
      const licenseFiles = await loadParametricLicenseFiles();
      const bytes = await exportAvatarPackage({ document: safeDocument, glb, basis: candidate.basis, licenseFiles,
        licenseReferences: [
          { label: 'MakeHuman/MPFB2 parametric basis via Anny and three.ws', url: PARAMETRIC_HUMAN.source, license: 'CC0-1.0' },
          { label: 'MakeHuman system skin, short02 hair and casual tee assets', url: 'https://static.makehumancommunity.org/assets/assetpacks/makehuman_system_assets.html', license: 'CC0-1.0' },
        ],
        capabilities: { rigFitting: 'performed', expressionBank: 'none', browserSkinScattering: 'not-exported', clothing: 'exported-unverified' },
      });
      if (!mounted.current) return;
      download(bytes, 'avatar-editable.zip', 'application/zip');
      setNotice('Editable package exported: avatar.glb, avatar.json, basis.glb and source notices. Both Current and Goal editing states are included.');
    }
  });
  const readPackage = event => {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    perform(async () => {
      if (file.size > MAX_AVATAR_PACKAGE_BYTES) throw new Error('Avatar packages must be at most 128 MiB.');
      const imported = await importAvatarPackage(await file.arrayBuffer(), { expectedAsset: PARAMETRIC_REIMPORT_ASSET });
      const restored = validateParametricDocument(imported.document);
      if (mounted.current) setPendingImport(restored);
    });
  };
  const controls = advanced
    ? PARAMETRIC_PARAMETERS.filter(item => (!search.trim() ? item.group === group : `${item.label} ${item.group}`.toLowerCase().includes(search.trim().toLowerCase())))
    : SIMPLE_HUMAN_CONTROLS.filter(item => (!search.trim() ? item.group === group : item.label.toLowerCase().includes(search.trim().toLowerCase())));

  return <section className="parametric-studio" aria-label="Parametric human editor">
    <header className="parametric-studio__header">
      <div><h2>{record.name} · Appearance studio</h2><p>Artistic face and body edits. Current and Goal are saved separately.</p></div>
      <div className="parametric-studio__actions">
        <span role="status" aria-live="polite">{({ new:'Not saved yet', saved:'Saved', saving:'Saving…', dirty:'Unsaved edits', error:'Save needs attention' })[editor.status] || editor.status}</span>
        <button type="button" disabled={busy || !document} onClick={() => perform(() => editor.flush())}>Save edits</button>
      </div>
    </header>
    <details className="parametric-studio__exports">
      <summary>Export & restore</summary>
      <p>Choose a format for this person’s artistic editing state. Tracker measurements and history stay separate.</p>
      <div className="parametric-studio__export-options">
        <div><h3>Editable package</h3><p>Preserves Current and Goal editing values, the body asset and source notices for reopening here.</p>
        <button type="button" disabled={busy || !candidate || !evidence || !document || Boolean(loadError)} onClick={() => exportAvatar('package')}>{busy ? 'Working…' : 'Export editable package'}</button>
        </div>
        <div><h3>Compact GLB</h3><p>A fitted mesh for viewing elsewhere. Check the export details below for supported materials and editability.</p>
        <button type="button" disabled={busy || !candidate || !evidence || !document || Boolean(loadError)} onClick={() => exportAvatar('glb')}>Export GLB</button>
        </div>
        <div><h3>Shape-editing GLB</h3><p>Includes shape controls; further editing requires joint and clothing refitting in the target app.</p>
        <button type="button" aria-describedby="parametric-export-refitting" disabled={busy || !candidate || !evidence || !document || Boolean(loadError)} onClick={() => exportAvatar('editing')}>Export shape-editing GLB</button>
        </div>
      </div>
      <div className="parametric-studio__restore">
        <button type="button" disabled={busy} onClick={() => fileInput.current?.click()}>Open editable package</button>
        <input ref={fileInput} type="file" accept=".zip,application/zip" aria-label="Avatar package file" hidden onChange={readPackage} />
      </div>
    </details>
    <p className="parametric-studio__scope">Preview human with textured skin, short hair and a tee. Shape extremes and motion still need visual review. Your tracker measurements stay separate.</p>
    {context?.provenance.visualAssetUpgrade && <p role="status">This avatar uses the updated skin, eyes and attachment assets. Its saved shape and colour values are preserved.</p>}
    {context?.provenance.solverUpgrade && <p role="status">This avatar uses updated joint and garment fitting. Its saved shape values are preserved.</p>}
    {evidence?.garmentContact?.converged === false && <p role="alert" className="parametric-studio__error">The tee could not be fitted without intersections for this shape. Adjust the shape before using this garment in a finished avatar.</p>}
    {(editor.error || operationError || loadError) && <p role="alert" className="parametric-studio__error">{operationError || editor.error || loadError}</p>}
    {notice && <p role="status">{notice}</p>}
    {pendingImport && <section className="parametric-studio__import" aria-label="Review imported avatar">
      <h3>Restore this avatar’s editing state?</h3>
      <p>This replaces this person’s parametric Current and Goal shapes and colours. Body measurements, tracker avatars and check-in history stay separate. External mesh/sculpt changes are not imported.</p>
      <button type="button" disabled={busy} onClick={() => { editor.replace(pendingImport); setPendingImport(null); setNotice('Editing state restored. Current and Goal can be edited independently.'); }}>Restore editing state</button>
      <button type="button" disabled={busy} onClick={() => setPendingImport(null)}>Cancel</button>
    </section>}
    {document && <>
      <fieldset disabled={busy} className="parametric-studio__toolbar"><legend className="sr-only">Version and view</legend>
        <div role="group" aria-label="Parametric editing version">{['current', 'goal'].map(id => <button type="button" key={id} aria-pressed={document.activeContext === id} onClick={() => setContext(id)}>{id === 'current' ? 'Current' : 'Goal'}</button>)}</div>
        <div role="group" aria-label="Parametric camera">{['front', 'side', 'back', 'face'].map(id => <button type="button" key={id} aria-pressed={view === id} onClick={() => setView(id)}>{id[0].toUpperCase() + id.slice(1)}</button>)}</div>
        <label>Material <select aria-label="Parametric material" value={appearanceMode} onChange={event => setAppearanceMode(event.target.value)}><option value="skin">Skin</option><option value="clay">Clay</option></select></label>
      </fieldset>
      <div className="parametric-studio__layout">
        <div>
          {!candidate && !loadError && <p role="status">Loading and verifying the body, skin and clothing in parallel…</p>}
          {candidate && !loadError && <TabErrorBoundary tabName="Parametric preview"><Suspense fallback={<p role="status">Preparing 3D preview…</p>}><Viewport candidate={candidate} context={context} appearanceMode={appearanceMode} view={view} onRuntime={captureRuntime} onEvidence={reportEvidence} onFitting={reportFitting} onContextError={reportContextError} benchmark={benchmark} onBenchmark={benchmarkComplete} /></Suspense></TabErrorBoundary>}
          {['pending', 'fitting'].includes(fitting.status) && <p role="status" className="parametric-studio__hint">Fitting tee… You can keep editing.</p>}
          {fitting.status === 'failed' && <p role="alert" className="parametric-studio__error">{fitting.error} A previous fit may still be shown. Compact GLB and package exports require a valid fit.</p>}
          <p className="parametric-studio__hint">Drag to orbit. Scroll or pinch to zoom. Shape values are artistic controls, not body measurements.</p>
        </div>
        <fieldset disabled={busy} className="parametric-studio__editor"><legend>Edit {document.activeContext === 'current' ? 'Current' : 'Goal'}</legend>
          <div className="parametric-studio__colours">
            <label>Skin colour<input type="color" aria-label="Parametric skin colour" value={context.appearance.skinColor || '#bd8b6a'} onChange={event => update({ appearance: { ...context.appearance, skinColor: event.target.value } })} /></label>
            <label>Eye colour<input type="color" aria-label="Parametric eye colour" value={context.appearance.eyeColor || '#523b2d'} onChange={event => update({ appearance: { ...context.appearance, eyeColor: event.target.value } })} /></label>
          </div>
          <label className="parametric-studio__field">Controls<select aria-label="Shape control level" value={advanced ? 'advanced' : 'simple'} onChange={event => setAdvanced(event.target.value === 'advanced')}><option value="simple">Simple · 22 controls</option><option value="advanced">Advanced · 306 source channels</option></select></label>
          <label className="parametric-studio__field">Region<select aria-label="Shape region" value={group} onChange={event => { setGroup(event.target.value); setSearch(''); }}>{PARAMETRIC_GROUPS.map(item => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label>
          <label className="parametric-studio__field">Find a feature<input type="search" aria-label="Find a shape feature" value={search} onChange={event => setSearch(event.target.value)} placeholder="Nose, jaw, waist…" /></label>
          <div className="parametric-studio__sliders">
            {!controls.length && <p>No controls match. Try Advanced or choose another region.</p>}
            {controls.map(control => {
              const value = advanced ? context.parameters[control.id] || 0 : simpleControlValue(context.parameters, control);
              return <label className="parametric-studio__slider" key={control.id}><span>{control.label}<output>{value.toFixed(2)}</output></span>
                <input type="range" aria-label={control.label} min={advanced ? 0 : -1} max={1} step={0.01} value={value} onChange={event => update({ parameters: advanced ? { ...editor.read().contexts[document.activeContext].parameters, [control.id]: Number(event.target.value) } : setSimpleControl(editor.read().contexts[document.activeContext].parameters, control, Number(event.target.value)) })} />
                {advanced && control.support === 'neutral-preview-only' && <small>Joint placement is approximate; motion needs review.</small>}
              </label>;
            })}
          </div>
          <button type="button" onClick={() => update({ parameters: {} })}>Reset {document.activeContext} shape</button>
          <p className="parametric-studio__hint">Simple controls pair opposing shapes. Advanced controls allow separate left/right edits. Extreme combinations need visual review.</p>
        </fieldset>
      </div>
    </>}
    <p id="parametric-export-refitting" className="parametric-studio__hint">Shape-editing GLB: changing shapes or poses in another app requires refitting the joints and clothing. The fitting solver is not included in the file.</p>
    <details className="parametric-studio__diagnostics"><summary>Preview capability and export details</summary>
      <p>Base: {PARAMETRIC_HUMAN.meshes[0].vertices.toLocaleString()} body vertices, {PARAMETRIC_HUMAN.meshes[0].triangles.toLocaleString()} body triangles, {PARAMETRIC_HUMAN.joints} joints. Source revision {PARAMETRIC_HUMAN.asset.sourceRevision.slice(0, 12)}. The skin pack adds CC0 authored colour, estimated roughness, pore normals and local diffusion. Thickness comes from the neutral mesh; it is not measured physiological skin thickness. Layered eyes have recessed irises and transmissive corneas.</p>
      {evidence && <p>Enabled array-layer limit: {evidence.maxArrayTextureLayers ?? 'unknown'}. Largest source bank: {evidence.largestSourceMorphBank}; rendered identity layers: {evidence.largestViewingMorphBank}. Avoided source morph-texture estimate: {mib(evidence.sourceMorphTextureBytes)} MiB (not measured GPU memory). Last CPU shape evaluation: {evidence.sliderEvaluationMs.toFixed(2)} ms.</p>}
      <p>Both GLB profiles carry rest joints fitted to the selected identity. Joint placement follows nearby skin and needs anatomical review. The larger shape-editing GLB also retains named body, eye and attachment morphs for a desktop editor such as Blender; changing those shapes or poses requires joint and garment refitting. Clay is an inspection view; exports use the saved skin colours. The package also carries both editing states, the original basis and source notices. Browser skin scattering falls back to standard PBR materials outside GrowthTrack. Corneal transmission depends on the external renderer. Third-party editors do not automatically expose GrowthTrack sliders. Reopening a package restores its saved state; it does not apply external mesh modifications. Tearlines, eyelid correctives and expressions remain unfinished. The tee remains a prototype and can intersect the hands when elbows bend over a larger belly.</p>
      {candidate?.loadMetrics && <p>Verified assets and model parse: {(candidate.loadMetrics.assetsAndParseMs / 1000).toFixed(2)} s. Rendering and garment fitting are measured separately.</p>}
      <button type="button" disabled={busy || !evidence || Boolean(benchmark) || Boolean(loadError)} onClick={() => { setBenchmarkResult(null); setBenchmark(crypto.randomUUID()); }}>Run 3-second preview sample</button>
      {benchmark && <p role="status">Sampling frame intervals… Keep this tab visible.</p>}
      {benchmarkResult && <p role="status">Frame interval p95: {benchmarkResult.p95FrameIntervalMs.toFixed(2)} ms across {benchmarkResult.frames} frames. {benchmarkResult.drawCalls} draw calls, {benchmarkResult.triangles.toLocaleString()} triangles. Browser sample only; target-phone performance is not certified.</p>}
    </details>
  </section>;
}
