import React, { createContext, useContext, useReducer, useCallback, useRef, useEffect } from 'react';
import { SafetyEngine, safetyEngine } from '../safety/SafetyEngine';
import { getAlarmManager } from '../alarm/AlarmManager';
import type { DriverMetrics } from '../driverSignals';
import type { SafetyState, Infraction, WarningLevel, DetectionType } from '../types/SafetyTypes';
import { DEFAULT_CONFIG } from '../types/SafetyTypes';

type DriverAction =
  | { type: 'START_TRIP' }
  | { type: 'STOP_TRIP' }
  | { type: 'UPDATE_WARNING'; payload: { warningLevel: WarningLevel; activeDetection: DetectionType | null } }
  | { type: 'DEDUCT_SCORE'; payload: { detectionType: DetectionType; severity: WarningLevel } }
  | { type: 'ADD_INFRACTION'; payload: Infraction }
  | { type: 'RESET_STATE' };

const INITIAL_STATE: SafetyState = {
  warningLevel: WarningLevel.NORMAL,
  activeDetection: null,
  rideSafetyScore: 100,
  isMonitoring: false,
  tripStartTime: null,
  infractions: [],
};

const MAX_SCORE = 100;
const MIN_SCORE = 0;

const SCORE_DEDUCTIONS: Record<DetectionType, number> = {
  [DetectionType.DISTRACTION]: DEFAULT_CONFIG.scoreDeductionDistraction,
  [DetectionType.YAWN]: DEFAULT_CONFIG.scoreDeductionYawn,
  [DetectionType.EYES_CLOSED]: DEFAULT_CONFIG.scoreDeductionDistraction,
  [DetectionType.SEVERE_DROWSINESS]: DEFAULT_CONFIG.scoreDeductionSevere,
};

function driverReducer(state: SafetyState, action: DriverAction): SafetyState {
  switch (action.type) {
    case 'START_TRIP':
      return {
        ...INITIAL_STATE,
        isMonitoring: true,
        tripStartTime: Date.now(),
        rideSafetyScore: MAX_SCORE,
      };

    case 'STOP_TRIP':
      return {
        ...state,
        isMonitoring: false,
        warningLevel: WarningLevel.NORMAL,
        activeDetection: null,
      };

    case 'UPDATE_WARNING':
      return {
        ...state,
        warningLevel: action.payload.warningLevel,
        activeDetection: action.payload.activeDetection,
      };

    case 'DEDUCT_SCORE':
      const deduction = SCORE_DEDUCTIONS[action.payload.detectionType] || 5;
      return {
        ...state,
        rideSafetyScore: Math.max(MIN_SCORE, state.rideSafetyScore - deduction),
      };

    case 'ADD_INFRACTION':
      return {
        ...state,
        infractions: [...state.infractions, action.payload],
      };

    case 'RESET_STATE':
      return INITIAL_STATE;

    default:
      return state;
  }
}

type DriverContextType = {
  state: SafetyState;
  startTrip: () => void;
  stopTrip: () => void;
  processDetection: (metrics: DriverMetrics) => void;
  getTripDuration: () => number;
  getInfractionSummary: () => Record<DetectionType, number>;
};

const DriverContext = createContext<DriverContextType | null>(null);

export const DriverProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(driverReducer, INITIAL_STATE);
  const engineRef = useRef(safetyEngine);
  const alarmManagerRef = useRef(getAlarmManager());
  const lastProcessTimeRef = useRef<number>(0);

  const startTrip = useCallback(() => {
    engineRef.current.reset();
    dispatch({ type: 'START_TRIP' });
  }, []);

  const stopTrip = useCallback(() => {
    alarmManagerRef.current.stopAllAlarms();
    dispatch({ type: 'STOP_TRIP' });
  }, []);

  const processDetection = useCallback((metrics: DriverMetrics) => {
    const now = Date.now();
    if (now - lastProcessTimeRef.current < 100) return;
    lastProcessTimeRef.current = now;

    const result = engineRef.current.processMetrics(metrics);

    dispatch({
      type: 'UPDATE_WARNING',
      payload: {
        warningLevel: result.warningLevel,
        activeDetection: result.activeDetection,
      },
    });

    alarmManagerRef.current.triggerAlarm(result.warningLevel, result.activeDetection || undefined);

    if (result.shouldDeductScore && result.detectionType) {
      dispatch({
        type: 'DEDUCT_SCORE',
        payload: {
          detectionType: result.detectionType,
          severity: result.warningLevel,
        },
      });

      dispatch({
        type: 'ADD_INFRACTION',
        payload: {
          type: result.detectionType,
          timestamp: now,
          severity: result.warningLevel,
          duration: 0,
        },
      });
    }
  }, []);

  const getTripDuration = useCallback((): number => {
    if (!state.tripStartTime) return 0;
    return Date.now() - state.tripStartTime;
  }, [state.tripStartTime]);

  const getInfractionSummary = useCallback((): Record<DetectionType, number> => {
    const summary: Record<DetectionType, number> = {
      [DetectionType.DISTRACTION]: 0,
      [DetectionType.YAWN]: 0,
      [DetectionType.EYES_CLOSED]: 0,
      [DetectionType.SEVERE_DROWSINESS]: 0,
    };

    state.infractions.forEach((infraction) => {
      summary[infraction.type]++;
    });

    return summary;
  }, [state.infractions]);

  useEffect(() => {
    return () => {
      alarmManagerRef.current.cleanup();
    };
  }, []);

  return (
    <DriverContext.Provider
      value={{
        state,
        startTrip,
        stopTrip,
        processDetection,
        getTripDuration,
        getInfractionSummary,
      }}
    >
      {children}
    </DriverContext.Provider>
  );
};

export const useDriver = (): DriverContextType => {
  const context = useContext(DriverContext);
  if (!context) {
    throw new Error('useDriver must be used within a DriverProvider');
  }
  return context;
};