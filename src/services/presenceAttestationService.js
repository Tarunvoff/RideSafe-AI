import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Location from 'expo-location';
import { Accelerometer } from 'expo-sensors';
import * as Device from 'expo-device';
import * as Network from 'expo-network';
import * as Application from 'expo-application';

const SNAPSHOT_QUEUE_KEY = '@blink_presence_snapshot_queue_v1';
const MAX_QUEUE_SIZE = 100;
const ENGINE_FREQ_RANGE = { min: 20, max: 80 };
const SCORE_WEIGHTS = {
  gpsIntegrity: 0.35,
  radioEnvironment: 0.25,
  motionPattern: 0.25,
  deviceIntegrity: 0.15,
};

const BACKEND_BASE_URL = process.env.EXPO_PUBLIC_ML_API_URL;

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function classifyRiskStatus(score) {
  if (score >= 0.66) return 'fail';
  if (score >= 0.33) return 'warn';
  return 'pass';
}

function scoreToPercent(score) {
  return Math.round(clamp(score) * 100);
}

function estimateDominantFrequency(magnitudes, sampleRateHz, minHz = 2, maxHz = 100) {
  if (!magnitudes || magnitudes.length < 8 || !sampleRateHz) return 0;

  const maxAnalyzableHz = Math.min(maxHz, Math.floor(sampleRateHz / 2));
  if (maxAnalyzableHz < minHz) return 0;

  let topFrequency = 0;
  let topPower = 0;

  for (let frequency = minHz; frequency <= maxAnalyzableHz; frequency += 1) {
    let real = 0;
    let imaginary = 0;

    for (let sampleIndex = 0; sampleIndex < magnitudes.length; sampleIndex += 1) {
      const angle = (2 * Math.PI * frequency * sampleIndex) / sampleRateHz;
      real += magnitudes[sampleIndex] * Math.cos(angle);
      imaginary -= magnitudes[sampleIndex] * Math.sin(angle);
    }

    const power = real * real + imaginary * imaginary;
    if (power > topPower) {
      topPower = power;
      topFrequency = frequency;
    }
  }

  return topFrequency;
}

function computeMotionFeatures(samples, intervalMs) {
  if (!samples || samples.length === 0) {
    return {
      variance: null,
      meanMagnitude: null,
      dominantFrequencyHz: null,
      sampleCount: 0,
    };
  }

  const magnitudes = samples.map((sample) => Math.hypot(sample.x, sample.y, sample.z));
  const meanMagnitude = magnitudes.reduce((sum, current) => sum + current, 0) / magnitudes.length;

  const variance =
    magnitudes.reduce((sum, current) => sum + (current - meanMagnitude) ** 2, 0) / magnitudes.length;

  const sampleRateHz = 1000 / intervalMs;
  const dominantFrequencyHz = estimateDominantFrequency(magnitudes, sampleRateHz);

  return {
    variance,
    meanMagnitude,
    dominantFrequencyHz,
    sampleCount: samples.length,
  };
}

async function collectMotionWindow(durationMs = 2500, intervalMs = 100) {
  Accelerometer.setUpdateInterval(intervalMs);

  return new Promise((resolve) => {
    const samples = [];
    const subscription = Accelerometer.addListener((reading) => {
      samples.push(reading);
    });

    setTimeout(() => {
      subscription.remove();
      resolve(computeMotionFeatures(samples, intervalMs));
    }, durationMs);
  });
}

function classifyMotion({ variance, dominantFrequencyHz, speedMps }) {
  if (variance === null || variance === undefined) return 'UNKNOWN';

  const inEngineBand =
    dominantFrequencyHz >= ENGINE_FREQ_RANGE.min && dominantFrequencyHz <= ENGINE_FREQ_RANGE.max;

  if (variance < 0.015 && (speedMps || 0) < 1.2) return 'STATIONARY';
  if (inEngineBand && variance >= 0.02) return 'RIDING';
  if (variance >= 0.015) return 'MOVING';

  return 'UNKNOWN';
}

