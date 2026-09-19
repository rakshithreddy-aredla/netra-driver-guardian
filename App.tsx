import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Linking,
} from 'react-native';
import { CameraView, useCameraPermissions, FaceDetector } from 'expo-camera';
import * as FaceDetection from '@infinitered/react-native-mlkit-face-detection';
import { DriverProvider, useDriver } from './src/state/DriverContext';
import { SafetyDashboard, TripSummary } from './src/components/Dashboard';
import { extractDriverMetrics } from './src/driverSignals';
import { DetectionType } from './src/types/SafetyTypes';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { Audio } from 'expo-av';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

const AppContent: React.FC = () => {
  const [hasPermission, requestPermission] = useCameraPermissions();
  const [isPreviewVisible, setIsPreviewVisible] = useState(true);
  const [showSummary, setShowSummary] = useState(false);
  const [tripDuration, setTripDuration] = useState(0);
  const [infractionSummary, setInfractionSummary] = useState<Record<DetectionType, number>>(
    Object.fromEntries(Object.values(DetectionType).map(t => [t, 0])) as Record<DetectionType, number>
  );
  const cameraRef = useRef<CameraView>(null);
  const faceDetectorRef = useRef<FaceDetection.FaceDetector | null>(null);
  const { state, startTrip, stopTrip, processDetection, getTripDuration, getInfractionSummary } = useDriver();
  const durationIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleTripStart = useCallback(async () => {
    try {
      await activateKeepAwakeAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: false,
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
      });
    } catch (error) {
      console.warn('Failed to activate keep awake:', error);
    }

    startTrip();

    durationIntervalRef.current = setInterval(() => {
      setTripDuration(getTripDuration());
    }, 1000);
  }, [startTrip, getTripDuration]);

  const handleTripStop = useCallback(async () => {
    if (durationIntervalRef.current) {
      clearInterval(durationIntervalRef.current);
      durationIntervalRef.current = null;
    }

    try {
      await deactivateKeepAwake();
    } catch (error) {
      console.warn('Failed to deactivate keep awake:', error);
    }

    setInfractionSummary(getInfractionSummary());
    setShowSummary(true);
    stopTrip();
  }, [stopTrip, getInfractionSummary]);

  const handleFaceDetection = useCallback(async (faces: any[]) => {
    if (!state.isMonitoring) return;

    if (faces.length === 0) {
      return;
    }

    const face = faces[0];
    const imageWidth = SCREEN_WIDTH;
    const imageHeight = SCREEN_HEIGHT;

    const metrics = extractDriverMetrics(face, imageWidth, imageHeight);
    processDetection(metrics);
  }, [state.isMonitoring, processDetection]);

  const handleSummaryClose = useCallback(() => {
    setShowSummary(false);
    setIsPreviewVisible(true);
  }, []);

  useEffect(() => {
    return () => {
      if (durationIntervalRef.current) {
        clearInterval(durationIntervalRef.current);
      }
      deactivateKeepAwake();
    };
  }, []);

  if (!hasPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Access Required</Text>
        <Text style={styles.permissionText}>
          Netra Driver Guardian needs camera access to monitor your driving safety.
        </Text>
        <TouchableOpacity style={styles.permissionButton} onPress={requestPermission}>
          <Text style={styles.permissionButtonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!hasPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionTitle}>Camera Permission Denied</Text>
        <Text style={styles.permissionText}>
          Please enable camera access in your device settings to use this app.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={() => Linking.openSettings()}
        >
          <Text style={styles.permissionButtonText}>Open Settings</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (showSummary) {
    return (
      <TripSummary
        score={state.rideSafetyScore}
        duration={tripDuration}
        infractions={infractionSummary}
        onClose={handleSummaryClose}
      />
    );
  }

  if (!state.isMonitoring) {
    return (
      <View style={styles.startContainer}>
        <View style={styles.logoContainer}>
          <Text style={styles.logoIcon}>👁️</Text>
          <Text style={styles.logoTitle}>NETRA</Text>
          <Text style={styles.logoSubtitle}>Driver Guardian</Text>
        </View>

        <View style={styles.featuresContainer}>
          <FeatureItem icon="😴" text="Drowsiness Detection" />
          <FeatureItem icon="😮" text="Yawn Monitoring" />
          <FeatureItem icon="👋" text="Distraction Alert" />
          <FeatureItem icon="📊" text="Safety Scoring" />
        </View>

        <TouchableOpacity
          style={styles.startButton}
          onPress={() => {
            setIsPreviewVisible(true);
            handleTripStart();
          }}
          activeOpacity={0.8}
        >
          <Text style={styles.startButtonText}>START TRIP</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          For demo purposes only. Always drive safely.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <CameraView
        ref={cameraRef}
        style={styles.camera}
        facing="front"
        onFacesDetected={(data) => handleFaceDetection(data.faces)}
      >
        <FaceDetection.FaceDetector
          options={{
            performanceMode: 'accurate',
            landmarkMode: 'all',
            contourMode: 'all',
            classificationMode: 'all',
          }}
        >
          <View style={styles.overlay}>
            <SafetyDashboard onStopTrip={handleTripStop} />
          </View>
        </FaceDetection.FaceDetector>
      </CameraView>
    </View>
  );
};

const FeatureItem: React.FC<{ icon: string; text: string }> = ({ icon, text }) => (
  <View style={styles.featureItem}>
    <Text style={styles.featureIcon}>{icon}</Text>
    <Text style={styles.featureText}>{text}</Text>
  </View>
);

export default function App() {
  return (
    <DriverProvider>
      <AppContent />
    </DriverProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
  },
  startContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  logoTitle: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#3b82f6',
    letterSpacing: 8,
  },
  logoSubtitle: {
    fontSize: 18,
    color: '#94a3b8',
    marginTop: 8,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 48,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(59, 130, 246, 0.1)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  featureIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    color: 'white',
    fontWeight: '500',
  },
  startButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 64,
    shadowColor: '#3b82f6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  startButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'white',
    letterSpacing: 2,
  },
  disclaimer: {
    marginTop: 24,
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  permissionContainer: {
    flex: 1,
    backgroundColor: '#0f172a',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'white',
    marginBottom: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  permissionButton: {
    backgroundColor: '#3b82f6',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
  },
  permissionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
});