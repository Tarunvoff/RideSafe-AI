import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  Dimensions,
  ScrollView,
  Modal,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import * as FileSystem from 'expo-file-system/legacy';
import { Asset } from 'expo-asset';
import { useAuth } from '../../context/AuthContext';
import { Theme } from '../../theme';
import Button from '../../components/Button';

const { width } = Dimensions.get('window');

export default function TermsAndConditionsScreen() {
  const { t } = useTranslation();
  const { acceptTerms } = useAuth();
  const [isTicked, setIsTicked] = useState(false);
  const [showPdfModal, setShowPdfModal] = useState(false);
  const [pdfBase64, setPdfBase64] = useState<string | null>(null);
  const [isPdfLoading, setIsPdfLoading] = useState(false);

  const handleAccept = async () => {
    if (isTicked) {
      await acceptTerms();
    }
  };

  const handleViewPdf = async () => {
    setIsPdfLoading(true);
    setShowPdfModal(true);
    try {
      // Resolve the local asset
      const asset = Asset.fromModule(require('../../../assets/policyDocument/Policy.pdf'));
      await asset.downloadAsync();
      
      // Read as base64
      const base64 = await FileSystem.readAsStringAsync(asset.localUri || asset.uri, {
        encoding: 'base64',
      });
      setPdfBase64(base64); // Store raw base64, we'll wrap it in HTML for Android
    } catch (error) {
      console.error('Error opening PDF:', error);
    } finally {
      setIsPdfLoading(false);
    }
  };

  const getPdfSource = () => {
    if (!pdfBase64) return undefined;
    
    // On iOS, native PDF rendering is excellent
    if (Platform.OS === 'ios') {
      return { uri: `data:application/pdf;base64,${pdfBase64}` };
    }

    // On Android (especially Expo Go), we use PDF.js for a perfect high-fidelity preview
    const pdfJsHtml = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0">
        <script src="https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.min.js"></script>
        <style>
          body { margin: 0; padding: 10px; background-color: #f1f5f9; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; }
          #pdf-container { width: 100%; display: flex; flex-direction: column; align-items: center; gap: 15px; }
          canvas { width: 100% !important; height: auto !important; box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1); border-radius: 8px; background: white; }
          .page-info { font-size: 12px; color: #64748b; margin-top: 5px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div id="pdf-container"></div>
        <script>
          const pdfData = atob('${pdfBase64}');
          const pdfjsLib = window['pdfjs-dist/build/pdf'];
          pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.4.120/pdf.worker.min.js';

          const loadingTask = pdfjsLib.getDocument({data: pdfData});
          loadingTask.promise.then(function(pdf) {
            const container = document.getElementById('pdf-container');
            
            async function renderPages() {
              for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
                const page = await pdf.getPage(pageNum);
                const viewport = page.getViewport({scale: 2.0}); // High resolution
                const canvas = document.createElement('canvas');
                const context = canvas.getContext('2d');
                canvas.height = viewport.height;
                canvas.width = viewport.width;
                
                const renderContext = {
                  canvasContext: context,
                  viewport: viewport
                };
                
                container.appendChild(canvas);
                const info = document.createElement('div');
                info.className = 'page-info';
                info.innerText = '${t('auth.terms.page_x_of_y', { current: "'+pageNum+'", total: "'+pdf.numPages+'" })}';
                container.appendChild(info);
                
                await page.render(renderContext).promise;
              }
            }
            renderPages();
          }).catch(err => {
            document.body.innerHTML = '<h3>${t('auth.terms.render_error', { message: "'+err.message+'" })}</h3>';
          });
        </script>
      </body>
      </html>
    `;
    return { html: pdfJsHtml };
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        {/* Header Section */}
        <View style={styles.header}>
          <View style={styles.iconCircle}>
            <Ionicons name="shield-checkmark" size={32} color={Theme.colors.primary} />
          </View>
          <Text style={styles.title}>{t('auth.terms.title')}</Text>
          <Text style={styles.subtitle}>
            {t('auth.terms.subtitle')}
          </Text>
        </View>

        {/* Scrollable Terms Content */}
        <View style={styles.termsBox}>
          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={true}
          >
            <Text style={styles.sectionTitle}>{t('auth.terms.sections.telemetry_title')}</Text>
            <Text style={styles.bodyText}>
              {t('auth.terms.sections.telemetry_body')}
            </Text>

            <Text style={styles.sectionTitle}>{t('auth.terms.sections.hazard_title')}</Text>
            <Text style={styles.bodyText}>
              {t('auth.terms.sections.hazard_body')}
            </Text>

            <Text style={styles.sectionTitle}>{t('auth.terms.sections.payout_title')}</Text>
            <Text style={styles.bodyText}>
              {t('auth.terms.sections.payout_body')}
            </Text>

            <Text style={styles.sectionTitle}>{t('auth.terms.sections.privacy_title')}</Text>
            <Text style={styles.bodyText}>
              {t('auth.terms.sections.privacy_body')}
            </Text>
            
            <View style={styles.fullPolicyLinkContainer}>
              <TouchableOpacity style={styles.fullPolicyBtn} onPress={handleViewPdf}>
                <Ionicons name="document-text-outline" size={18} color={Theme.colors.primary} />
                <Text style={styles.fullPolicyBtnText}>{t('auth.terms.view_pdf')}</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        </View>

        {/* Acceptance Section */}
        <View style={styles.footer}>
          <TouchableOpacity 
            style={styles.checkboxContainer} 
            activeOpacity={0.8}
            onPress={() => setIsTicked(!isTicked)}
          >
            <View style={[styles.checkbox, isTicked && styles.checkboxActive]}>
              {isTicked && <Ionicons name="checkmark" size={16} color="#fff" />}
            </View>
            <Text style={styles.checkboxLabel}>
              {t('auth.terms.checkbox')}
            </Text>
          </TouchableOpacity>

          <Button
            title={t('auth.terms.button_accept')}
            onPress={handleAccept}
            disabled={!isTicked}
            style={[styles.continueBtn, !isTicked && styles.continueBtnDisabled]}
          />
        </View>
      </View>

      {/* PDF HIGH-PERFORMANCE PREVIEW MODAL */}
      <Modal
        visible={showPdfModal}
        animationType="slide"
        presentationStyle="fullScreen"
        onRequestClose={() => setShowPdfModal(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>{t('auth.terms.pdf_preview')}</Text>
              <Text style={styles.modalSubtitle}>{t('auth.terms.full_document')}</Text>
            </View>
            <TouchableOpacity 
              onPress={() => setShowPdfModal(false)}
              style={styles.closeBtn}
            >
              <Ionicons name="close-circle" size={32} color={Theme.colors.textSecondary} />
            </TouchableOpacity>
          </View>

          <View style={styles.webViewContainer}>
            {isPdfLoading ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color={Theme.colors.primary} />
                <Text style={styles.loadingText}>{t('auth.terms.loading_viewer')}</Text>
              </View>
            ) : pdfBase64 ? (
              <WebView
                originWhitelist={['*']}
                source={getPdfSource()}
                style={styles.webView}
                scalesPageToFit={true}
                javaScriptEnabled={true}
                domStorageEnabled={true}
              />
            ) : (
              <View style={styles.loadingContainer}>
                <Ionicons name="alert-circle-outline" size={48} color={Theme.colors.error} />
                <Text style={styles.loadingText}>{t('auth.terms.load_failed')}</Text>
              </View>
            )}
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  container: {
    flex: 1,
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 24,
  },
  header: {
    alignItems: 'center',
    marginBottom: 24,
  },
  iconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: `${Theme.colors.primary}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  title: {
    ...Theme.typography.h2,
    textAlign: 'center',
    color: Theme.colors.text,
  },
  subtitle: {
    ...Theme.typography.body,
    textAlign: 'center',
    color: Theme.colors.textSecondary,
    marginTop: 8,
    lineHeight: 20,
  },
  termsBox: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Theme.colors.border,
    padding: 2,
    overflow: 'hidden',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  sectionTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
    fontSize: 14,
    marginTop: 16,
    marginBottom: 8,
  },
  bodyText: {
    ...Theme.typography.body,
    color: Theme.colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
  },
  fullPolicyLinkContainer: {
    marginTop: 24,
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 16,
  },
  fullPolicyBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  fullPolicyBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Theme.colors.primary,
  },
  footer: {
    marginTop: 24,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 20,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: Theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  checkboxActive: {
    backgroundColor: Theme.colors.primary,
  },
  checkboxLabel: {
    flex: 1,
    fontSize: 12,
    color: Theme.colors.text,
    lineHeight: 18,
    fontWeight: '500',
  },
  continueBtn: {
    width: '100%',
    height: 56,
  },
  continueBtnDisabled: {
    opacity: 0.5,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Theme.colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Theme.colors.border,
  },
  modalTitle: {
    ...Theme.typography.h3,
    color: Theme.colors.text,
  },
  modalSubtitle: {
    ...Theme.typography.caption,
    color: Theme.colors.textSecondary,
    fontSize: 10,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  closeBtn: {
    padding: 4,
  },
  webViewContainer: {
    flex: 1,
    backgroundColor: '#fff',
  },
  webView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  loadingText: {
    ...Theme.typography.body,
    marginTop: 16,
    color: Theme.colors.textSecondary,
    textAlign: 'center',
  },
});
