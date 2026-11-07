# Family graph: mixed zones and optional WebGL preview

The standard React Flow canvas remains the default. Family generations and friend-only people use separate spatial zones in the combined view. A person with both family and friendship links remains one person in the family zone. Social edges do not assign generations. Friend connections use side handles and subdued dashed edges. Hover fades unrelated edges; Me focus excludes social edges in the combined view.

Drag a card using its dotted grip. Snap-to-grid can be disabled. Positions are local to the mounted view, separated by layout/mode; they do not change relationships or persist as shared tree data. Auto-arrange clears local positions. The accessible list remains available in every renderer.

The full-tree person picker retains authenticated typeahead, keyboard navigation and explicit result selection, with initials in results. Relationship selection now uses radio cards with search across Tamil, transliteration and English terms. The sentence preview preserves the existing backend direction: the relative is the selected relationship of the anchor. Form field names and transactional creation contracts remain unchanged.

## Reagraph preview

Choose **Enable WebGL preview**, then **WebGL preview** in the renderer selector. `VITE_FAMILY_WEBGL_ENABLED=true` makes the selector immediately available, but does not select WebGL automatically. A `webgl=1` query also exposes the selector. The preview is lazy-loaded; its renderer is not fetched for ordinary standard-canvas use.

The preview offers custom family/friend positions, ancestry-only tree, force-directed 2D/3D and radial views. Clustering is enabled only in force-directed modes, as supported by Reagraph. Tree mode renders ancestry edges only; partner and social edges are retained in the other modes. Custom dragging respects Reagraph's drag position overrides. Node selection opens the existing authorized profile drawer. Renderer errors expose a return-to-standard action; the accessible list remains available.

Noto Sans is bundled at `public/assets/graph-font/` with its upstream OFL license from Google Fonts, avoiding a remote default label-font dependency. This is not verification of all Tamil glyph fallback behavior in WebGL. Standard DOM cards and relationship controls retain browser Tamil text rendering.

## Verification and limits

Targeted tests cover directional sentence copy, typeahead selection, optional standalone-person creation, Tamil term mapping, ancestry/sibling placement, path focus, and separating twenty friends from family generations. Production Vite build passes. An isolated synthetic four-person browser fixture exercised standard canvas, minimap, uniform hover height, mobile overflow, accessible-list switching and visible WebGL rendering. It is not authenticated owner-data coverage, a 100–200-person WebGL benchmark or a production performance claim.

The preview is not a full renderer migration. Node avatars, card menus, snapping and the standard minimap belong to the standard canvas; Reagraph uses its own sphere nodes and drag interactions. Existing API branch bounds remain in effect. No database migration, cloud rollout or release was performed.

References: [Reagraph layouts](https://reagraph.dev/docs/getting-started/Layouts), [clustering limitations](https://reagraph.dev/docs/advanced/Clustering), [custom layout/drag overrides](https://reagraph.dev/docs/advanced/CustomLayout).
