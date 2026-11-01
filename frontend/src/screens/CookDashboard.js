/**
 * @file CookDashboard.js
 * @description White & Luxury Kitchen Display System (KDS) for Chefs.
 * Features:
 * - Ambient luxury pattern background with champagne halos.
 * - Brass ticket clip rail ornament for kitchen tickets.
 * - Haute cuisine typography, elapsed preparation timer, and culinary note callouts.
 * - High-contrast visible borders and responsive action controls.
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
import StatusBadge from '../components/StatusBadge';
import {
  LuxuryPatternBackground,
  LuxuryTicketClip,
  LuxuryEmblem,
  MichelinStars,
  GoldDivider,
} from '../components/LuxuryPattern';
import colors from '../theme/colors';

const CookDashboard = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchActiveOrders();
    setupSocket();
  }, []);

  const fetchActiveOrders = async () => {
    try {
      const res = await apiClient.get('/orders/active');
      if (res.data.success) {
        setOrders(res.data.data);
      }
    } catch (err) {
      console.error('[KDS Fetch Error]', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const setupSocket = async () => {
    const socket = await getSocket();

    socket.on('order:created', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev.filter((o) => o._id !== newOrder._id)]);
    });

    socket.on('order:updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
    });

    socket.on('order:status_updated', (updatedOrder) => {
      if (updatedOrder.status === 'Completed' || updatedOrder.status === 'Rejected') {
        setOrders((prev) => prev.filter((o) => o._id !== updatedOrder._id));
      } else {
        setOrders((prev) =>
          prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
        );
      }
    });

    socket.on('order:completed', (completedOrder) => {
      setOrders((prev) => prev.filter((o) => o._id !== completedOrder._id));
    });

    socket.on('order:items_added', (payload) => {
      fetchActiveOrders();
    });

    return () => {
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:status_updated');
      socket.off('order:completed');
      socket.off('order:items_added');
    };
  };

  const handleUpdateStatus = async (orderId, newStatus) => {
    try {
      const res = await apiClient.patch(`/orders/${orderId}/status`, {
        status: newStatus,
      });

      if (res.data.success) {
        if (newStatus === 'Rejected') {
          setOrders((prev) => prev.filter((o) => o._id !== orderId));
        } else {
          setOrders((prev) =>
            prev.map((o) => (o._id === orderId ? res.data.data : o))
          );
        }
      }
    } catch (err) {
      Alert.alert('Status Error', err.response?.data?.error || 'Failed to update ticket status');
    }
  };

  const confirmReject = (orderId) => {
    Alert.alert(
      'Reject Kitchen Ticket',
      'Are you sure you want to reject this ticket? The waiter and executive console will be informed.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reject Order',
          style: 'destructive',
          onPress: () => handleUpdateStatus(orderId, 'Rejected'),
        },
      ]
    );
  };

  const formatElapsed = (createdAt) => {
    const diffMin = Math.floor((new Date() - new Date(createdAt)) / 60000);
    if (diffMin <= 0) return 'Just now';
    if (diffMin === 1) return '1 min ago';
    return `${diffMin} mins ago`;
  };

  return (
    <View style={styles.container}>
      <Header title="Kitchen Display System" subtitle="Live Preparation Line" />

      <LuxuryPatternBackground>
        {/* Executive Kitchen Station Banner */}
        <View style={styles.stationBanner}>
          <View style={styles.stationLeft}>
            <Text style={styles.stationInsignia}>✦ SERVICE DE CUISINE ✦</Text>
            <Text style={styles.stationTitle}>Main Cookline Station</Text>
          </View>
          <View style={styles.ticketCountBadge}>
            <Text style={styles.ticketCountNumber}>{orders.length}</Text>
            <Text style={styles.ticketCountLabel}>
              Active Ticket{orders.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loaderText}>Loading kitchen tickets from pass...</Text>
          </View>
        ) : (
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={() => {
                  setRefreshing(true);
                  fetchActiveOrders();
                }}
                tintColor={colors.primary}
              />
            }
          >
            {orders.length === 0 ? (
              <View style={styles.emptyContainer}>
                <LuxuryEmblem icon="👨‍🍳" size={76} />
                <Text style={styles.emptyTitle}>Kitchen Queue Is Clear</Text>
                <MichelinStars />
                <Text style={styles.emptySubtitle}>
                  All culinary orders have been prepared and dispatched to the salon. New tickets will appear automatically via real-time dispatch.
                </Text>
              </View>
            ) : (
              <View style={styles.ticketsGrid}>
                {orders.map((order) => {
                  const isPending = order.status === 'Pending';
                  const isAccepted = order.status === 'Accepted';
                  const isReady = order.status === 'Ready';

                  return (
                    <View
                      key={order._id}
                      style={[
                        styles.ticketCard,
                        isPending && styles.ticketPending,
                        isAccepted && styles.ticketAccepted,
                        isReady && styles.ticketReady,
                      ]}
                    >
                      {/* Brass Rail Order Clip */}
                      <LuxuryTicketClip
                        label={`TICKET #${order.orderNumber?.slice(-4) || 'LIVE'}`}
                        color={isPending ? colors.occupied : isAccepted ? colors.accepted : colors.available}
                      />

                      {/* Ticket Header */}
                      <View style={styles.ticketHeader}>
                        <View style={styles.tableTitleBox}>
                          <Text style={styles.tableIcon}>🍽️</Text>
                          <View>
                            <Text style={styles.tableTitle}>
                              Table {order.tableId?.tableNumber || '?'}
                            </Text>
                            <Text style={styles.orderNumber}>
                              Server: {order.waiterId?.name || 'Staff'} • #{order.orderNumber}
                            </Text>
                          </View>
                        </View>
                        <View style={styles.headerRight}>
                          <Text style={styles.elapsedTime}>
                            ⏱️ {formatElapsed(order.createdAt)}
                          </Text>
                          <StatusBadge status={order.status} type="order" size="small" />
                        </View>
                      </View>

                      {/* Multi-Course Kitchen Notice Banner */}
                      {order.items.some((i) => i.round > 1) && (
                        <View style={styles.multiCourseBanner}>
                          <Text style={styles.multiCourseBannerText}>
                            ✦ ADDITIONAL COURSES ADDED TO TABLE ✦
                          </Text>
                        </View>
                      )}

                      {/* Ticket Items List */}
                      <View style={styles.itemsList}>
                        {order.items.map((item, index) => {
                          const isAdditionalCourse = item.round && item.round > 1;
                          return (
                            <View key={`item-${index}`} style={styles.itemRow}>
                              <View
                                style={[
                                  styles.itemQuantityBadge,
                                  isAdditionalCourse && styles.itemQuantityBadgeNew,
                                ]}
                              >
                                <Text
                                  style={[
                                    styles.quantityNumber,
                                    isAdditionalCourse && styles.quantityNumberNew,
                                  ]}
                                >
                                  {item.quantity}×
                                </Text>
                              </View>
                              <View style={styles.itemDetails}>
                                <View style={styles.itemNameRow}>
                                  <Text style={styles.itemName}>{item.name}</Text>
                                  {isAdditionalCourse ? (
                                    <View style={styles.roundBadge}>
                                      <Text style={styles.roundBadgeText}>ROUND {item.round}</Text>
                                    </View>
                                  ) : null}
                                  {item.status === 'Ready' ? (
                                    <View style={styles.itemReadyBadge}>
                                      <Text style={styles.itemReadyBadgeText}>✓ Done</Text>
                                    </View>
                                  ) : null}
                                </View>
                                {item.notes ? (
                                  <View style={styles.notesPill}>
                                    <Text style={styles.itemNotes}>
                                      👨‍🍳 Chef Instruction: "{item.notes}"
                                    </Text>
                                  </View>
                                ) : null}
                              </View>
                            </View>
                          );
                        })}
                      </View>

                      {/* KDS Action Controls */}
                      <View style={styles.ticketActions}>
                        {isPending && (
                          <>
                            <TouchableOpacity
                              style={[styles.btnAction, styles.btnReject]}
                              onPress={() => confirmReject(order._id)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.btnRejectText}>✕ Reject Ticket</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.btnAction, styles.btnAccept]}
                              onPress={() => handleUpdateStatus(order._id, 'Accepted')}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.btnAcceptText}>🍳 Accept to Cook</Text>
                            </TouchableOpacity>
                          </>
                        )}

                        {isAccepted && (
                          <TouchableOpacity
                            style={[styles.btnAction, styles.btnReady]}
                            onPress={() => handleUpdateStatus(order._id, 'Ready')}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.btnReadyText}>🔔 Mark as Ready for Pickup</Text>
                          </TouchableOpacity>
                        )}

                        {isReady && (
                          <View style={styles.readyNotification}>
                            <Text style={styles.readyNotificationText}>
                              ✅ Plated & Ready for Server Pickup
                            </Text>
                          </View>
                        )}
                      </View>
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
  stationBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    zIndex: 5,
  },
  stationLeft: {
    flex: 1,
  },
  stationInsignia: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1.5,
  },
  stationTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  ticketCountBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignItems: 'center',
  },
  ticketCountNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  ticketCountLabel: {
    fontSize: 9,
    fontWeight: '800',
    color: colors.textSecondary,
    textTransform: 'uppercase',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 70,
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
    marginTop: 8,
    textAlign: 'center',
    fontWeight: '500',
    lineHeight: 22,
  },
  ticketsGrid: {
    gap: 16,
  },
  ticketCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 10,
    elevation: 3,
  },
  ticketPending: {
    borderColor: colors.occupiedBorder,
  },
  ticketAccepted: {
    borderColor: colors.acceptedBorder,
  },
  ticketReady: {
    borderColor: colors.availableBorder,
  },
  ticketHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  tableTitleBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tableIcon: {
    fontSize: 22,
  },
  tableTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  orderNumber: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '700',
  },
  headerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  elapsedTime: {
    color: colors.textGold,
    fontSize: 12,
    fontWeight: '800',
  },
  multiCourseBanner: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 8,
    paddingVertical: 5,
    paddingHorizontal: 10,
    marginTop: 8,
    alignItems: 'center',
  },
  multiCourseBannerText: {
    color: '#92400E',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
  itemsList: {
    paddingVertical: 14,
    gap: 12,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  itemQuantityBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginRight: 12,
    minWidth: 36,
    alignItems: 'center',
  },
  itemQuantityBadgeNew: {
    backgroundColor: '#FEF3C7',
    borderColor: '#F59E0B',
  },
  quantityNumber: {
    color: colors.primaryDark,
    fontSize: 14,
    fontWeight: '900',
  },
  quantityNumberNew: {
    color: '#B45309',
  },
  itemDetails: {
    flex: 1,
  },
  itemNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  itemName: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  roundBadge: {
    backgroundColor: '#FDE68A',
    borderWidth: 1,
    borderColor: '#D97706',
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  roundBadgeText: {
    color: '#78350F',
    fontSize: 10,
    fontWeight: '900',
  },
  itemReadyBadge: {
    backgroundColor: colors.availableBg,
    borderWidth: 1,
    borderColor: colors.availableBorder,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  itemReadyBadgeText: {
    color: colors.available,
    fontSize: 10,
    fontWeight: '900',
  },
    fontWeight: '800',
  },
  notesPill: {
    backgroundColor: '#FEF3C7',
    borderWidth: 1.5,
    borderColor: '#F59E0B',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  itemNotes: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '800',
  },
  ticketActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 6,
    paddingTop: 14,
    borderTopWidth: 1.5,
    borderTopColor: colors.cardBorder,
  },
  btnAction: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnReject: {
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  btnRejectText: {
    color: colors.textSecondary,
    fontSize: 13,
    fontWeight: '800',
  },
  btnAccept: {
    backgroundColor: colors.accepted,
    borderWidth: 1.5,
    borderColor: colors.acceptedBorder,
    shadowColor: colors.accepted,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnAcceptText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  btnReady: {
    backgroundColor: colors.available,
    borderWidth: 1.5,
    borderColor: colors.availableBorder,
    shadowColor: colors.available,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  btnReadyText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  readyNotification: {
    flex: 1,
    backgroundColor: colors.availableBg,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.availableBorder,
  },
  readyNotificationText: {
    color: colors.available,
    fontWeight: '900',
    fontSize: 14,
  },
});

export default CookDashboard;
