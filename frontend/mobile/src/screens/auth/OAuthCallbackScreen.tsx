import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';

const PENDING_OAUTH_KEY = 'pendingOAuth';

export default function OAuthCallbackScreen() {
  const { t } = useTranslation();
  const { loginWithOAuth } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const inFlight = useRef(false);

  useEffect(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined' || inFlight.current) {
      return;
    }

    inFlight.current = true;

    const completeOAuthCallback = async () => {
      try {
        const params = new URLSearchParams(window.location.search);
        const oauthError = params.get('error');
        const errorDescription = params.get('error_description');
        const code = params.get('code');
        const sessionId = params.get('sessionId');
        const state = params.get('state') ?? undefined;
        const providerFromQuery = (params.get('provider') || '').trim().toUpperCase();

        if (oauthError) {
          throw new Error(errorDescription || t('auth.errors.oauth_provider_rejected'));
        }

        if (!code || !sessionId) {
          throw new Error(t('auth.errors.oauth_exchange_failed'));
        }

        const callbackKey = `${sessionId}:${code}`;
        const processedKey = await AsyncStorage.getItem('lastProcessedOAuthCallback');
        if (processedKey === callbackKey) {
          window.history.replaceState({}, document.title, '/');
          return;
        }

        const pendingRaw = await AsyncStorage.getItem(PENDING_OAUTH_KEY);
        const pending = pendingRaw ? JSON.parse(pendingRaw) : null;
        const provider = providerFromQuery || String(pending?.provider || '').trim().toUpperCase();
        const redirectUri = String(
          pending?.redirectUri || `${window.location.origin}/oauth-callback`
        ).trim();

        if (!provider) {
          throw new Error(t('auth.errors.oauth_exchange_failed'));
        }

        await loginWithOAuth(provider, { code, sessionId, state, redirectUri });

        await AsyncStorage.multiRemove([PENDING_OAUTH_KEY]);
        await AsyncStorage.setItem('lastProcessedOAuthCallback', callbackKey);
        window.history.replaceState({}, document.title, '/');
      } catch (e: any) {
        await AsyncStorage.multiRemove([PENDING_OAUTH_KEY]);
        setError(e?.message || t('common.oauth_failed'));
      }
    };

    void completeOAuthCallback();
  }, [loginWithOAuth, t]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color={Theme.colors.primary} />
      <Text style={styles.title}>{t('auth.otp.loading_connecting', { provider: '' }).trim() || 'Connecting...'}</Text>
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Theme.colors.background,
    paddingHorizontal: 24,
  },
  title: {
    marginTop: 14,
    fontSize: 18,
    fontWeight: '600',
    color: Theme.colors.text,
  },
  error: {
    marginTop: 12,
    fontSize: 14,
    color: Theme.colors.error,
    textAlign: 'center',
  },
});
