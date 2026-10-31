/**
 * @file LoginScreen.js
 * @description Haute Cuisine Authentication Portal with Luxury Patterns,
 * Ambient Golden Accents, Tactile High-Definition Keypad, and
 * Android Dynamic Server Discovery & Network Config.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  Platform,
  Modal,
  TextInput,
} from 'react-native';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/client';
import Keypad from '../components/Keypad';
import { LuxuryPatternBackground, GoldDivider, MichelinStars } from '../components/LuxuryPattern';
import {
  getResolvedHost,
  setCustomServerHost,
  resetServerHost,
  normalizeServerBaseUrl,
} from '../config/serverConfig';
import colors from '../theme/colors';

const LoginScreen = () => {
  const { login, isLoading: authLoading, authError, setAuthError } = useAuth();

  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [selectedStaff, setSelectedStaff] = useState(null);
  const [pin, setPin] = useState('');
  const [localError, setLocalError] = useState('');

  // Server Connection Configuration
  const [serverHost, setServerHost] = useState('');
  const [serverModalVisible, setServerModalVisible] = useState(false);
  const [inputHost, setInputHost] = useState('');
  const [testingConnection, setTestingConnection] = useState(false);
  const [testResult, setTestResult] = useState(null);

  useEffect(() => {
    initServerConfig();
    fetchStaffList();
  }, []);

  const initServerConfig = async () => {
    const host = await getResolvedHost();
    setServerHost(host);
    setInputHost(host);
  };

  const fetchStaffList = async () => {
    setLoadingStaff(true);
    setLocalError('');
    try {
      const res = await apiClient.get('/auth/staff-list');
      if (res.data.success) {
        setStaffList(res.data.data);
      }
    } catch (err) {
      setLocalError('Unable to connect to POS Server. Ensure server is online and host IP is correct.');
    } finally {
      setLoadingStaff(false);
    }
  };

  const handleTestConnection = async () => {
    setTestingConnection(true);
    setTestResult(null);
    try {
      const targetHost = (inputHost || '').trim();
      const testUrl = `${normalizeServerBaseUrl(targetHost)}/api/health`;
      const res = await fetch(testUrl, { method: 'GET' });
      const data = await res.json();
      if (data.status === 'healthy') {
        setTestResult({ success: true, message: `Connected! Uptime: ${Math.round(data.uptimeSeconds)}s` });
      } else {
        setTestResult({ success: false, message: 'Server reached, but returned unexpected response.' });
      }
    } catch (e) {
      setTestResult({ success: false, message: `Connection failed: ${e.message || 'Cannot reach server'}` });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveServerHost = async () => {
    const saved = await setCustomServerHost(inputHost);
    setServerHost(saved);
    setServerModalVisible(false);
    fetchStaffList();
  };

  const handleResetServerHost = async () => {
    const auto = await resetServerHost();
    setInputHost(auto);
    setServerHost(auto);
    setTestResult(null);
  };

  const handleSelectStaff = (staff) => {
    setSelectedStaff(staff);
    setPin('');
    setLocalError('');
    setAuthError(null);
  };

  const submitLogin = useCallback(
    async (candidatePin) => {
      if (!selectedStaff || authLoading) return;
      const targetPin = candidatePin || pin;
      if (targetPin.length !== 4) {
        setLocalError('PIN must be exactly 4 digits.');
        return;
      }

      const result = await login(selectedStaff._id, targetPin);
      if (!result.success) {
        setPin('');
        setLocalError(result.error || 'Authentication failed. Please verify credentials.');
      }
    },
    [selectedStaff, pin, authLoading, login]
  );

  const handleKeyPress = (num) => {
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);

      if (newPin.length === 4) {
        submitLogin(newPin);
      }
    }
  };

  const handleDelete = () => {
    setPin((prev) => prev.slice(0, -1));
    setLocalError('');
    setAuthError(null);
  };

  const handleClear = () => {
    setPin('');
    setLocalError('');
    setAuthError(null);
  };

  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const handleKeyDown = (e) => {
        if (!selectedStaff) return;
        if (/^[0-9]$/.test(e.key)) {
          handleKeyPress(e.key);
        } else if (e.key === 'Backspace') {
          handleDelete();
        } else if (e.key === 'Escape') {
          handleClear();
        } else if (e.key === 'Enter' && pin.length === 4) {
          submitLogin(pin);
        }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [selectedStaff, pin, submitLogin]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <LuxuryPatternBackground>
        <ScrollView
          style={styles.mainScrollView}
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.container}>
            {/* Opulent Brand Crest */}
            <View style={styles.brandHeader}>
              <View style={styles.crestBadge}>
                <Text style={styles.crestEmoji}>👑</Text>
              </View>
              <Text style={styles.brandTitle}>SPICY ZAIKA</Text>
              <MichelinStars />
              <Text style={styles.brandSubtitle}>Haute Gastronomie • POS & KDS Terminal</Text>
              <View style={styles.ornamentLine} />

              {/* Server Connection Status Pill */}
              <TouchableOpacity
                style={styles.serverStatusPill}
                onPress={() => setServerModalVisible(true)}
                activeOpacity={0.75}
              >
                <View style={styles.serverPulseDot} />
                <Text style={styles.serverStatusText} numberOfLines={1}>
                  Host: {serverHost || 'Detecting...'}:5000 ⚙️
                </Text>
              </TouchableOpacity>
            </View>

            {!selectedStaff ? (
              // STEP 1: Select Staff Identity
              <View style={styles.stepContainer}>
                <View style={styles.stepTitleBox}>
                  <Text style={styles.stepTitle}>Staff Identity Selection</Text>
                  <Text style={styles.stepSubtitle}>Tap your credentials to enter the service terminal</Text>
                </View>

                {loadingStaff ? (
                  <View style={styles.loaderCenter}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.loaderText}>Connecting to secure vault...</Text>
                  </View>
                ) : localError ? (
                  <View style={styles.errorBox}>
                    <Text style={styles.errorText}>{localError}</Text>
                    <View style={styles.errorActionsRow}>
                      <TouchableOpacity style={styles.retryBtn} onPress={fetchStaffList}>
                        <Text style={styles.retryBtnText}>↻ Retry Connection</Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.configServerBtn}
                        onPress={() => setServerModalVisible(true)}
                      >
                        <Text style={styles.configServerBtnText}>⚙️ Server Setup</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ) : (
                  <View style={styles.staffGrid}>
                    {staffList.map((staff) => (
                      <TouchableOpacity
                        key={staff._id}
                        style={styles.staffCard}
                        onPress={() => handleSelectStaff(staff)}
                        activeOpacity={0.75}
                      >
                        <View style={styles.goldLeftBorder} />
                        <View style={styles.staffAvatar}>
                          <Text style={styles.avatarText}>
                            {staff.name.charAt(0).toUpperCase()}
                          </Text>
                        </View>
                        <View style={styles.staffInfo}>
                          <Text style={styles.staffName} numberOfLines={1}>{staff.name}</Text>
                          <View
                            style={[
                              styles.roleBadge,
                              staff.role === 'Admin' && styles.roleAdmin,
                              staff.role === 'Cook' && styles.roleCook,
                              staff.role === 'Waiter' && styles.roleWaiter,
                              staff.role === 'Cleaner' && styles.roleCleaner,
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,
                                staff.role === 'Admin' && styles.roleAdminText,
                                staff.role === 'Cook' && styles.roleCookText,
                                staff.role === 'Waiter' && styles.roleWaiterText,
                                staff.role === 'Cleaner' && styles.roleCleanerText,
                              ]}
                            >
                              {staff.role}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.chevronBox}>
                          <Text style={styles.arrowIcon}>→</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            ) : (
              // STEP 2: Enter 4-digit PIN on Keypad
              <View style={styles.stepContainer}>
                <TouchableOpacity
                  style={styles.backButton}
                  onPress={() => {
                    setSelectedStaff(null);
                    setPin('');
                    setLocalError('');
                  }}
                >
                  <Text style={styles.backButtonText}>← Switch Personnel</Text>
                </TouchableOpacity>

                {/* Active Profile Luxury Card */}
                <View style={styles.activeProfileCard}>
                  <View style={styles.activeProfileAvatar}>
                    <Text style={styles.activeAvatarText}>
                      {selectedStaff.name.charAt(0).toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.profileGreeting}>AUTHENTICATING</Text>
                  <Text style={styles.profileName} numberOfLines={1}>{selectedStaff.name}</Text>
                  <View style={styles.activeRolePill}>
                    <Text style={styles.activeRolePillText}>✦ {selectedStaff.role} CLEARANCE ✦</Text>
                  </View>

                  <GoldDivider label="ENTER 4-DIGIT PIN" />

                  {/* PIN Dots Display */}
                  <View style={styles.pinDotsContainer}>
                    {[0, 1, 2, 3].map((index) => {
                      const filled = pin.length > index;
                      return (
                        <View
                          key={`dot-${index}`}
                          style={[styles.pinDot, filled && styles.pinDotFilled]}
                        />
                      );
                    })}
                  </View>
                </View>

                {/* Error alerts */}
                {(localError || authError) && (
                  <View style={styles.pinErrorBox}>
                    <Text style={styles.pinErrorText}>{localError || authError}</Text>
                  </View>
                )}

                {authLoading ? (
                  <View style={styles.authenticatingBox}>
                    <ActivityIndicator size="small" color={colors.primary} />
                    <Text style={styles.authenticatingText}>Verifying security credentials...</Text>
                  </View>
                ) : null}

                {/* Keypad */}
                <Keypad
                  onKeyPress={handleKeyPress}
                  onDelete={handleDelete}
                  onClear={handleClear}
                  disabled={authLoading}
                />

                {/* Manual Submit Button */}
                {pin.length === 4 && !authLoading && (
                  <TouchableOpacity
                    style={styles.manualSubmitBtn}
                    onPress={() => submitLogin(pin)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.manualSubmitText}>Unlock Terminal →</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        </ScrollView>

        {/* MODAL: ANDROID SERVER CONNECTION SETTINGS */}
        <Modal visible={serverModalVisible} transparent animationType="slide">
          <View style={styles.modalOverlay}>
            <View style={styles.modalCard}>
              <View style={styles.modalHeaderRow}>
                <Text style={styles.modalTitle}>📡 Server Network Setup</Text>
                <TouchableOpacity onPress={() => setServerModalVisible(false)}>
                  <Text style={styles.modalCloseText}>✕</Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.modalSubtitle}>
                Configure POS backend server IP for Android tablets, mobile terminals, and POS hardware.
              </Text>
              <GoldDivider />

              <Text style={styles.inputLabel}>Server Host IP / Domain:</Text>
              <TextInput
                style={styles.hostInput}
                placeholder="e.g. 10.18.123.121 or 192.168.1.100"
                placeholderTextColor={colors.textMuted}
                value={inputHost}
                onChangeText={setInputHost}
                autoCapitalize="none"
                autoCorrect={false}
              />

              {/* Test Connection Button */}
              <TouchableOpacity
                style={styles.testBtn}
                onPress={handleTestConnection}
                disabled={testingConnection}
              >
                {testingConnection ? (
                  <ActivityIndicator size="small" color={colors.primaryDark} />
                ) : (
                  <Text style={styles.testBtnText}>⚡ Ping Server Connection</Text>
                )}
              </TouchableOpacity>

              {/* Test Result Message */}
              {testResult && (
                <View
                  style={[
                    styles.testResultBox,
                    testResult.success ? styles.testSuccess : styles.testFail,
                  ]}
                >
                  <Text
                    style={[
                      styles.testResultText,
                      testResult.success ? styles.testSuccessText : styles.testFailText,
                    ]}
                  >
                    {testResult.success ? '✅ ' : '❌ '}
                    {testResult.message}
                  </Text>
                </View>
              )}

              <View style={styles.modalActionsRow}>
                <TouchableOpacity style={styles.resetBtn} onPress={handleResetServerHost}>
                  <Text style={styles.resetBtnText}>Auto Detect</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.saveBtn} onPress={handleSaveServerHost}>
                  <Text style={styles.saveBtnText}>Save & Connect</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
      </LuxuryPatternBackground>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  mainScrollView: {
    flex: 1,
    width: '100%',
  },
  scrollContainer: {
    flexGrow: 1,
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  container: {
    width: '100%',
    maxWidth: 440,
    alignSelf: 'center',
  },
  brandHeader: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  crestBadge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: colors.cardBorderGold,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 3,
  },
  crestEmoji: {
    fontSize: 20,
  },
  brandTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 2.5,
  },
  brandSubtitle: {
    fontSize: 9.5,
    color: colors.primaryDark,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '800',
  },
  ornamentLine: {
    width: 40,
    height: 2,
    backgroundColor: colors.primary,
    marginTop: 6,
    borderRadius: 1,
  },
  serverStatusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 6,
    gap: 6,
  },
  serverPulseDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: colors.available,
  },
  serverStatusText: {
    fontSize: 10.5,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  stepContainer: {
    flex: 1,
    paddingTop: 14,
  },
  stepTitleBox: {
    marginBottom: 14,
  },
  stepTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    textAlign: 'center',
  },
  stepSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 2,
    fontWeight: '600',
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: colors.textSecondary,
    marginTop: 10,
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    backgroundColor: colors.dirtyBg,
    borderWidth: 1.5,
    borderColor: colors.dirtyBorder,
    padding: 16,
    borderRadius: 14,
    alignItems: 'center',
  },
  errorText: {
    color: colors.dirty,
    fontWeight: '800',
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
  },
  errorActionsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  retryBtn: {
    backgroundColor: colors.dirty,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  configServerBtn: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
  },
  configServerBtnText: {
    color: colors.text,
    fontWeight: '900',
    fontSize: 12,
  },
  staffGrid: {
    gap: 10,
    paddingBottom: 20,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
    position: 'relative',
    overflow: 'hidden',
  },
  goldLeftBorder: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
  },
  staffAvatar: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  roleBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
    borderWidth: 1.5,
  },
  roleAdmin: {
    backgroundColor: colors.pendingBg,
    borderColor: colors.occupiedBorder,
  },
  roleCook: {
    backgroundColor: colors.acceptedBg,
    borderColor: colors.acceptedBorder,
  },
  roleWaiter: {
    backgroundColor: colors.primaryLight,
    borderColor: colors.primary,
  },
  roleCleaner: {
    backgroundColor: colors.dirtyBg,
    borderColor: colors.dirtyBorder,
  },
  roleBadgeText: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  roleAdminText: { color: colors.occupied },
  roleCookText: { color: colors.accepted },
  roleWaiterText: { color: colors.primaryDark },
  roleCleanerText: { color: colors.dirty },
  chevronBox: {
    paddingLeft: 8,
  },
  arrowIcon: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '800',
  },
  backButton: {
    paddingVertical: 8,
    marginBottom: 8,
  },
  backButtonText: {
    color: colors.primaryDark,
    fontWeight: '800',
    fontSize: 13,
  },
  activeProfileCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 3,
  },
  activeProfileAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.primaryLight,
    borderWidth: 2,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  activeAvatarText: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  profileGreeting: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    letterSpacing: 1.5,
  },
  profileName: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  activeRolePill: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginTop: 3,
  },
  activeRolePillText: {
    fontSize: 9.5,
    fontWeight: '800',
    color: colors.primaryDark,
  },
  pinDotsContainer: {
    flexDirection: 'row',
    gap: 14,
    marginVertical: 8,
  },
  pinDot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    backgroundColor: '#FFFFFF',
  },
  pinDotFilled: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  pinErrorBox: {
    backgroundColor: colors.dirtyBg,
    borderWidth: 1.5,
    borderColor: colors.dirtyBorder,
    padding: 8,
    borderRadius: 8,
    marginTop: 8,
    alignItems: 'center',
  },
  pinErrorText: {
    color: colors.dirty,
    fontWeight: '800',
    fontSize: 12,
  },
  authenticatingBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    marginTop: 6,
  },
  authenticatingText: {
    color: colors.primaryDark,
    fontSize: 12,
    fontWeight: '800',
  },
  manualSubmitBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  manualSubmitText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0.5,
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.5)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 22,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
  },
  modalHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  modalCloseText: {
    fontSize: 18,
    color: colors.textSecondary,
    fontWeight: '800',
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 4,
    lineHeight: 18,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 6,
  },
  hostInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },
  testBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 10,
  },
  testBtnText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },
  testResultBox: {
    padding: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    marginBottom: 12,
  },
  testSuccess: {
    backgroundColor: colors.availableBg,
    borderColor: colors.availableBorder,
  },
  testFail: {
    backgroundColor: colors.dirtyBg,
    borderColor: colors.dirtyBorder,
  },
  testResultText: {
    fontSize: 12,
    fontWeight: '800',
  },
  testSuccessText: {
    color: colors.available,
  },
  testFailText: {
    color: colors.dirty,
  },
  modalActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 4,
  },
  resetBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  resetBtnText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 13,
  },
  saveBtn: {
    flex: 1.5,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  saveBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 13,
  },
});

export default LoginScreen;
