/**
 * @file AdminDashboard.js
 * @description White & Luxury Executive Dashboard for Restaurant Administration.
 * Features:
 * - Luxury pattern background with ambient champagne halos.
 * - Real-time incoming kitchen order alert banner with quick inspection.
 * - Revenue intelligence metrics with gold watermarks & category progress bars.
 * - Full CRUD over menu, staff, and tables with fine-dining modals.
 * - Master Void Override with audit trail.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import apiClient from '../api/client';
import { getSocket } from '../api/socket';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import {
  LuxuryPatternBackground,
  LuxuryTicketClip,
  LuxuryProgressBar,
  LuxuryEmblem,
  MichelinStars,
  GoldDivider,
} from '../components/LuxuryPattern';
import colors from '../theme/colors';

const ALLOWED_CATEGORIES = [
  'North Indian',
  'Indo-Chinese',
  'South Indian',
  'Street Food',
  'Grills',
  'Biryani',
  'Momos',
  'Beverages',
  'Desserts',
];

const CATEGORY_ICONS = {
  'North Indian': '🍛',
  'Indo-Chinese': '🥢',
  'South Indian': '🥞',
  'Street Food': '🥘',
  Grills: '🍢',
  Biryani: '🍚',
  Momos: '🥟',
  Beverages: '🥂',
  Desserts: '🍨',
};

const ROLES = ['Admin', 'Waiter', 'Cook', 'Cleaner'];

const AdminDashboard = () => {
  const [activeTab, setActiveTab] = useState('analytics');
  const [metrics, setMetrics] = useState(null);
  const [orders, setOrders] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const [tables, setTables] = useState([]);
  const [loading, setLoading] = useState(true);

  // Real-time live incoming kitchen order alert for Admin
  const [latestLiveOrder, setLatestLiveOrder] = useState(null);

  // Modals for CRUD operations
  const [menuModalVisible, setMenuModalVisible] = useState(false);
  const [staffModalVisible, setStaffModalVisible] = useState(false);
  const [tableModalVisible, setTableModalVisible] = useState(false);

  // Form states
  const [newMenuItem, setNewMenuItem] = useState({
    name: '',
    category: 'North Indian',
    price: '',
    description: '',
  });

  const [newStaff, setNewStaff] = useState({
    name: '',
    role: 'Waiter',
    pin: '',
  });

  const [newTable, setNewTable] = useState({
    tableNumber: '',
    capacity: '4',
  });

  useEffect(() => {
    fetchDashboardData(false);
    setupSocket();
  }, []);

  const fetchDashboardData = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [metricsRes, ordersRes, menuRes, staffRes, tablesRes] = await Promise.all([
        apiClient.get('/admin/metrics'),
        apiClient.get('/orders'),
        apiClient.get('/menu'),
        apiClient.get('/admin/staff'),
        apiClient.get('/tables'),
      ]);

      if (metricsRes.data.success) setMetrics(metricsRes.data.data);
      if (ordersRes.data.success) setOrders(ordersRes.data.data);
      if (menuRes.data.success) setMenuItems(menuRes.data.data);
      if (staffRes.data.success) setStaffList(staffRes.data.data);
      if (tablesRes.data.success) setTables(tablesRes.data.data);
    } catch (err) {
      console.error('[Admin Fetch Error]', err);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  const setupSocket = async () => {
    const socket = await getSocket();

    socket.on('order:created', (newOrder) => {
      setOrders((prev) => [newOrder, ...prev.filter((o) => o._id !== newOrder._id)]);
      setLatestLiveOrder(newOrder);
      fetchDashboardData(true);
    });

    socket.on('order:updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
      fetchDashboardData(true);
    });

    socket.on('order:status_updated', (updatedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === updatedOrder._id ? updatedOrder : o))
      );
      fetchDashboardData(true);
    });

    socket.on('order:completed', (completedOrder) => {
      setOrders((prev) =>
        prev.map((o) => (o._id === completedOrder._id ? completedOrder : o))
      );
      fetchDashboardData(true);
    });

    socket.on('table:status_updated', () => {
      fetchDashboardData(true);
    });

    return () => {
      socket.off('order:created');
      socket.off('order:updated');
      socket.off('order:status_updated');
      socket.off('order:completed');
      socket.off('table:status_updated');
    };
  };

  const handleVoidOrder = (order) => {
    Alert.alert(
      'Master Override: Void Order',
      `Are you sure you want to VOID order ${order.orderNumber} for Table ${order.tableId?.tableNumber}? This will cancel the ticket and release the table.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm Void',
          style: 'destructive',
          onPress: async () => {
            try {
              const res = await apiClient.delete(`/orders/${order._id}/void`);
              if (res.data.success) {
                Alert.alert('Success', 'Order has been voided by admin override.');
                fetchDashboardData(true);
              }
            } catch (err) {
              Alert.alert('Error', err.response?.data?.error || 'Failed to void order');
            }
          },
        },
      ]
    );
  };

  const handleCreateMenuItem = async () => {
    if (!newMenuItem.name || !newMenuItem.price) {
      Alert.alert('Validation Error', 'Dish name and price are required.');
      return;
    }

    try {
      const res = await apiClient.post('/menu', {
        name: newMenuItem.name,
        category: newMenuItem.category,
        price: parseFloat(newMenuItem.price),
        description: newMenuItem.description,
      });

      if (res.data.success) {
        Alert.alert('Created', `Item '${newMenuItem.name}' added to menu.`);
        setMenuModalVisible(false);
        setNewMenuItem({ name: '', category: 'North Indian', price: '', description: '' });
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create menu item');
    }
  };

  const handleToggleItemAvailability = async (item) => {
    try {
      await apiClient.patch(`/menu/${item._id}/availability`, {
        isAvailable: !item.isAvailable,
      });
      fetchDashboardData(true);
    } catch (err) {
      Alert.alert('Error', 'Failed to toggle availability.');
    }
  };

  const handleCreateStaff = async () => {
    if (!newStaff.name || !newStaff.pin || newStaff.pin.length !== 4) {
      Alert.alert('Validation Error', 'Staff name and exactly 4-digit PIN are required.');
      return;
    }

    try {
      const res = await apiClient.post('/admin/staff', {
        name: newStaff.name,
        role: newStaff.role,
        pin: newStaff.pin,
      });

      if (res.data.success) {
        Alert.alert('Staff Account Created', `Staff '${newStaff.name}' configured with PIN ${newStaff.pin}.`);
        setStaffModalVisible(false);
        setNewStaff({ name: '', role: 'Waiter', pin: '' });
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create staff');
    }
  };

  const handleToggleStaffStatus = async (staff) => {
    try {
      const res = await apiClient.patch(`/admin/staff/${staff._id}/toggle-status`);
      if (res.data.success) {
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to toggle staff status');
    }
  };

  const handleCreateTable = async () => {
    if (!newTable.tableNumber) {
      Alert.alert('Validation Error', 'Table number is required.');
      return;
    }

    try {
      const res = await apiClient.post('/tables', {
        tableNumber: parseInt(newTable.tableNumber, 10),
        capacity: parseInt(newTable.capacity, 10) || 4,
      });

      if (res.data.success) {
        Alert.alert('Success', `Table ${newTable.tableNumber} added.`);
        setTableModalVisible(false);
        setNewTable({ tableNumber: '', capacity: '4' });
        fetchDashboardData(true);
      }
    } catch (err) {
      Alert.alert('Error', err.response?.data?.error || 'Failed to create table');
    }
  };

  const activeKitchenOrders = orders.filter((o) =>
    ['Pending', 'Accepted', 'Ready'].includes(o.status)
  );
  const pastOrders = orders.filter((o) =>
    ['Completed', 'Rejected'].includes(o.status)
  );

  // Highest revenue category for relative progress calculation
  const maxCategoryRevenue = metrics?.categoryBreakdown
    ? Math.max(...Object.values(metrics.categoryBreakdown), 1)
    : 1;

  return (
    <View style={styles.container}>
      <Header title="Executive Suite" subtitle="Operations & Revenue Intelligence" />

      {/* Real-time Incoming Kitchen Order Alert Banner */}
      {latestLiveOrder && (
        <View style={styles.liveOrderBanner}>
          <View style={styles.liveBannerHeader}>
            <View style={styles.livePulseDot} />
            <Text style={styles.liveBannerTitle}>
              🔔 LIVE DISPATCH: TABLE {latestLiveOrder.tableId?.tableNumber}
            </Text>
            <TouchableOpacity
              onPress={() => setLatestLiveOrder(null)}
              style={styles.liveBannerClose}
              activeOpacity={0.7}
            >
              <Text style={styles.liveBannerCloseText}>✕ Dismiss</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.liveBannerMeta}>
            Ticket #{latestLiveOrder.orderNumber} • Server: {latestLiveOrder.waiterId?.name || 'Staff'} • Total: ₹{latestLiveOrder.totalAmount}
          </Text>

          <View style={styles.liveBannerItems}>
            {latestLiveOrder.items.map((it, idx) => (
              <Text key={idx} style={styles.liveBannerItemText}>
                🔥 {it.quantity}× {it.name} {it.notes ? `(Note: "${it.notes}")` : ''}
              </Text>
            ))}
          </View>

          <View style={styles.liveBannerFooter}>
            <TouchableOpacity
              style={styles.liveBannerViewBtn}
              onPress={() => {
                setActiveTab('orders');
                setLatestLiveOrder(null);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.liveBannerViewText}>Inspect in Live Tickets Tab →</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Luxury Navigation Tab Bar */}
      <View style={styles.tabBarWrapper}>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.tabBarScroll}
        >
          {[
            { key: 'analytics', label: '📊 Intelligence' },
            { key: 'orders', label: `🧾 Tickets (${activeKitchenOrders.length})` },
            { key: 'menu', label: '🍲 Catalog' },
            { key: 'staff', label: '👥 Personnel' },
            { key: 'tables', label: '🪑 Floor' },
          ].map((tab) => (
            <TouchableOpacity
              key={tab.key}
              style={[styles.tabItem, activeTab === tab.key && styles.tabItemActive]}
              onPress={() => setActiveTab(tab.key)}
              activeOpacity={0.75}
            >
              <Text
                style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}
              >
                {tab.label}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <LuxuryPatternBackground>
        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loaderText}>Compiling operational intelligence...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* TAB 1: METRICS & REVENUE ANALYTICS */}
            {activeTab === 'analytics' && metrics && (
              <View style={styles.tabContent}>
                {/* Executive Insignia Ribbon */}
                <View style={styles.executiveHeaderBanner}>
                  <View>
                    <Text style={styles.executiveInsignia}>✦ CONSOLE D'ADMINISTRATION ✦</Text>
                    <Text style={styles.executiveTitle}>Live Salon Performance</Text>
                  </View>
                  <MichelinStars count={3} />
                </View>

                {/* 4 Revenue & Occupancy Metric Cards */}
                <View style={styles.metricsGrid}>
                  {/* Card 1: Revenue */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Today's Gross Sales</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>₹</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.available }]}>
                      ₹{metrics.todayRevenue}
                    </Text>
                    <Text style={styles.metricSub}>Settled & Paid dining orders</Text>
                  </View>

                  {/* Card 2: Tickets */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Total Dining Tickets</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>🧾</Text>
                      </View>
                    </View>
                    <Text style={styles.metricValue}>{metrics.orders?.total || 0}</Text>
                    <Text style={styles.metricSub}>
                      {metrics.orders?.completed || 0} completed • {metrics.orders?.pending || 0} in cookline
                    </Text>
                  </View>

                  {/* Card 3: Occupancy */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Salon Occupancy</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>🪑</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.occupied }]}>
                      {metrics.tables?.occupancyRate || 0}%
                    </Text>
                    <Text style={styles.metricSub}>
                      {metrics.tables?.occupied} / {metrics.tables?.total} tables seated
                    </Text>
                  </View>

                  {/* Card 4: Sanitation */}
                  <View style={styles.metricCard}>
                    <View style={styles.metricTopRow}>
                      <Text style={styles.metricLabel}>Hygiene Turnover</Text>
                      <View style={styles.metricWatermarkBadge}>
                        <Text style={styles.metricWatermarkIcon}>✨</Text>
                      </View>
                    </View>
                    <Text style={[styles.metricValue, { color: colors.dirty }]}>
                      {metrics.tables?.dirty || 0}
                    </Text>
                    <Text style={styles.metricSub}>Tables awaiting housekeeping</Text>
                  </View>
                </View>

                {/* Real-Time Kitchen Dispatch Feed */}
                <View style={styles.sectionBox}>
                  <View style={styles.feedHeaderRow}>
                    <View style={styles.livePulseDot} />
                    <Text style={styles.sectionTitle}>
                      Live Kitchen Dispatch Stream ({activeKitchenOrders.length})
                    </Text>
                  </View>
                  {activeKitchenOrders.length === 0 ? (
                    <Text style={styles.emptyText}>No tickets currently in kitchen preparation.</Text>
                  ) : (
                    activeKitchenOrders.map((order) => (
                      <View key={order._id} style={styles.liveFeedItem}>
                        <View style={styles.liveFeedItemTop}>
                          <Text style={styles.liveFeedTable}>Table {order.tableId?.tableNumber}</Text>
                          <StatusBadge status={order.status} type="order" size="small" />
                        </View>
                        <Text style={styles.liveFeedWaiter}>
                          Server: {order.waiterId?.name} • ₹{order.totalAmount}
                        </Text>
                        <View style={styles.liveFeedItemsList}>
                          {order.items.map((it, idx) => (
                            <Text key={idx} style={styles.liveFeedItemText}>
                              • {it.quantity}× {it.name} {it.notes ? `("${it.notes}")` : ''}
                            </Text>
                          ))}
                        </View>
                      </View>
                    ))
                  )}
                </View>

                {/* Category Breakdown with Progress Bars */}
                <View style={styles.sectionBox}>
                  <Text style={styles.sectionTitle}>Category Revenue Breakdown</Text>
                  <Text style={styles.sectionSubtitle}>Itemized revenue performance by cuisine division</Text>
                  <GoldDivider />

                  {Object.entries(metrics.categoryBreakdown || {}).length === 0 ? (
                    <Text style={styles.emptyText}>No settled orders recorded today yet.</Text>
                  ) : (
                    Object.entries(metrics.categoryBreakdown).map(([category, amount]) => {
                      const ratio = maxCategoryRevenue > 0 ? amount / maxCategoryRevenue : 0;
                      const icon = CATEGORY_ICONS[category] || '🍽️';
                      return (
                        <View key={category} style={styles.categoryItemWrap}>
                          <View style={styles.categoryRow}>
                            <Text style={styles.categoryName}>
                              {icon} {category}
                            </Text>
                            <Text style={styles.categoryAmount}>₹{amount}</Text>
                          </View>
                          <LuxuryProgressBar progress={ratio} />
                        </View>
                      );
                    })
                  )}
                </View>
              </View>
            )}

            {/* TAB 2: LIVE ORDERS & MASTER OVERRIDE */}
            {activeTab === 'orders' && (
              <View style={styles.tabContent}>
                <View style={styles.ordersHeaderRow}>
                  <View style={styles.livePulseDot} />
                  <Text style={styles.sectionHeader}>
                    Active Kitchen Queue ({activeKitchenOrders.length} tickets in preparation)
                  </Text>
                </View>

                {activeKitchenOrders.length === 0 ? (
                  <View style={styles.emptyCard}>
                    <LuxuryEmblem icon="👨‍🍳" size={56} />
                    <Text style={styles.emptyTitle}>Kitchen Queue Clear</Text>
                    <Text style={styles.emptyText}>
                      No active tickets. New orders sent by waiters will appear here instantly.
                    </Text>
                  </View>
                ) : (
                  activeKitchenOrders.map((order) => (
                    <View key={order._id} style={[styles.orderCard, styles.orderCardActive]}>
                      {/* Brass Rail Order Clip */}
                      <LuxuryTicketClip
                        label={`KITCHEN TICKET #${order.orderNumber?.slice(-4) || 'LIVE'}`}
                        color={colors.primary}
                      />

                      <View style={styles.orderCardHeader}>
                        <View>
                          <Text style={styles.orderNumberTitle}>
                            Table {order.tableId?.tableNumber} • {order.orderNumber}
                          </Text>
                          <Text style={styles.orderMeta}>
                            Server: {order.waiterId?.name} • {new Date(order.createdAt).toLocaleTimeString()}
                          </Text>
                        </View>
                        <StatusBadge status={order.status} type="order" />
                      </View>

                      <View style={styles.orderItemsSnippet}>
                        {order.items.map((i, idx) => (
                          <View key={idx} style={styles.orderItemRow}>
                            <Text style={styles.orderItemText}>
                              • {i.quantity}× {i.name} (₹{i.price * i.quantity})
                            </Text>
                            {i.notes ? (
                              <Text style={styles.orderItemNote}>⚠️ Chef Instruction: "{i.notes}"</Text>
                            ) : null}
                          </View>
                        ))}
                      </View>

                      <View style={styles.orderCardFooter}>
                        <Text style={styles.orderTotalText}>Total: ₹{order.totalAmount}</Text>

                        <TouchableOpacity
                          style={styles.voidBtn}
                          onPress={() => handleVoidOrder(order)}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.voidBtnText}>⚡ Master Void Override</Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))
                )}

                <Text style={[styles.sectionHeader, { marginTop: 24 }]}>
                  Completed & Settled Receipts ({pastOrders.length})
                </Text>

                {pastOrders.map((order) => (
                  <View key={order._id} style={styles.orderCard}>
                    <View style={styles.orderCardHeader}>
                      <View>
                        <Text style={styles.orderNumberTitle}>{order.orderNumber}</Text>
                        <Text style={styles.orderMeta}>
                          Table {order.tableId?.tableNumber} • Server: {order.waiterId?.name}
                        </Text>
                      </View>
                      <StatusBadge status={order.status} type="order" />
                    </View>

                    <View style={styles.orderItemsSnippet}>
                      {order.items.map((i, idx) => (
                        <Text key={idx} style={styles.orderItemText}>
                          • {i.quantity}× {i.name} (₹{i.price * i.quantity})
                        </Text>
                      ))}
                    </View>

                    <View style={styles.orderCardFooter}>
                      <Text style={styles.orderTotalText}>Total: ₹{order.totalAmount}</Text>
                      {order.rejectionReason && (
                        <Text style={styles.rejectedReasonText}>
                          Note: {order.rejectionReason}
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {/* TAB 3: MENU MANAGEMENT */}
            {activeTab === 'menu' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Menu Offerings</Text>
                    <Text style={styles.sectionSubtitle}>{menuItems.length} courses cataloged</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAddBtn}
                    onPress={() => setMenuModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryAddBtnText}>+ Add Course</Text>
                  </TouchableOpacity>
                </View>

                {menuItems.map((item) => {
                  const catIcon = CATEGORY_ICONS[item.category] || '🍽️';
                  return (
                    <View key={item._id} style={styles.menuManageCard}>
                      <View style={styles.menuManageLeft}>
                        <View style={styles.dishHeaderRow}>
                          <Text style={styles.dishCategoryIcon}>{catIcon}</Text>
                          <Text style={styles.dishName}>{item.name}</Text>
                        </View>
                        <Text style={styles.dishCategory}>{item.category}</Text>
                        <Text style={styles.dishPrice}>₹{item.price}</Text>
                      </View>

                      <TouchableOpacity
                        style={[
                          styles.availToggleBtn,
                          item.isAvailable ? styles.availOn : styles.availOff,
                        ]}
                        onPress={() => handleToggleItemAvailability(item)}
                        activeOpacity={0.8}
                      >
                        <Text
                          style={[
                            styles.availToggleText,
                            item.isAvailable ? styles.availOnText : styles.availOffText,
                          ]}
                        >
                          {item.isAvailable ? 'In Stock' : '86 / Sold Out'}
                        </Text>
                      </TouchableOpacity>
                    </View>
                  );
                })}
              </View>
            )}

            {/* TAB 4: STAFF MANAGEMENT */}
            {activeTab === 'staff' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Staff Accounts</Text>
                    <Text style={styles.sectionSubtitle}>{staffList.length} authenticated personnel</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAddBtn}
                    onPress={() => setStaffModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryAddBtnText}>+ Add Staff Member</Text>
                  </TouchableOpacity>
                </View>

                {staffList.map((staff) => (
                  <View key={staff._id} style={styles.staffManageCard}>
                    <View style={styles.staffManageLeft}>
                      <View style={styles.staffAvatarBadge}>
                        <Text style={styles.staffAvatarInitial}>
                          {staff.name.charAt(0).toUpperCase()}
                        </Text>
                      </View>
                      <View>
                        <Text style={styles.staffNameText}>{staff.name}</Text>
                        <Text style={styles.staffRoleText}>Role: {staff.role}</Text>
                        <Text style={[styles.staffStatusText, { color: staff.isActive ? colors.available : colors.dirty }]}>
                          {staff.isActive ? '● Active In Service' : '○ Suspended'}
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={[styles.statusToggleBtn, staff.isActive && styles.statusDeactivate]}
                      onPress={() => handleToggleStaffStatus(staff)}
                      activeOpacity={0.8}
                    >
                      <Text style={[styles.statusToggleText, staff.isActive && styles.statusDeactivateText]}>
                        {staff.isActive ? 'Deactivate' : 'Activate'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}

            {/* TAB 5: TABLE MANAGEMENT */}
            {activeTab === 'tables' && (
              <View style={styles.tabContent}>
                <View style={styles.sectionTopBar}>
                  <View>
                    <Text style={styles.sectionHeader}>Dining Floor Tables</Text>
                    <Text style={styles.sectionSubtitle}>{tables.length} tables in salon</Text>
                  </View>
                  <TouchableOpacity
                    style={styles.primaryAddBtn}
                    onPress={() => setTableModalVisible(true)}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.primaryAddBtnText}>+ Add Table</Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.tablesListGrid}>
                  {tables.map((table) => (
                    <View key={table._id} style={styles.tableMiniCard}>
                      <Text style={styles.tableMiniIcon}>🪑</Text>
                      <Text style={styles.tableMiniNumber}>Table {table.tableNumber}</Text>
                      <Text style={styles.tableMiniCapacity}>Capacity: {table.capacity} Guests</Text>
                      <StatusBadge status={table.status} type="table" size="small" />
                    </View>
                  ))}
                </View>
              </View>
            )}
          </ScrollView>
        )}
      </LuxuryPatternBackground>

      {/* MODAL: ADD MENU ITEM */}
      <Modal visible={menuModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Add New Menu Offering</Text>
            <GoldDivider />

            <TextInput
              style={styles.formInput}
              placeholder="Course Name (e.g. Malai Kofta Royale)"
              placeholderTextColor={colors.textMuted}
              value={newMenuItem.name}
              onChangeText={(text) => setNewMenuItem({ ...newMenuItem, name: text })}
            />

            <Text style={styles.inputLabel}>Cuisine Category (No Tandoor):</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryPicker}>
              {ALLOWED_CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat}
                  style={[
                    styles.catSelectPill,
                    newMenuItem.category === cat && styles.catSelectPillActive,
                  ]}
                  onPress={() => setNewMenuItem({ ...newMenuItem, category: cat })}
                >
                  <Text
                    style={[
                      styles.catSelectText,
                      newMenuItem.category === cat && styles.catSelectTextActive,
                    ]}
                  >
                    {CATEGORY_ICONS[cat] || '🍽️'} {cat}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <TextInput
              style={styles.formInput}
              placeholder="Price (₹)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newMenuItem.price}
              onChangeText={(text) => setNewMenuItem({ ...newMenuItem, price: text })}
            />

            <TextInput
              style={[styles.formInput, { height: 60 }]}
              placeholder="Description (Optional chef notes)"
              placeholderTextColor={colors.textMuted}
              multiline
              value={newMenuItem.description}
              onChangeText={(text) => setNewMenuItem({ ...newMenuItem, description: text })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setMenuModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateMenuItem}
              >
                <Text style={styles.modalSubmitText}>Save Course</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD STAFF */}
      <Modal visible={staffModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Create Staff Account</Text>
            <GoldDivider />

            <TextInput
              style={styles.formInput}
              placeholder="Staff Full Name"
              placeholderTextColor={colors.textMuted}
              value={newStaff.name}
              onChangeText={(text) => setNewStaff({ ...newStaff, name: text })}
            />

            <Text style={styles.inputLabel}>Role Designation:</Text>
            <View style={styles.rolePickerRow}>
              {ROLES.map((role) => (
                <TouchableOpacity
                  key={role}
                  style={[
                    styles.roleSelectPill,
                    newStaff.role === role && styles.roleSelectPillActive,
                  ]}
                  onPress={() => setNewStaff({ ...newStaff, role })}
                >
                  <Text
                    style={[
                      styles.roleSelectText,
                      newStaff.role === role && styles.roleSelectTextActive,
                    ]}
                  >
                    {role}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              style={styles.formInput}
              placeholder="4-digit Security PIN"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              maxLength={4}
              value={newStaff.pin}
              onChangeText={(text) => setNewStaff({ ...newStaff, pin: text })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setStaffModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateStaff}
              >
                <Text style={styles.modalSubmitText}>Create Account</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* MODAL: ADD TABLE */}
      <Modal visible={tableModalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalCardTitle}>Add Dining Table</Text>
            <GoldDivider />

            <TextInput
              style={styles.formInput}
              placeholder="Table Number (e.g. 9)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newTable.tableNumber}
              onChangeText={(text) => setNewTable({ ...newTable, tableNumber: text })}
            />

            <TextInput
              style={styles.formInput}
              placeholder="Guest Capacity (e.g. 4)"
              placeholderTextColor={colors.textMuted}
              keyboardType="numeric"
              value={newTable.capacity}
              onChangeText={(text) => setNewTable({ ...newTable, capacity: text })}
            />

            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => setTableModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.modalSubmitBtn}
                onPress={handleCreateTable}
              >
                <Text style={styles.modalSubmitText}>Save Table</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  liveOrderBanner: {
    backgroundColor: colors.primaryLight,
    borderBottomWidth: 2,
    borderBottomColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  liveBannerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  livePulseDot: {
    width: 9,
    height: 9,
    borderRadius: 4.5,
    backgroundColor: colors.primary,
    marginRight: 8,
  },
  liveBannerTitle: {
    flex: 1,
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 14,
    letterSpacing: 0.5,
  },
  liveBannerClose: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    backgroundColor: '#FFFFFF',
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
  },
  liveBannerCloseText: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: '800',
  },
  liveBannerMeta: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    marginBottom: 6,
  },
  liveBannerItems: {
    gap: 3,
    marginBottom: 10,
    paddingLeft: 8,
  },
  liveBannerItemText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  liveBannerFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  liveBannerViewBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  liveBannerViewText: {
    color: '#FFFFFF',
    fontWeight: '900',
    fontSize: 12,
  },
  tabBarWrapper: {
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
    zIndex: 5,
  },
  tabBarScroll: {
    flexDirection: 'row',
    paddingHorizontal: 6,
  },
  tabItem: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  tabItemActive: {
    borderBottomColor: colors.primary,
  },
  tabText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  tabTextActive: {
    color: colors.primaryDark,
    fontWeight: '900',
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
  },
  tabContent: {
    gap: 16,
  },
  executiveHeaderBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1.5,
    borderColor: colors.cardBorderGold,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
  },
  executiveInsignia: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1.5,
  },
  executiveTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  metricCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 12,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  metricTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metricLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '800',
    flex: 1,
  },
  metricWatermarkBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  metricWatermarkIcon: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  metricValue: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
    marginVertical: 4,
  },
  metricSub: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },
  sectionBox: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  feedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  liveFeedItem: {
    paddingVertical: 12,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  liveFeedItemTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  liveFeedTable: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  liveFeedWaiter: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
    fontWeight: '800',
  },
  liveFeedItemsList: {
    marginTop: 6,
    gap: 2,
  },
  liveFeedItemText: {
    fontSize: 12,
    color: colors.textSecondary,
    fontWeight: '600',
  },
  categoryItemWrap: {
    marginBottom: 10,
  },
  categoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  categoryName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '800',
  },
  categoryAmount: {
    color: colors.textGold,
    fontSize: 14,
    fontWeight: '900',
  },
  emptyText: {
    color: colors.textMuted,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  emptyCard: {
    backgroundColor: '#FFFFFF',
    padding: 30,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
    marginTop: 12,
  },
  ordersHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionHeader: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.text,
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    marginBottom: 14,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  orderCardActive: {
    borderColor: colors.primary,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginTop: 8,
  },
  orderNumberTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  orderMeta: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '600',
  },
  orderItemsSnippet: {
    marginVertical: 12,
    gap: 4,
  },
  orderItemRow: {
    marginBottom: 2,
  },
  orderItemText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
  },
  orderItemNote: {
    color: colors.occupied,
    fontSize: 11,
    fontStyle: 'italic',
    marginLeft: 12,
    fontWeight: '700',
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: colors.cardBorder,
  },
  orderTotalText: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textGold,
  },
  rejectedReasonText: {
    fontSize: 11,
    color: colors.dirty,
    fontStyle: 'italic',
    fontWeight: '600',
  },
  voidBtn: {
    backgroundColor: colors.dirtyBg,
    borderWidth: 1.5,
    borderColor: colors.dirtyBorder,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
  },
  voidBtnText: {
    color: colors.dirty,
    fontSize: 11,
    fontWeight: '900',
  },
  sectionTopBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  primaryAddBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 6,
    elevation: 2,
  },
  primaryAddBtnText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 12,
  },
  menuManageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuManageLeft: {
    flex: 1,
  },
  dishHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dishCategoryIcon: {
    fontSize: 18,
  },
  dishName: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  dishCategory: {
    fontSize: 11,
    color: colors.textMuted,
    marginTop: 2,
    fontWeight: '700',
  },
  dishPrice: {
    fontSize: 14,
    fontWeight: '900',
    color: colors.textGold,
    marginTop: 2,
  },
  availToggleBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
  },
  availOn: {
    backgroundColor: colors.availableBg,
    borderColor: colors.availableBorder,
  },
  availOff: {
    backgroundColor: '#F1F5F9',
    borderColor: colors.cardBorderStrong,
  },
  availToggleText: {
    fontWeight: '900',
    fontSize: 11,
  },
  availOnText: {
    color: colors.available,
  },
  availOffText: {
    color: colors.textSecondary,
  },
  staffManageCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 14,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  staffManageLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  staffAvatarBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffAvatarInitial: {
    fontSize: 18,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  staffNameText: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  staffRoleText: {
    fontSize: 12,
    color: colors.textSecondary,
    marginTop: 2,
    fontWeight: '700',
  },
  staffStatusText: {
    fontSize: 11,
    fontWeight: '800',
    marginTop: 2,
  },
  statusToggleBtn: {
    backgroundColor: colors.availableBg,
    borderColor: colors.availableBorder,
    borderWidth: 1.5,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statusDeactivate: {
    backgroundColor: '#F1F5F9',
    borderColor: colors.cardBorderStrong,
  },
  statusToggleText: {
    color: colors.available,
    fontWeight: '900',
    fontSize: 11,
  },
  statusDeactivateText: {
    color: colors.textSecondary,
  },
  tablesListGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  tableMiniCard: {
    width: '31%',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    alignItems: 'center',
    gap: 4,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  tableMiniIcon: {
    fontSize: 22,
  },
  tableMiniNumber: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
  },
  tableMiniCapacity: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(15, 23, 42, 0.45)',
    justifyContent: 'center',
    padding: 20,
  },
  modalCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    padding: 24,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 6,
  },
  modalCardTitle: {
    fontSize: 20,
    fontWeight: '900',
    color: colors.text,
  },
  formInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 11,
    marginBottom: 14,
    fontSize: 14,
    fontWeight: '700',
  },
  inputLabel: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    marginBottom: 6,
  },
  categoryPicker: {
    flexGrow: 0,
    marginBottom: 14,
  },
  catSelectPill: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 16,
    backgroundColor: colors.bg,
    marginRight: 6,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  catSelectPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  catSelectText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '700',
  },
  catSelectTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  rolePickerRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  roleSelectPill: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    alignItems: 'center',
  },
  roleSelectPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  roleSelectText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  roleSelectTextActive: {
    color: '#FFF',
    fontWeight: '900',
  },
  modalBtnRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  modalCancelBtn: {
    flex: 1,
    backgroundColor: '#F1F5F9',
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  modalCancelText: {
    color: colors.textSecondary,
    fontWeight: '800',
  },
  modalSubmitBtn: {
    flex: 1,
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    paddingVertical: 13,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  modalSubmitText: {
    color: '#FFF',
    fontWeight: '900',
    fontSize: 14,
  },
});

export default AdminDashboard;
