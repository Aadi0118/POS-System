/**
 * @file CleanerDashboard.js
 * @description White & Luxury Floor Sanitation Dashboard.
 * Features:
 * - Ambient luxury pattern background with champagne halos.
 * - Real-time floor hygiene progress meter and salon status banner.
 * - Distinct ruby borders on dirty table cards with emerald luxury action buttons.
 * - Instant WebSocket synchronization with waiter floor grids.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import apiClient from '../api/client';
import { getSocket } from '../api/socket';
import Header from '../components/Header';
import {
  LuxuryPatternBackground,
  LuxuryEmblem,
  MichelinStars,
  LuxuryProgressBar,
} from '../components/LuxuryPattern';
import colors from '../theme/colors';

const CleanerDashboard = () => {
  const [dirtyTables, setDirtyTables] = useState([]);
  const [totalTablesCount, setTotalTablesCount] = useState(8);
  const [loading, setLoading] = useState(true);
  const [cleaningId, setCleaningId] = useState(null);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchDashboardData();
    setupSocket();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const [dirtyRes, allTablesRes] = await Promise.all([
        apiClient.get('/tables?status=Dirty'),
        apiClient.get('/tables'),
      ]);

      if (dirtyRes.data.success) {
        setDirtyTables(dirtyRes.data.data);
      }
      if (allTablesRes.data.success) {
        setTotalTablesCount(allTablesRes.data.data.length || 8);
      }
    } catch (err) {
      console.error('[Cleaner Dashboard Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupSocket = async () => {
    const socket = await getSocket();

    socket.on('table:status_updated', (data) => {
      if (data.status === 'Dirty') {
        fetchDashboardData();
      } else {
        setDirtyTables((prev) => prev.filter((t) => t._id !== data.tableId));
      }
    });

    return () => {
      socket.off('table:status_updated');
    };
  };

  const handleMarkClean = async (table) => {
    setCleaningId(table._id);
    try {
      const res = await apiClient.patch(`/tables/${table._id}/clean`);
      if (res.data.success) {
        setDirtyTables((prev) => prev.filter((t) => t._id !== table._id));
      }
    } catch (err) {
      Alert.alert(
        'Action Error',
        err.response?.data?.error || 'Failed to update table status.'
      );
    } finally {
      setCleaningId(null);
    }
  };

  const cleanTablesCount = Math.max(0, totalTablesCount - dirtyTables.length);
  const cleanRatio = totalTablesCount > 0 ? cleanTablesCount / totalTablesCount : 1;

  return (
    <View style={styles.container}>
      <Header title="Sanitation Service" subtitle="Dining Hall Maintenance" />

      <LuxuryPatternBackground>
        {/* Floor Hygiene Progress Header */}
        <View style={styles.hygieneHeaderCard}>
          <View style={styles.hygieneHeaderTop}>
            <View style={styles.hygieneTitleWrap}>
              <Text style={styles.hygieneInsignia}>⚜️ HAUTE HYGIÈNE & SERVICE ⚜️</Text>
              <Text style={styles.hygieneTitle}>Main Dining Salon Hygiene</Text>
            </View>
            <View style={styles.cleanRateBadge}>
              <Text style={styles.cleanRateText}>
                {cleanTablesCount}/{totalTablesCount} Clean
              </Text>
            </View>
          </View>

          <LuxuryProgressBar
            progress={cleanRatio}
            label="Floor Sanitation Coverage"
            totalLabel={`${Math.round(cleanRatio * 100)}% Ready`}
          />
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loaderText}>Checking table hygiene status...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchDashboardData();
                }}
                tintColor={colors.primary}
              />
            }
          >
            {dirtyTables.length === 0 ? (
              <View style={styles.emptyContainer}>
                <LuxuryEmblem icon="✨" size={76} bg={colors.availableBg} border={colors.availableBorder} />
                <Text style={styles.emptyTitle}>All Dining Tables Sanitized</Text>
                <MichelinStars />
                <Text style={styles.emptySubtitle}>
                  Every table on the salon floor is pristine and ready to welcome guests. New entries will appear automatically as guests settle their bills.
                </Text>
              </View>
            ) : (
              <View style={styles.cardsContainer}>
                <View style={styles.alertBanner}>
                  <Text style={styles.alertBannerIcon}>🔔</Text>
                  <Text style={styles.alertBannerText}>
                    {dirtyTables.length} table{dirtyTables.length > 1 ? 's' : ''} awaiting immediate turnover & sanitization
                  </Text>
                </View>

                {dirtyTables.map((table) => {
                  const isCleaningThis = cleaningId === table._id;
                  return (
                    <View key={table._id} style={styles.dirtyCard}>
                      <View style={styles.cardHeader}>
                        <View style={styles.tableIdentity}>
                          <Text style={styles.tableEmoji}>🪑</Text>
                          <View>
                            <Text style={styles.tableTitle}>Table {table.tableNumber}</Text>
                            <Text style={styles.tableSubtitle}>
                              Salon Floor • Capacity: {table.capacity} Guests
                            </Text>
                          </View>
                        </View>
                        <View style={styles.dirtyBadge}>
                          <Text style={styles.dirtyBadgeDot}>●</Text>
                          <Text style={styles.dirtyBadgeText}>NEEDS CLEANING</Text>
                        </View>
                      </View>

                      {/* Single Action Button: Mark Clean */}
                      <TouchableOpacity
                        style={[styles.markCleanBtn, isCleaningThis && styles.cleaningBtnActive]}
                        onPress={() => handleMarkClean(table)}
                        disabled={isCleaningThis}
                        activeOpacity={0.8}
                      >
                        {isCleaningThis ? (
                          <ActivityIndicator color="#FFFFFF" size="small" />
                        ) : (
                          <Text style={styles.markCleanBtnText}>
                            ✨ Mark Clean & Ready for Guests
                          </Text>
                        )}
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}
          </ScrollView>
        )}
      </LuxuryPatternBackground>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  hygieneHeaderCard: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 5,
  },
  hygieneHeaderTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  hygieneTitleWrap: {
    flex: 1,
  },
  hygieneInsignia: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1.5,
  },
  hygieneTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  cleanRateBadge: {
    backgroundColor: colors.availableBg,
    borderWidth: 1.5,
    borderColor: colors.availableBorder,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  cleanRateText: {
    color: colors.available,
    fontWeight: '900',
    fontSize: 12,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  loaderCenter: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loaderText: {
    color: colors.textSecondary,
    marginTop: 12,
    fontSize: 13,
    fontWeight: '600',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 90,
    paddingHorizontal: 24,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 22,
    fontWeight: '500',
  },
  cardsContainer: {
    gap: 16,
  },
  alertBanner: {
    backgroundColor: colors.dirtyBg,
    borderWidth: 1.5,
    borderColor: colors.dirtyBorder,
    padding: 14,
    borderRadius: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  alertBannerIcon: {
    fontSize: 16,
  },
  alertBannerText: {
    color: colors.dirty,
    fontSize: 13,
    fontWeight: '800',
    flex: 1,
  },
  dirtyCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 20,
    borderWidth: 2,
    borderColor: colors.dirtyBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 18,
  },
  tableIdentity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableEmoji: {
    fontSize: 24,
  },
  tableTitle: {
    fontSize: 22,
    fontWeight: '900',
    color: colors.text,
  },
  tableSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  dirtyBadge: {
    backgroundColor: colors.dirtyBg,
    borderWidth: 1.5,
    borderColor: colors.dirtyBorder,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dirtyBadgeDot: {
    color: colors.dirty,
    fontSize: 8,
  },
  dirtyBadgeText: {
    color: colors.dirty,
    fontWeight: '900',
    fontSize: 11,
    letterSpacing: 0.5,
  },
  markCleanBtn: {
    backgroundColor: colors.available,
    borderWidth: 1.5,
    borderColor: colors.availableBorder,
    paddingVertical: 16,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.available,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  cleaningBtnActive: {
    opacity: 0.6,
  },
  markCleanBtnText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default CleanerDashboard;
