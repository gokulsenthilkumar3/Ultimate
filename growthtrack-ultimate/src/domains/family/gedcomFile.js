export const MAX_GEDCOM_BYTES = 1024 * 1024;

/** GEDCOM is UTF-8 in practice, but some tools write UTF-16 with a byte-order mark. */
export function decodeGedcom(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0xff && bytes[1] === 0xfe) return new TextDecoder('utf-16le').decode(bytes.subarray(2));
  if (bytes[0] === 0xfe && bytes[1] === 0xff) return new TextDecoder('utf-16be').decode(bytes.subarray(2));
  return new TextDecoder('utf-8').decode(bytes);
}

export function saveText(filename, text, mediaType) {
  const url = URL.createObjectURL(new Blob([text], { type: mediaType || 'text/plain;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; document.body.append(link); link.click(); link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
