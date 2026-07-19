# Mobile UI Architecture

## Component Structure
The Yeti app follows a strict boundary between UI and Data:
*   **Screens (`app/`)**: Dumb components that only subscribe to Stores and handle visual layouts (FlashList, Skia canvas).
*   **State (`store/`)**: Zustand stores (like `useTimerStore`, `useAuthStore`) that handle global UI state (like active timer countdowns).
*   **Hooks (`hooks/`)**: `useRepositories()` injects the WatermelonDB data access layer into the UI without coupling the UI directly to the database instance.

## Performance Requirements
*   **FlashList**: Used for the Workout Tracker and History screens to ensure 60fps scrolling even with hundreds of logged sets.
*   **Skia**: `@shopify/react-native-skia` is used on the Dashboard to render the 30-day Weight Trend and Macro Rings without dropping frames.
*   **Reanimated**: Used for micro-interactions (e.g. `FadeInDown` on Dashboard mount, PR Celebration popups).
