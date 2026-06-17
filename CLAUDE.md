@AGENTS.md

# Clock Out Calculator

Expo SDK 56 app. Single-screen iOS app for hourly workers.

## Stack
- Expo + TypeScript
- expo-notifications for scheduled alerts
- @react-native-community/datetimepicker for time input
- EAS Build for TestFlight distribution

## Build & Deploy
- `npx expo start` - dev server
- `npx eas build --platform ios` - build for iOS
- `npx eas submit --platform ios` - submit to TestFlight
