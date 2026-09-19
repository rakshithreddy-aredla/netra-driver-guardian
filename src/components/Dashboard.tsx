import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Dimensions } from 'react-native';
import { useDriver } from '../state/DriverContext';
import { WarningLevel, DetectionType } from '../types/SafetyTypes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const getScoreColor = (score: number): string => {
  if (score >= 80) return '#22c55e';
  if (score >= 50) return '#eab308';
  return '#ef4444';
};

const getWarningColor = (warningLevel: WarningLevel): string => {
  switch (warningLevel) {
    case WarningLevel.NORMAL:
      return '#22c55e';
    case WarningLevel.MILD:
      return '#84cc16';
    case WarningLevel.MODERATE:
      return '#eab308';
    case WarningLevel.SEVERE:
      return '#f97316';
    case WarningLevel.CRITICAL:
      return '#ef4444';
    default:
      return '#22c55e';
  }
};

const getStatusText = (
  warningLevel: WarningLevel,
  activeDetection: DetectionType | null
): string => {
  if (!activeDetection) {
    return 'Monitoring...';
  }

  switch (activeDetection) {
    case DetectionType.EYES_CLOSED:
      return 'EYES CLOSED!';
    case DetectionType.YAWN:
      return 'YAWNING DETECTED!';
    case DetectionType.DISTRACTION:
      return 'LOOKING AWAY!';
    case DetectionType.SEVERE_DROWSINESS:
      return 'SEVERE DROWSINESS!';
    default:
      return 'Monitoring...';
  }
};

const formatDuration = (ms: number): string => {
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  }
  return `${seconds}s`;
};

interface SafetyDashboardProps {
  onStopTrip: () => void;
}

export const SafetyDashboard: React.FC<SafetyDashboardProps> = ({ onStopTrip }) => {
  const { state, getTripDuration } = useDriver();
  const { rideSafetyScore, warningLevel, activeDetection, tripStartTime, infractions } = state;

  const scoreColor = getScoreColor(rideSafetyScore);
  const warningColor = getWarningColor(warningLevel);
  const statusText = getStatusText(warningLevel, activeDetection);
  const tripDuration = tripStartTime ? getTripDuration() : 0;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <View style={[styles.scoreContainer, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreLabel}>RIDE SAFETY SCORE</Text>
          <Text style={styles.scoreValue}>{Math.round(rideSafetyScore)}</Text>
        </View>

        <View style={[styles.statusContainer, { borderColor: warningColor }]}>
          <Text style={[styles.statusText, { color: warningColor }]}>{statusText}</Text>
        </View>
      </View>

      <View style={styles.metricsContainer}>
        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>TRIP DURATION</Text>
          <Text style={styles.metricValue}>{formatDuration(tripDuration)}</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>TOTAL INFRACTIONS</Text>
          <Text style={styles.metricValue}>{infractions.length}</Text>
        </View>

        <View style={styles.metricBox}>
          <Text style={styles.metricLabel}>WARNING LEVEL</Text>
          <Text style={[styles.metricValue, { color: warningColor }]}>
            {warningLevel}
          </Text>
        </View>
      </View>

      <View style={styles.detectionIndicators}>
        <Text style={styles.indicatorsTitle}>Active Monitoring:</Text>
        <View style={styles.indicatorRow}>
          <IndicatorDot
            label="Eyes"
            isActive={activeDetection === DetectionType.EYES_CLOSED || activeDetection === DetectionType.SEVERE_DROWSINESS}
            color={warningColor}
          />
          <IndicatorDot
            label="Mouth"
            isActive={activeDetection === DetectionType.YAWN}
            color={warningColor}
          />
          <IndicatorDot
            label="Head"
            isActive={activeDetection === DetectionType.DISTRACTION}
            color={warningColor}
          />
        </View>
      </View>

      <TouchableOpacity
        style={styles.stopButton}
        onPress={onStopTrip}
        activeOpacity={0.8}
      >
        <Text style={styles.stopButtonText}>STOP TRIP</Text>
      </TouchableOpacity>
    </View>
  );
};

