/**
 * Cross-platform destructive confirmation helper.
 *
 * On native (iOS / Android) it shows the standard Alert dialog with Cancel/Confirm buttons.
 * On web, Alert.alert button arrays are not supported by React Native Web, so we fall back
 * to the browser's synchronous window.confirm() which works reliably everywhere.
 */

import { Alert, Platform } from 'react-native';

export function confirmAlert(
  title: string,
  message: string,
  onConfirm: () => void,
  confirmLabel = 'Delete',
  destructive = true
): void {
  if (Platform.OS === 'web') {
    // window.confirm is synchronous — if user clicks OK, fire the callback immediately.
    if (window.confirm(`${title}\n\n${message}`)) {
      onConfirm();
    }
    return;
  }

  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    {
      text: confirmLabel,
      style: destructive ? 'destructive' : 'default',
      onPress: onConfirm,
    },
  ]);
}
