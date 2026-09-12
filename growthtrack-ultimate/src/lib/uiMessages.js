/** Stable keys are ready for translation; diagnostic payloads stay out of UI copy. */
export const uiMessages = {
  connection: 'We could not connect. Check your connection and try again.',
  timeout: 'This is taking longer than expected. Check your connection and try again.',
  cancelled: 'The request was cancelled. Try again when you are ready.',
  signIn: 'We could not sign you in. Check your email and password, then try again.',
  session: 'Your session has ended. Sign in again to continue.',
  forbidden: 'You do not have access to this action. Sign in with the workspace owner account.',
  missing: 'This item is no longer available. Refresh the page to see the latest items.',
  conflict: 'This item has changed. Refresh the page before trying again.',
  validation: 'We could not save these details. Check the required fields and try again.',
  limited: 'Too many attempts were made. Wait a moment, then try again.',
  server: 'We could not complete this request. Try again in a moment.',
};
export function requestErrorMessage(status, path = '') {
  if (status === 401) return path.includes('/auth/login') ? uiMessages.signIn : uiMessages.session;
  return ({ 403: uiMessages.forbidden, 404: uiMessages.missing, 409: uiMessages.conflict, 400: uiMessages.validation, 422: uiMessages.validation, 429: uiMessages.limited, 408: uiMessages.timeout })[status] || uiMessages.server;
}
