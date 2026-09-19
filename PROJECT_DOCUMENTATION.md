# Netra Driver Guardian - Project Documentation

## Project Overview

**App Name:** Netra Driver Guardian
**Tech Stack:** React Native + Expo + ML Kit Face Detection
**Purpose:** Real-time driver drowsiness and distraction detection for Android

---

## Architecture Flow Chart

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           APP START                                          │
│                              │                                               │
│                              ▼                                               │
│                    ┌─────────────────┐                                        │
│                    │  Permission     │                                        │
│                    │  Request        │                                        │
│                    └────────┬────────┘                                        │
│                             │                                                │
│                             ▼                                                │
│                    ┌─────────────────┐                                        │
│              ┌─────│  Start Screen  │─────┐                                  │
│              │     └─────────────────┘     │                                  │
│              │                             │                                  │
│              │ START TRIP                  │                                  │
│              ▼                             ▼                                  │
│    ┌─────────────────┐          ┌─────────────────┐                        │
│    │ Camera + ML Kit  │◄─────────│  Trip Active?   │                        │
│    │ Face Detection   │          └────────┬────────┘                        │
│    └────────┬─────────┘                   │                                  │
│             │                              │ YES                              │
│             ▼                              │                                  │
│    ┌─────────────────┐                   │                                  │
│    │ extractDriver   │                   │                                  │
│    │ Metrics()        │                   │                                  │
│    │ - eyeOpenness   │                   │                                  │
│    │ - mouthOpenness │                   │                                  │
│    │ - headTurn      │                   │                                  │
│    └────────┬─────────┘                   │                                  │
│             │                              │                                  │
│             ▼                              │                                  │
│    ┌─────────────────┐                   │                                  │
│    │ SafetyEngine     │                   │                                  │
│    │ .processMetrics()│                  │                                  │
│    └────────┬─────────┘                   │                                  │
│             │                              │                                  │
│             ▼                              │                                  │
│    ┌─────────────────────────────────────┐│                                  │
│    │         WARNING LEVEL CHECK          ││                                  │
│    ├──────────┬──────────┬────────┬───────┤│                                  │
│    ▼          ▼          ▼        ▼       │                                  │
│  NORMAL      MILD     MODERATE  SEVERE CRITICAL                              │
│    │          │          │        │       │                                  │
│    │          ▼          ▼        │       │                                  │
│    │    ┌──────────┐ ┌────────┐   │       │                                  │
│    │    │ VOICE   │ │HAPTIC  │   │       │                                  │
│    │    │ ALERT   │ │FEEDBACK│   │       │                                  │
│    │    └──────────┘ └───┬────┘   │       │                                  │
│    │                     │        │       │                                  │
│    │                     ▼        ▼       │                                  │
│    │               ┌────────┐ ┌──────┐   │                                  │
│    │               │ SIREN  │ │STROBE│   │                                  │
│    │               └────────┘ └──────┘   │                                  │
│    │                                  │                                  │
│    │                                  │                                  │
│    └──────────────────────────────────┘                                  │
│                                     │                                      │
│                                     ▼                                      │
│                           ┌─────────────────┐                                │
│                           │  DEDUCT SCORE  │                                │
│                           │  ADD INFRACTION│                                │
│                           └────────┬──────┘                                 │
│                                    │                                        │
│                                    ▼                                        │
│                           ┌─────────────────┐                                │
│                           │  UPDATE UI     │                                 │
│                           │  Dashboard    │                                 │
│                           └─────────────────┘                                │
│                                    │                                        │
│                                    ▼                                        │
│                           ┌─────────────────┐                                │
│                           │    STOP TRIP    │                                │
│                           └────────┬──────┘                                 │
│                                    │                                        │
│                                    ▼                                        │
│                           ┌─────────────────┐                                │
│                           │  TRIP SUMMARY  │                                │
│                           │  + SCORE       │                                │
│                           └─────────────────┘                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Module Architecture

```
src/
├── driverSignals.ts       # Face data extraction utilities
│
├── types/
│   └── SafetyTypes.ts     # TypeScript types, enums, config
│
├── safety/
│   └── SafetyEngine.ts    # Core detection logic (drowsiness, yawn, distraction)
│
├── alarm/
│   └── AlarmManager.ts    # Escalating alarm system (TTS, haptics, siren, strobe)
│
├── state/
│   └── DriverContext.tsx  # React Context for global state management
│
├── components/
│   └── Dashboard.tsx      # UI overlay with safety score, metrics, trip summary
│
└── App.tsx                # Main entry, camera integration, flow control
```

---

## Detection Logic Details

### 1. Drowsiness Detection
```
IF eyeOpenness < 0.3 for > 1.5s → MODERATE (Voice + Haptic)
IF eyeOpenness < 0.15 for > 2.5s → CRITICAL (Siren + Strobe)
```

### 2. Yawn Detection
```
IF mouthOpenness > 0.35 for > 1.5s → MODERATE (Haptic feedback)
```

### 3. Distraction Detection
```
IF |headEulerAngleY| > 20° for > 2s → MILD (Voice alert)
```

---

## Skills Used

| Category | Skills |
|----------|--------|
| **Mobile Dev** | React Native, Expo, CameraX, Android development |
| **ML/AI** | Google ML Kit Face Detection, on-device ML inference |
| **State Management** | React Context + useReducer |
| **Audio/Haptics** | expo-speech (TTS), expo-haptics, expo-av (siren) |
| **Hardware Integration** | Camera torch (flashlight strobe), vibration patterns |
| **UI/UX** | Real-time overlays, color-coded scoring system |

---

## Dependencies

```json
{
  "expo": "~57.0.23",
  "expo-camera": "^57.0.5",
  "expo-haptics": "^57.0.3",
  "expo-speech": "^57.0.3",
  "expo-av": "^16.0.8",
  "expo-keep-awake": "^57.0.2",
  "@infinitered/react-native-mlkit-face-detection": "^5.0.0"
}
```

---

## How to Run

```bash
# Install dependencies
npm install

# Start Expo
npx expo start

# Run on Android
npx expo start --android

# Build APK
npx expo build:android --release
```

---

## Hackathon Tips for iQOO

1. **iQOO NPU Performance:** ML Kit runs efficiently on iQOO's Neural Processing Unit - mention this in your pitch
2. **Low-Light:** iQOO cameras excel in low-light - important for night driving
3. **Dashboard Mount:** Show the app running on an actual car dashboard mount for maximum impact
4. **Real Demo:** If possible, demonstrate in a parked car with proper lighting

---

## Scoring System

| Event | Points Deducted |
|-------|-----------------|
| Distraction | -2 |
| Eyes Closed (per event) | -2 |
| Yawn | -5 |
| Severe Drowsiness | -15 |

**Score Ranges:**
- **Green (80-100):** Safe driving
- **Yellow (50-79):** Mild concern
- **Red (0-49):** Critical - pull over!

---

## Escalation Matrix

| Level | Trigger | Actions |
|-------|---------|---------|
| 1 | Mild distraction/Yawn | Text-to-Speech voice alert |
| 2 | Eyes closed 1.5s+ | Aggressive haptic feedback |
| 3 | Eyes closed 2.5s+ / ignored | Loud siren sound |
| 4 | Severe drowsiness | Siren + Flashlight strobe |