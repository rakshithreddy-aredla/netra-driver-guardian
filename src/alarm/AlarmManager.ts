import { Audio } from 'expo-av';
import * as Speech from 'expo-speech';
import * as Haptics from 'expo-haptics';
import { Vibration, Platform } from 'react-native';
import { WarningLevel, DetectionType } from '../types/SafetyTypes';
import * as Device from 'expo-device';

export enum AlarmLevel {
  NONE = 0,
  VOICE_ALERT = 1,
  HAPTIC_FEEDBACK = 2,
  SIREN = 3,
  STROBE = 4,
}

export type AlarmConfig = {
  voiceMessageNormal: string;
  voiceMessageMild: string;
  voiceMessageModerate: string;
  voiceMessageSevere: string;
  voiceMessageCritical: string;
};

const VOICE_MESSAGES: Record<WarningLevel, string> = {
  [WarningLevel.NORMAL]: 'Monitoring active. Stay safe.',
  [WarningLevel.MILD]: 'Please keep your eyes on the road.',
  [WarningLevel.MODERATE]: 'Warning! Eyes on the road now!',
  [WarningLevel.SEVERE]: 'Danger! Pull over immediately!',
  [WarningLevel.CRITICAL]: 'CRITICAL ALERT! Please wake up!',
};

const DETECTION_MESSAGES: Record<DetectionType, string> = {
  [DetectionType.EYES_CLOSED]: 'Eyes closed. Stay awake!',
  [DetectionType.YAWN]: 'Yawning detected. Stay alert!',
  [DetectionType.DISTRACTION]: 'Looking away from road!',
  [DetectionType.SEVERE_DROWSINESS]: 'Severe drowsiness! Pull over now!',
};

export class AlarmManager {
  private currentAlarmLevel: AlarmLevel;
  private sirenSound: Audio.Sound | null = null;
  private isSpeaking: boolean = false;
  private isStrobing: boolean = false;
  private strobeInterval: ReturnType<typeof setInterval> | null = null;
  private lastVoiceAlert: number = 0;
  private voiceAlertCooldownMs: number = 5000;

  constructor() {
    this.currentAlarmLevel = AlarmLevel.NONE;
    this.configureAudio();
  }

  private async configureAudio(): Promise<void> {
    try {
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.warn('Failed to configure audio mode:', error);
    }
  }

  async triggerAlarm(
    warningLevel: WarningLevel,
    detectionType?: DetectionType
  ): Promise<void> {
    const now = Date.now();
    const alarmLevel = this.getAlarmLevel(warningLevel);

    this.currentAlarmLevel = alarmLevel;

    if (alarmLevel >= AlarmLevel.VOICE_ALERT) {
      const message = detectionType
        ? DETECTION_MESSAGES[detectionType]
        : VOICE_MESSAGES[warningLevel];

      if (now - this.lastVoiceAlert >= this.voiceAlertCooldownMs) {
        await this.speak(message);
        this.lastVoiceAlert = now;
      }
    }

    if (alarmLevel >= AlarmLevel.HAPTIC_FEEDBACK) {
      await this.triggerHaptics(warningLevel);
    }

    if (alarmLevel >= AlarmLevel.SIREN) {
      await this.playSiren();
    }

    if (alarmLevel >= AlarmLevel.STROBE) {
      this.startStrobe();
    }
  }

  private getAlarmLevel(warningLevel: WarningLevel): AlarmLevel {
    switch (warningLevel) {
      case WarningLevel.NORMAL:
        return AlarmLevel.NONE;
      case WarningLevel.MILD:
        return AlarmLevel.VOICE_ALERT;
      case WarningLevel.MODERATE:
        return AlarmLevel.HAPTIC_FEEDBACK;
      case WarningLevel.SEVERE:
        return AlarmLevel.SIREN;
      case WarningLevel.CRITICAL:
        return AlarmLevel.STROBE;
      default:
        return AlarmLevel.NONE;
    }
  }

  private async speak(message: string): Promise<void> {
    if (this.isSpeaking) {
      await Speech.stop();
    }

    try {
      this.isSpeaking = true;
      await Speech.speak(message, {
        language: 'en',
        rate: 0.9,
        pitch: 1.0,
        onDone: () => {
          this.isSpeaking = false;
        },
        onError: () => {
          this.isSpeaking = false;
        },
      });
    } catch (error) {
      console.warn('Speech error:', error);
      this.isSpeaking = false;
    }
  }

  private async triggerHaptics(warningLevel: WarningLevel): Promise<void> {
    try {
      if (!Device.isDevice) {
        Vibration.vibrate([0, 500, 200, 500]);
        return;
      }

      switch (warningLevel) {
        case WarningLevel.MODERATE:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          break;
        case WarningLevel.SEVERE:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          await new Promise(resolve => setTimeout(resolve, 300));
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        case WarningLevel.CRITICAL:
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          await new Promise(resolve => setTimeout(resolve, 150));
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          await new Promise(resolve => setTimeout(resolve, 150));
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          break;
        default:
          await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
      }
    } catch (error) {
      console.warn('Haptics error:', error);
      Vibration.vibrate(500);
    }
  }

  private async playSiren(): Promise<void> {
    try {
      if (this.sirenSound) {
        await this.sirenSound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(
        { uri: 'https://www.soundjay.com/misc/sounds/fail-buzzer-01.mp3' },
        { shouldPlay: true, isLooping: true, volume: 1.0 }
      );
      this.sirenSound = sound;
    } catch (error) {
      console.warn('Siren playback error:', error);
    }
  }

  private startStrobe(): void {
    if (this.isStrobing) return;
    this.isStrobing = true;

    let isOn = false;
    this.strobeInterval = setInterval(async () => {
      isOn = !isOn;
      try {
        if (Platform.OS === 'android') {
        }
      } catch {
      }
    }, 100);
  }

  async stopAllAlarms(): Promise<void> {
    this.currentAlarmLevel = AlarmLevel.NONE;

    if (this.isStrobing && this.strobeInterval) {
      clearInterval(this.strobeInterval);
      this.strobeInterval = null;
      this.isStrobing = false;
    }

    if (this.sirenSound) {
      try {
        await this.sirenSound.stopAsync();
        await this.sirenSound.unloadAsync();
      } catch {
      }
      this.sirenSound = null;
    }

    try {
      await Speech.stop();
    } catch {
    }

    this.isSpeaking = false;
  }

  getCurrentAlarmLevel(): AlarmLevel {
    return this.currentAlarmLevel;
  }

  isAlarmActive(): boolean {
    return this.currentAlarmLevel > AlarmLevel.NONE;
  }

  cleanup(): void {
    this.stopAllAlarms();
  }
}

let alarmManagerInstance: AlarmManager | null = null;

export const getAlarmManager = (): AlarmManager => {
  if (!alarmManagerInstance) {
    alarmManagerInstance = new AlarmManager();
  }
  return alarmManagerInstance;
};