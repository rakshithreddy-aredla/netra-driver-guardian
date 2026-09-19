import type {
  RNMLKitFace,
  RNMLKitFaceContour,
  RNMLKitFaceLandmark,
} from '@infinitered/react-native-mlkit-face-detection';

export type DriverMetrics = {
  faceDetected: boolean;
  eyeOpenness: number | null;
  mouthOpenness: number | null;
  headTurn: number | null;
  headPitch: number | null;
  headRoll: number | null;
  faceCenterX: number | null;
  faceCenterY: number | null;
  faceSizeRatio: number | null;
};

const landmarkPosition = (
  landmarks: RNMLKitFaceLandmark[],
  type: RNMLKitFaceLandmark['type'],
) => landmarks.find((landmark) => landmark.type === type)?.position ?? null;

const contourPoints = (
  contours: RNMLKitFaceContour[],
  type: RNMLKitFaceContour['type'],
) => contours.find((contour) => contour.type === type)?.points ?? null;

const averageY = (points: Array<{ x: number; y: number }> | null) => {
  if (!points?.length) {
    return null;
  }

  return points.reduce((sum, point) => sum + point.y, 0) / points.length;
};

const distance = (
  first: { x: number; y: number } | null,
  second: { x: number; y: number } | null,
) => {
  if (!first || !second) {
    return null;
  }

  return Math.hypot(first.x - second.x, first.y - second.y);
};

export const extractDriverMetrics = (
  face: RNMLKitFace | undefined,
  imageWidth: number,
  imageHeight: number,
): DriverMetrics => {
  if (!face || imageWidth <= 0 || imageHeight <= 0) {
    return {
      faceDetected: false,
      eyeOpenness: null,
      mouthOpenness: null,
      headTurn: null,
      headPitch: null,
      headRoll: null,
      faceCenterX: null,
      faceCenterY: null,
      faceSizeRatio: null,
    };
  }

  const leftEye = face.hasLeftEyeOpenProbability
    ? (face.leftEyeOpenProbability ?? 1)
    : null;
  const rightEye = face.hasRightEyeOpenProbability
    ? (face.rightEyeOpenProbability ?? 1)
    : null;
  const eyeValues = [leftEye, rightEye].filter(
    (value): value is number => value !== null,
  );
  const eyeOpenness = eyeValues.length
    ? eyeValues.reduce((sum, value) => sum + value, 0) / eyeValues.length
    : null;

  const leftMouth = landmarkPosition(face.landmarks, 'leftMouth');
  const rightMouth = landmarkPosition(face.landmarks, 'rightMouth');
  const mouthWidth = distance(leftMouth, rightMouth);
  const upperLipY = averageY(contourPoints(face.contours, 'upperLipBottom'));
  const lowerLipY = averageY(contourPoints(face.contours, 'lowerLipTop'));
  const mouthOpenness =
    mouthWidth && upperLipY !== null && lowerLipY !== null
      ? Math.max(0, lowerLipY - upperLipY) / mouthWidth
      : null;

  const faceCenterX =
    (face.frame.origin.x + face.frame.size.x / 2) / imageWidth;
  const faceCenterY =
    (face.frame.origin.y + face.frame.size.y / 2) / imageHeight;

  return {
    faceDetected: true,
    eyeOpenness,
    mouthOpenness,
    headTurn: face.hasHeadEulerAngleY
      ? Math.abs(face.headEulerAngleY ?? 0)
      : null,
    headPitch: face.hasHeadEulerAngleX
      ? Math.abs(face.headEulerAngleX ?? 0)
      : null,
    headRoll: face.hasHeadEulerAngleZ
      ? Math.abs(face.headEulerAngleZ ?? 0)
      : null,
    faceCenterX,
    faceCenterY,
    faceSizeRatio: face.frame.size.x / imageWidth,
  };
};
