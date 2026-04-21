import AsyncStorage from '@react-native-async-storage/async-storage';

const LIVE_RISK_DEBUG_KEY = 'debug:liveRisk';
const MAX_LINES = 200;

function nowIso() {
  return new Date().toISOString();
}

export async function appendLiveRiskDebugLog(event: string, payload?: unknown): Promise<void> {
  try {
    const line = payload == null
      ? `[${nowIso()}] ${event}`
      : `[${nowIso()}] ${event} :: ${JSON.stringify(payload)}`;

    const existing = await AsyncStorage.getItem(LIVE_RISK_DEBUG_KEY);
    const lines = existing ? existing.split('\n').filter(Boolean) : [];
    lines.push(line);
    await AsyncStorage.setItem(LIVE_RISK_DEBUG_KEY, lines.slice(-MAX_LINES).join('\n'));
    console.log('[LIVE-RISK-DEBUG]', line);
  } catch (err) {
    console.warn('[LIVE-RISK-DEBUG] persist failed', err);
  }
}

export async function readLiveRiskDebugLog(): Promise<string> {
  try {
    return (await AsyncStorage.getItem(LIVE_RISK_DEBUG_KEY)) ?? '';
  } catch {
    return '';
  }
}

export async function clearLiveRiskDebugLog(): Promise<void> {
  try {
    await AsyncStorage.removeItem(LIVE_RISK_DEBUG_KEY);
  } catch {
    // no-op
  }
}
