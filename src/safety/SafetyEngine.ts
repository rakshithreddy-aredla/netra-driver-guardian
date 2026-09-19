import type { DriverMetrics } from '../driverSignals';
import type { SafetyEngineConfig, SafetyEngineResult, WarningLevel, DetectionType } from '../types/SafetyTypes';
import { DEFAULT_CONFIG } from '../types/SafetyTypes';

interface TrackingState {
  eyeClosedStartTime: number | null;
  severeDrowsinessStartTime: number | null;
  yawnStartTime: number | null;
  distractionStartTime: number | null;
  lastEyeClosedScoreDeducted: boolean;
  lastYawnScoreDeducted: boolean;
  lastDistractionScoreDeducted: boolean;
}

export class SafetyEngine {
  private config: SafetyEngineConfig;
  private state: TrackingState;

  constructor(config: Partial<SafetyEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.state = {
      eyeClosedStartTime: null,
      severeDrowsinessStartTime: null,
      yawnStartTime: null,
      distractionStartTime: null,
      lastEyeClosedScoreDeducted: false,
      lastYawnScoreDeducted: false,
      lastDistractionScoreDeducted: false,
    };
  }

  reset(): void {
    this.state = {
      eyeClosedStartTime: null,
      severeDrowsinessStartTime: null,
      yawnStartTime: null,
      distractionStartTime: null,
      lastEyeClosedScoreDeducted: false,
      lastYawnScoreDeducted: false,
      lastDistractionScoreDeducted: false,
    };
  }

  processMetrics(metrics: DriverMetrics): SafetyEngineResult {
    const now = Date.now();
    const { eyeOpenness, mouthOpenness, headTurn } = metrics;

    let warningLevel: WarningLevel = WarningLevel.NORMAL;
    let activeDetection: DetectionType | null = null;
    let shouldDeductScore = false;
    let detectionType: DetectionType | undefined;

    if (!metrics.faceDetected) {
      this.reset();
      return { warningLevel, activeDetection, shouldDeductScore };
    }

    const isEyeClosed = eyeOpenness !== null && eyeOpenness < this.config.eyeClosedThreshold;
    const isSevereDrowsiness = eyeOpenness !== null && eyeOpenness < 0.15;
    const isYawning = mouthOpenness !== null && mouthOpenness > this.config.yawnThreshold;
    const isDistracted = headTurn !== null && headTurn > this.config.distractionAngleThreshold;

    if (isEyeClosed) {
      if (this.state.eyeClosedStartTime === null) {
        this.state.eyeClosedStartTime = now;
      }
      const eyeClosedDuration = now - this.state.eyeClosedStartTime;

      if (isSevereDrowsiness) {
        if (this.state.severeDrowsinessStartTime === null) {
          this.state.severeDrowsinessStartTime = now;
        }
        const severeDuration = now - this.state.severeDrowsinessStartTime;

        if (severeDuration >= this.config.severeDrowsinessDurationMs) {
          warningLevel = WarningLevel.CRITICAL;
          activeDetection = DetectionType.SEVERE_DROWSINESS;
          shouldDeductScore = true;
          detectionType = DetectionType.SEVERE_DROWSINESS;
        } else {
          warningLevel = WarningLevel.SEVERE;
          activeDetection = DetectionType.SEVERE_DROWSINESS;
        }
      } else if (eyeClosedDuration >= this.config.eyeClosedDurationMs) {
        warningLevel = WarningLevel.MODERATE;
        activeDetection = DetectionType.EYES_CLOSED;
        shouldDeductScore = !this.state.lastEyeClosedScoreDeducted;
        detectionType = DetectionType.EYES_CLOSED;
        this.state.lastEyeClosedScoreDeducted = true;
      } else if (eyeClosedDuration >= this.config.eyeClosedDurationMs / 2) {
        warningLevel = WarningLevel.MILD;
        activeDetection = DetectionType.EYES_CLOSED;
      }
    } else {
      this.state.eyeClosedStartTime = null;
      this.state.severeDrowsinessStartTime = null;
      this.state.lastEyeClosedScoreDeducted = false;
    }

    if (isYawning) {
      if (this.state.yawnStartTime === null) {
        this.state.yawnStartTime = now;
      }
      const yawnDuration = now - this.state.yawnStartTime;

      if (yawnDuration >= this.config.yawnDurationMs) {
        if (warningLevel < WarningLevel.MODERATE) {
          warningLevel = WarningLevel.MODERATE;
        }
        activeDetection = DetectionType.YAWN;
        shouldDeductScore = !this.state.lastYawnScoreDeducted;
        detectionType = DetectionType.YAWN;
        this.state.lastYawnScoreDeducted = true;
      }
    } else {
      this.state.yawnStartTime = null;
      this.state.lastYawnScoreDeducted = false;
    }

    if (isDistracted) {
      if (this.state.distractionStartTime === null) {
        this.state.distractionStartTime = now;
      }
      const distractionDuration = now - this.state.distractionStartTime;

      if (distractionDuration >= this.config.distractionDurationMs) {
        if (warningLevel < WarningLevel.MILD) {
          warningLevel = WarningLevel.MILD;
        }
        if (activeDetection === null) {
          activeDetection = DetectionType.DISTRACTION;
        }
        shouldDeductScore = !this.state.lastDistractionScoreDeducted;
        detectionType = DetectionType.DISTRACTION;
        this.state.lastDistractionScoreDeducted = true;
      }
    } else {
      this.state.distractionStartTime = null;
      this.state.lastDistractionScoreDeducted = false;
    }

    return { warningLevel, activeDetection, shouldDeductScore, detectionType };
  }

  getCurrentState(): TrackingState {
    return { ...this.state };
  }
}

export const safetyEngine = new SafetyEngine();