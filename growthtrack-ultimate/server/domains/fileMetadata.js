export function fileMetadata(row) {
  try { return JSON.parse(row?.data || '{}')?._vault || null; } catch { return null; }
}

export function fileToClient(row) {
  if (!row) return row;
  const metadata = fileMetadata(row);
  let legacy = {};
  try { legacy = JSON.parse(row.data || '{}'); } catch { /* Keep legacy records visible. */ }
  const available = Boolean(metadata && /^[a-f0-9]{64}$/.test(metadata.key) && Number.isSafeInteger(metadata.bytes));
  const bytes = available ? metadata.bytes : 0;
  return {
    id: row.id, name: row.title || legacy.name || 'Untitled document', title: row.title,
    date: row.createdAt, createdAt: row.createdAt, updatedAt: row.updatedAt,
    type: 'Private', visibility: 'private', sizeBytes: bytes,
    size: available ? (bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / 1024 / 1024).toFixed(2)} MB`) : legacy.size || 'Unknown',
    available, metadataOnly: !available, mimeType: available ? metadata.mime : null,
    previewKind: available ? metadata.previewKind : null,
    downloadUrl: available ? `/api/files/${encodeURIComponent(row.id)}/download` : null,
    previewUrl: available && metadata.previewKind ? `/api/files/${encodeURIComponent(row.id)}/preview` : null,
  };
}