async function collectGpsLayer() {
  const foregroundPermission = await Location.getForegroundPermissionsAsync();
  let permissionStatus = foregroundPermission.status;

  if (permissionStatus !== 'granted') {
    const requestedPermission = await Location.requestForegroundPermissionsAsync();
    permissionStatus = requestedPermission.status;
  }

  if (permissionStatus !== 'granted') {
    return {
      permissionGranted: false,
      location: null,
      providerStatus: null,
      error: 'Location permission denied',
    };
  }

  const providerStatus = await Location.getProviderStatusAsync().catch(() => null);
  const currentPosition = await Location.getCurrentPositionAsync({
    accuracy: Location.Accuracy.BestForNavigation,
    mayShowUserSettingsDialog: true,
  }).catch((error) => ({ error: error?.message || 'Unable to fetch location' }));

  if (currentPosition?.error) {
    return {
      permissionGranted: true,
      location: null,
      providerStatus,
      error: currentPosition.error,
    };
  }

  const isMocked = Boolean(currentPosition.mocked ?? currentPosition.coords?.mocked);

  return {
    permissionGranted: true,
    location: {
      lat: currentPosition.coords.latitude,
      lng: currentPosition.coords.longitude,
      accuracyM: currentPosition.coords.accuracy,
      speedMps: currentPosition.coords.speed,
      bearing: currentPosition.coords.heading,
      altitude: currentPosition.coords.altitude,
      mocked: isMocked,
    },
    providerStatus,
    error: null,
  };
}

async function collectRadioLayer() {
  const networkState = await Network.getNetworkStateAsync().catch(() => null);
  const ipAddress = await Network.getIpAddressAsync().catch(() => null);

  return {
    networkType: networkState?.type || 'UNKNOWN',
    isConnected: Boolean(networkState?.isConnected),
    isInternetReachable: Boolean(networkState?.isInternetReachable),
    ipAddress,
    wifiScanAvailable: false,
    bluetoothScanAvailable: false,
    cellTowerScanAvailable: false,
    limitations:
      'Expo managed workflow does not expose Wi-Fi BSSID/Bluetooth nearby scan/cell tower IDs without native modules.',
  };
}

async function collectDeviceLayer() {
  return {
    platform: Platform.OS,
    isPhysicalDevice: Device.isDevice,
    isEmulator: !Device.isDevice,
    modelName: Device.modelName,
    osName: Device.osName,
    osVersion: Device.osVersion,
    appVersion: Application.nativeApplicationVersion || Application.applicationVersion,
    buildVersion: Application.nativeBuildVersion,
    packageName: Application.applicationId,
    likelyRooted: false,
    debugBuild: __DEV__,
  };
}

function evaluateGpsIntegrity(gpsLayer) {
  let score = 0;
  const signals = [];

  if (!gpsLayer.permissionGranted) {
    score += 0.45;
    signals.push('Location permission denied');
  }

  if (gpsLayer.error) {
    score += 0.35;
    signals.push('Location fetch failed');
  }

  if (gpsLayer.location?.mocked) {
    score = 1;
    signals.push('Mock GPS flag is true');
  }

  const accuracy = gpsLayer.location?.accuracyM;
  if (accuracy !== null && accuracy !== undefined) {
    if (accuracy > 120) {
      score += 0.35;
      signals.push('Very poor GPS accuracy');
    } else if (accuracy > 60) {
      score += 0.2;
      signals.push('Low GPS accuracy');
    }
  }

  const speedMps = gpsLayer.location?.speedMps;
  if (speedMps !== null && speedMps !== undefined && speedMps > 45) {
    score += 0.3;
    signals.push('Implausible speed detected');
  }

  const normalizedScore = clamp(score);

  return {
    id: 'gpsIntegrity',
    title: 'Layer 1 • GPS Integrity',
    description: 'Checks mock-location flags, permission trust, and GPS realism.',
    score: normalizedScore,
    scorePct: scoreToPercent(normalizedScore),
    status: classifyRiskStatus(normalizedScore),
    signals,
  };
}

function evaluateRadioEnvironment(radioLayer, previousSnapshots = []) {
  let score = 0;
  const signals = [];

  if (!radioLayer.isConnected) {
    score += 0.25;
    signals.push('Device not connected to network');
  }

  if (!radioLayer.isInternetReachable) {
    score += 0.2;
    signals.push('Internet not reachable');
  }

  const currentSignature = `${radioLayer.networkType}:${radioLayer.ipAddress || 'na'}`;
  const recentSignatures = previousSnapshots
    .slice(-5)
    .map((snapshot) => snapshot?.layers?.radio?.signature)
    .filter(Boolean);

  if (recentSignatures.length >= 2 && recentSignatures.every((signature) => signature === currentSignature)) {
    score += 0.15;
    signals.push('Radio signature unchanged for recent samples');
  }

  if (!radioLayer.wifiScanAvailable || !radioLayer.bluetoothScanAvailable || !radioLayer.cellTowerScanAvailable) {
    signals.push('Advanced radio fingerprints limited in Expo managed mode');
  }

  const normalizedScore = clamp(score);

  return {
    id: 'radioEnvironment',
    title: 'Layer 2 • Radio Environment',
    description: 'Uses available network signature continuity and connectivity checks.',
    score: normalizedScore,
    scorePct: scoreToPercent(normalizedScore),
    status: classifyRiskStatus(normalizedScore),
    signals,
    confidence: 'medium',
  };
}

