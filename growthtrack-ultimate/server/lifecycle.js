// Shared by signal handling and Electron's before-quit hook. Stop scheduling
// immediately, then drain both HTTP requests and backup work before disconnecting.
export function createServerCloser({ server, stopScheduling, stopBackups, disconnect }) {
  let closing;
  return () => {
    closing ||= Promise.resolve().then(async () => {
      stopScheduling();
      await Promise.all([new Promise(resolve => server.close(resolve)), stopBackups()]);
      await disconnect();
    });
    return closing;
  };
}
