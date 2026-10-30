/** Build evidence for the actual eager chunk graph, including merged vendor modules. */
export default function kineticGraphPlugin() {
  return { name: 'kinetic-graph-audit', generateBundle(_options, bundle) {
    const chunks = Object.fromEntries(Object.values(bundle).filter(output => output.type === 'chunk').map(chunk => [chunk.fileName, {
      imports: chunk.imports,
      heavyModules: Object.keys(chunk.modules).map(id => id.replaceAll('\\', '/')).filter(id => /\/node_modules\/(?:gsap|three|@react-three\/[^/]+|postprocessing|recharts)\//.test(id)).map(id => id.slice(id.lastIndexOf('/node_modules/') + 14)),
    }]));
    this.emitFile({ type: 'asset', fileName: '.vite/kinetic-graph.json', source: JSON.stringify({ chunks }, null, 2) });
  } };
}