function evaluateMotionPattern(motionLayer, gpsLayer) {
  let score = 0;
  const signals = [];

  const variance = motionLayer?.variance;
  const dominantFrequencyHz = motionLayer?.dominantFrequencyHz;
  const speedMps = gpsLayer?.location?.speedMps || 0;

  if (variance === null || variance === undefined) {
    score += 0.4;
    signals.push('Motion data unavailable');
  } else {
    if (variance < 0.012) {
      score += 0.5;
      signals.push('Phone appears stationary');
    } else if (variance < 0.02) {
      score += 0.25;
      signals.push('Low vibration movement');
    }

    const inEngineBand =
      dominantFrequencyHz >= ENGINE_FREQ_RANGE.min && dominantFrequencyHz <= ENGINE_FREQ_RANGE.max;

    if (inEngineBand) {
      score -= 0.15;
      signals.push('Engine-like vibration band detected');
    } else {
      score += 0.1;
      signals.push('Engine vibration signature missing');
    }
  }

  if (speedMps > 6 && (variance || 0) < 0.012) {
    score += 0.2;
    signals.push('GPS speed and motion vibration mismatch');
  }

  const normalizedScore = clamp(score);

  return {
    id: 'motionPattern',
    title: 'Layer 3 • Motion Pattern',
    description: 'Checks accelerometer variance and frequency consistency with riding.',
    score: normalizedScore,
    scorePct: scoreToPercent(normalizedScore),
    status: classifyRiskStatus(normalizedScore),
    signals,
  };
}

function evaluateDeviceIntegrity(deviceLayer) {
  let score = 0;
  const signals = [];

  if (deviceLayer.isEmulator) {
    score = 1;
    signals.push('Emulator detected');
  }

  if (deviceLayer.debugBuild) {
    score += 0.25;
    signals.push('Debug build detected');
  }

  if (deviceLayer.likelyRooted) {
    score += 0.6;
    signals.push('Likely rooted/jailbroken signal');
  }

  const normalizedScore = clamp(score);

  return {
    id: 'deviceIntegrity',
    title: 'Layer 4 • Device Integrity',
    description: 'Checks emulator/debug context and device trust posture.',
    score: normalizedScore,
    scorePct: scoreToPercent(normalizedScore),
    status: classifyRiskStatus(normalizedScore),
    signals,
  };
}

function combineLayerScores(layerScores) {
  const combinedScore = clamp(
    layerScores.gpsIntegrity.score * SCORE_WEIGHTS.gpsIntegrity +
      layerScores.radioEnvironment.score * SCORE_WEIGHTS.radioEnvironment +
      layerScores.motionPattern.score * SCORE_WEIGHTS.motionPattern +
      layerScores.deviceIntegrity.score * SCORE_WEIGHTS.deviceIntegrity
  );

  const fraudScore = scoreToPercent(combinedScore);
  let recommendation = 'APPROVE';

  if (fraudScore >= 65) recommendation = 'REJECT';
  else if (fraudScore >= 40) recommendation = 'MANUAL_REVIEW';

  if (layerScores.gpsIntegrity.score >= 1 || layerScores.deviceIntegrity.score >= 1) {
    recommendation = 'REJECT';
  }

  const confidence =
    layerScores.radioEnvironment.confidence === 'medium' ? 'MEDIUM' : 'HIGH';

  return {
    fraudScore,
    trustScore: 100 - fraudScore,
    recommendation,
    confidence,
  };
}

function buildSnapshot({ riderId, gpsLayer, radioLayer, motionLayer, deviceLayer }) {
  const motionClassification = classifyMotion({
    variance: motionLayer.variance,
    dominantFrequencyHz: motionLayer.dominantFrequencyHz,
    speedMps: gpsLayer?.location?.speedMps,
  });

  const timestamp = new Date().toISOString();

  return {
    riderId,
    collectedAt: timestamp,
    layers: {
      gps: {
        ...gpsLayer.location,
        permissionGranted: gpsLayer.permissionGranted,
        providerStatus: gpsLayer.providerStatus,
        error: gpsLayer.error,
      },
      radio: {
        ...radioLayer,
        signature: `${radioLayer.networkType}:${radioLayer.ipAddress || 'na'}`,
      },
      motion: {
        variance: motionLayer.variance,
        meanMagnitude: motionLayer.meanMagnitude,
        dominantFrequencyHz: motionLayer.dominantFrequencyHz,
        sampleCount: motionLayer.sampleCount,
        classification: motionClassification,
      },
      device: {
        ...deviceLayer,
      },
    },
  };
}

