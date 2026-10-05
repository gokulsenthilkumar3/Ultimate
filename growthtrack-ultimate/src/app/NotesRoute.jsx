import Notes from '../components/Notes';
import { encryptedNoteDrafts } from '../domains/workspace/adapters/encryptedNoteDrafts';
import { readMarkdownFile, downloadMarkdownNote } from '../domains/workspace/adapters/markdownFiles';

// The composition root selects browser adapters. Notes receives ports so a
// native client or a test can provide a different file and draft implementation.
const files = { read: readMarkdownFile, download: downloadMarkdownNote };
export default function NotesRoute(props) {
  return <Notes {...props} draftStore={encryptedNoteDrafts} fileTransfer={files} />;
}