interface IndicatorDotProps {
  label: string;
  isActive: boolean;
  color: string;
}

const IndicatorDot: React.FC<IndicatorDotProps> = ({ label, isActive, color }) => (
  <View style={styles.indicatorItem}>
    <View
      style={[
        styles.dot,
        { backgroundColor: isActive ? color : '#374151' },
        isActive && styles.dotActive,
      ]}
    />
    <Text style={[styles.dotLabel, isActive && { color }]}>{label}</Text>
  </View>
);

interface TripSummaryProps {
  score: number;
  duration: number;
  infractions: Record<DetectionType, number>;
  onClose: () => void;
}

export const TripSummary: React.FC<TripSummaryProps> = ({
  score,
  duration,
  infractions,
  onClose,
}) => {
  const scoreColor = getScoreColor(score);

  return (
    <View style={styles.summaryContainer}>
      <Text style={styles.summaryTitle}>TRIP SUMMARY</Text>

      <View style={[styles.summaryScore, { backgroundColor: scoreColor }]}>
        <Text style={styles.summaryScoreLabel}>Final Score</Text>
        <Text style={styles.summaryScoreValue}>{Math.round(score)}</Text>
      </View>

      <View style={styles.summaryDetails}>
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Trip Duration:</Text>
          <Text style={styles.summaryValue}>{formatDuration(duration)}</Text>
        </View>

        <View style={styles.divider} />

        <Text style={styles.infractionTitle}>Infractions:</Text>
        {Object.entries(infractions).map(([type, count], index) => (
          <View key={`${type}-${index}`} style={styles.infractionRow}>
            <Text style={styles.infractionType}>{type.replace(/_/g, ' ')}:</Text>
            <Text style={styles.infractionCount}>{count}</Text>
          </View>
        ))}
      </View>

      <TouchableOpacity
        style={styles.closeButton}
        onPress={onClose}
        activeOpacity={0.8}
      >
        <Text style={styles.closeButtonText}>CLOSE</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  scoreContainer: {
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    minWidth: 140,
  },
  scoreLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: 'white',
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 48,
    fontWeight: 'bold',
    color: 'white',
  },
  statusContainer: {
    borderWidth: 3,
    borderRadius: 12,
    padding: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  statusText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  metricsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  metricBox: {
    backgroundColor: 'rgba(75, 75, 75, 0.6)',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    flex: 1,
    marginHorizontal: 4,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 4,
  },
  metricValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  detectionIndicators: {
    backgroundColor: 'rgba(75, 75, 75, 0.6)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
  },
  indicatorsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#9ca3af',
    marginBottom: 12,
  },
  indicatorRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  indicatorItem: {
    alignItems: 'center',
  },
  dot: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginBottom: 6,
  },
  dotActive: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 8,
  },
  dotLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: '#9ca3af',
  },
  stopButton: {
    backgroundColor: '#ef4444',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginTop: 'auto',
  },
  stopButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryContainer: {
    flex: 1,
    padding: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
    justifyContent: 'center',
  },
  summaryTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: 'white',
    textAlign: 'center',
    marginBottom: 32,
  },
  summaryScore: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 32,
  },
  summaryScoreLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.8)',
  },
  summaryScoreValue: {
    fontSize: 72,
    fontWeight: 'bold',
    color: 'white',
  },
  summaryDetails: {
    backgroundColor: 'rgba(75, 75, 75, 0.4)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    color: '#9ca3af',
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
  },
  divider: {
    height: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginVertical: 16,
  },
  infractionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: 'white',
    marginBottom: 12,
  },
  infractionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  infractionType: {
    fontSize: 14,
    color: '#9ca3af',
    textTransform: 'capitalize',
  },
  infractionCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  closeButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'white',
  },
});