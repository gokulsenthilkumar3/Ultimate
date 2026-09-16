import { View, ActivityIndicator } from 'react-native';

export default function Index() {
  // RootLayout handles all routing logic based on auth state.
  // This page is just a fallback while routing happens.
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#0000ff" />
    </View>
  );
}