function buildAssessment(layerScores, snapshot) {
  const combined = combineLayerScores(layerScores);

  return {
    ...combined,
    checkedAt: snapshot.collectedAt,
    location: {
      latitude: snapshot.layers.gps?.lat,
      longitude: snapshot.layers.gps?.lng,
      accuracyM: snapshot.layers.gps?.accuracyM,
    },
    motion: snapshot.layers.motion,
    layers: layerScores,
  };
}

export async function queueSnapshotForSync(snapshot) {
  const queueRaw = await AsyncStorage.getItem(SNAPSHOT_QUEUE_KEY);
  const queue = queueRaw ? JSON.parse(queueRaw) : [];
  const nextQueue = [...queue, snapshot].slice(-MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(SNAPSHOT_QUEUE_KEY, JSON.stringify(nextQueue));
  return nextQueue.length;
}

function buildServerPayload(snapshot) {
  return {
    rider_id: snapshot.riderId,
    collected_at: snapshot.collectedAt,
    gps_lat: snapshot.layers.gps?.lat,
    gps_lng: snapshot.layers.gps?.lng,
    gps_accuracy_m: snapshot.layers.gps?.accuracyM,
    is_mock_location: Boolean(snapshot.layers.gps?.mocked),
    gps_speed_mps: snapshot.layers.gps?.speedMps,
    gps_bearing: snapshot.layers.gps?.bearing,
    wifi_networks: [],
    bluetooth_devices: [],
    cell_tower_id: null,
    cell_lac: null,
    cell_signal_strength: null,
    cell_network_type: snapshot.layers.radio?.networkType,
    accel_variance: snapshot.layers.motion?.variance,
    accel_mean: snapshot.layers.motion?.meanMagnitude,
    accel_dominant_freq_hz: snapshot.layers.motion?.dominantFrequencyHz,
    motion_classification: snapshot.layers.motion?.classification,
    is_rooted_device: Boolean(snapshot.layers.device?.likelyRooted),
    is_emulator: Boolean(snapshot.layers.device?.isEmulator),
    device_fingerprint: `${snapshot.layers.device?.modelName || 'unknown'}:${snapshot.layers.device?.osVersion || 'na'}`,
  };
}

async function postSnapshot(snapshot, authToken) {
  if (!BACKEND_BASE_URL) {
    return { ok: false, skipped: true, reason: 'Missing EXPO_PUBLIC_ML_API_URL' };
  }

  const payload = buildServerPayload(snapshot);
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const response = await fetch(`${BACKEND_BASE_URL}/attestation/snapshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    if (!response.ok) {
      return { ok: false, status: response.status };
    }

    return { ok: true };
  } catch (error) {
    clearTimeout(timeoutId);
    return { ok: false, error: error?.message || 'Network request failed' };
  }
}

export async function flushSnapshotQueue(authToken) {
  const queueRaw = await AsyncStorage.getItem(SNAPSHOT_QUEUE_KEY);
  const queue = queueRaw ? JSON.parse(queueRaw) : [];

  if (!queue.length) {
    return { pushed: 0, pending: 0, skipped: !BACKEND_BASE_URL };
  }

  const pendingQueue = [];
  let pushed = 0;

  for (const snapshot of queue) {
    const result = await postSnapshot(snapshot, authToken);
    if (result.ok) pushed += 1;
    else pendingQueue.push(snapshot);
  }

  await AsyncStorage.setItem(SNAPSHOT_QUEUE_KEY, JSON.stringify(pendingQueue));

  return {
    pushed,
    pending: pendingQueue.length,
    skipped: !BACKEND_BASE_URL,
  };
}

export async function runPresenceLayerCheck({ riderId, previousSnapshots = [], authToken } = {}) {
  const [gpsLayer, radioLayer, motionLayer, deviceLayer] = await Promise.all([
    collectGpsLayer(),
    collectRadioLayer(),
    collectMotionWindow(),
    collectDeviceLayer(),
  ]);

  const snapshot = buildSnapshot({ riderId, gpsLayer, radioLayer, motionLayer, deviceLayer });

  const layerScores = {
    gpsIntegrity: evaluateGpsIntegrity(gpsLayer),
    radioEnvironment: evaluateRadioEnvironment(radioLayer, previousSnapshots),
    motionPattern: evaluateMotionPattern(motionLayer, gpsLayer),
    deviceIntegrity: evaluateDeviceIntegrity(deviceLayer),
  };

  const assessment = buildAssessment(layerScores, snapshot);

  await queueSnapshotForSync(snapshot);
  const syncResult = await flushSnapshotQueue(authToken);

  return {
    snapshot,
    assessment,
    syncResult,
  };
}
