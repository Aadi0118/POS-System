/**
 * @file WaiterDashboard.js
 * @description Haute Cuisine POS Terminal for Waiters.
 * Features:
 * - Luxury pattern background with ambient champagne halos.
 * - Architectural table layout with guest seating indicators and jewel status borders.
 * - Cuisine category carousel with culinary icon badges.
 * - Itemized dining slip with brass order rail clip, custom chef notes, and grand total calculation.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Modal,
  TextInput,
  Alert,
  StyleSheet,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import apiClient from '../api/client';
import { getSocket } from '../api/socket';
import Header from '../components/Header';
import StatusBadge from '../components/StatusBadge';
import {
  LuxuryPatternBackground,
  GoldDivider,
  LuxuryTicketClip,
  MichelinStars,
} from '../components/LuxuryPattern';
import colors from '../theme/colors';

const CATEGORY_ICONS = {
  All: '🍽️',
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

const WaiterDashboard = () => {
  const [tables, setTables] = useState([]);
  const [menuItems, setMenuItems] = useState([]);
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Active table interaction modal
  const [selectedTable, setSelectedTable] = useState(null);
  const [activeOrder, setActiveOrder] = useState(null);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [modalViewMode, setModalViewMode] = useState('catalog'); // 'catalog' | 'slip'

  // Cart for new or updated orders
  const [cart, setCart] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchInitialData();
    setupSocketListeners();
  }, []);

  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [tablesRes, menuRes] = await Promise.all([
        apiClient.get('/tables'),
        apiClient.get('/menu?availableOnly=true'),
      ]);

      if (tablesRes.data.success) {
        setTables(tablesRes.data.data);
      }
      if (menuRes.data.success) {
        setMenuItems(menuRes.data.data);
        const uniqueCats = ['All', ...new Set(menuRes.data.data.map((m) => m.category))];
        setCategories(uniqueCats);
      }
    } catch (err) {
      console.error('[Waiter POS Error]', err);
    } finally {
      setLoading(false);
    }
  };

  const setupSocketListeners = async () => {
    const socket = await getSocket();

    socket.on('table:status_updated', (data) => {
      setTables((prev) =>
        prev.map((t) => (t._id === data.tableId ? { ...t, status: data.status, currentOrderId: data.currentOrderId || null } : t))
      );
    });

    socket.on('order:status_updated', (updatedOrder) => {
      setActiveOrder((prev) => (prev && prev._id === updatedOrder._id ? updatedOrder : prev));
      setTables((prev) =>
        prev.map((t) => {
          if (t.currentOrderId && t.currentOrderId._id === updatedOrder._id) {
            return { ...t, currentOrderId: updatedOrder };
          }
          return t;
        })
      );
    });

    return () => {
      socket.off('table:status_updated');
      socket.off('order:status_updated');
    };
  };

  const handleTablePress = (table) => {
    setSelectedTable(table);
    setSearchQuery('');
    if (table.status === 'Dirty') {
      Alert.alert(
        'Table Requires Sanitation',
        `Table ${table.tableNumber} is awaiting cleaning by housekeeping staff.`
      );
      return;
    }

    if (table.status === 'Occupied' && table.currentOrderId) {
      setActiveOrder(table.currentOrderId);
      setCart(
        table.currentOrderId.items.map((item) => ({
          menuItemId: item.menuItemId._id || item.menuItemId,
          name: item.name,
          price: item.price,
          quantity: item.quantity,
          notes: item.notes || '',
        }))
      );
      setModalViewMode('slip');
    } else {
      setActiveOrder(null);
      setCart([]);
      setModalViewMode('catalog');
    }

    setOrderModalVisible(true);
  };

  const addToCart = (menuItem) => {
    if (activeOrder && activeOrder.status !== 'Pending') {
      Alert.alert(
        'Kitchen In Preparation',
        `The kitchen has already ${activeOrder.status.toLowerCase()} this order. Additional items must be placed on a new ticket.`
      );
      return;
    }

    setCart((prev) => {
      const existing = prev.find((i) => i.menuItemId === menuItem._id);
      if (existing) {
        return prev.map((i) =>
          i.menuItemId === menuItem._id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [
        ...prev,
        {
          menuItemId: menuItem._id,
          name: menuItem.name,
          price: menuItem.price,
          quantity: 1,
          notes: '',
        },
      ];
    });
  };

  const updateQuantity = (menuItemId, delta) => {
    if (activeOrder && activeOrder.status !== 'Pending') {
      Alert.alert('Action Prohibited', 'Cannot modify items once the kitchen has accepted the ticket.');
      return;
    }

    setCart((prev) =>
      prev
        .map((i) => {
          if (i.menuItemId === menuItemId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean)
    );
  };

  const updateItemNotes = (menuItemId, notes) => {
    if (activeOrder && activeOrder.status !== 'Pending') return;
    setCart((prev) =>
      prev.map((i) => (i.menuItemId === menuItemId ? { ...i, notes } : i))
    );
  };

  const calculateTotal = () => {
    return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  };

  const handleSendToKitchen = async () => {
    if (cart.length === 0) {
      Alert.alert('Empty Ticket', 'Please select at least one course before sending to the kitchen.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (activeOrder) {
        const res = await apiClient.put(`/orders/${activeOrder._id}/items`, {
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        });
        if (res.data.success) {
          Alert.alert('Ticket Updated', 'Course modifications dispatched to kitchen!');
          setOrderModalVisible(false);
          fetchInitialData();
        }
      } else {
        const res = await apiClient.post('/orders', {
          tableId: selectedTable._id,
          items: cart.map((i) => ({
            menuItemId: i.menuItemId,
            quantity: i.quantity,
            notes: i.notes,
          })),
        });
        if (res.data.success) {
          Alert.alert('Dispatched to Kitchen', 'Ticket delivered to Cook KDS & Admin in real-time!');
          setOrderModalVisible(false);
          fetchInitialData();
        }
      }
    } catch (err) {
      Alert.alert('Order Error', err.response?.data?.error || 'Failed to dispatch order.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!activeOrder) return;

    Alert.alert(
      'Settle Dining Bill',
      `Collect ₹${activeOrder.totalAmount} for Table ${selectedTable.tableNumber}? Table will be designated for cleaning.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Payment Received',
          style: 'default',
          onPress: async () => {
            setIsSubmitting(true);
            try {
              const res = await apiClient.patch(`/orders/${activeOrder._id}/pay`);
              if (res.data.success) {
                Alert.alert(
                  'Bill Settled',
                  `Payment recorded. Table ${selectedTable.tableNumber} is now marked for housekeeping.`
                );
                setOrderModalVisible(false);
                fetchInitialData();
              }
            } catch (err) {
              Alert.alert('Payment Error', err.response?.data?.error || 'Failed to finalize bill.');
            } finally {
              setIsSubmitting(false);
            }
          },
        },
      ]
    );
  };

  const filteredMenuItems = menuItems.filter((item) => {
    const query = searchQuery.trim().toLowerCase();
    if (query) {
      const matchName = item.name && item.name.toLowerCase().includes(query);
      const matchCat = item.category && item.category.toLowerCase().includes(query);
      const matchDesc = item.description && item.description.toLowerCase().includes(query);
      return matchName || matchCat || matchDesc;
    }
    return selectedCategory === 'All' || item.category === selectedCategory;
  });

  const isOrderLocked = activeOrder && activeOrder.status !== 'Pending';
  const occupiedCount = tables.filter((t) => t.status === 'Occupied').length;

  return (
    <View style={styles.container}>
      <Header title="Dining Salon" subtitle="Floor Service & Floor Plan" />

      <LuxuryPatternBackground>
        {/* Floor Salon Ribbon */}
        <View style={styles.floorBanner}>
          <View style={styles.floorBannerLeft}>
            <Text style={styles.floorInsignia}>⚜️ SALON PRINCIPAL • FLOOR SERVICE ⚜️</Text>
            <Text style={styles.floorTitle}>Seating & Hospitality Grid</Text>
          </View>
          <View style={styles.activeGuestBadge}>
            <Text style={styles.activeGuestText}>{occupiedCount} Active Salon{occupiedCount !== 1 ? 's' : ''}</Text>
          </View>
        </View>

        {loading ? (
          <View style={styles.loaderCenter}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.loaderText}>Curating dining salon...</Text>
          </View>
        ) : (
          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Status Legend */}
            <View style={styles.legendContainer}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.available }]} />
                <Text style={styles.legendText}>Available</Text>
              </View>
              <View style={styles.legendDivider} />
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.occupied }]} />
                <Text style={styles.legendText}>Occupied</Text>
              </View>
              <View style={styles.legendDivider} />
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: colors.dirty }]} />
                <Text style={styles.legendText}>Sanitation</Text>
              </View>
            </View>

            {/* Table Grid */}
            <View style={styles.tableGrid}>
              {tables.map((table) => {
                const hasOrder = table.status === 'Occupied' && table.currentOrderId;
                return (
                  <TouchableOpacity
                    key={table._id}
                    style={[
                      styles.tableCard,
                      table.status === 'Available' && styles.tableAvailable,
                      table.status === 'Occupied' && styles.tableOccupied,
                      table.status === 'Dirty' && styles.tableDirty,
                    ]}
                    onPress={() => handleTablePress(table)}
                    activeOpacity={0.8}
                  >
                    {/* Top status indicator strip */}
                    <View
                      style={[
                        styles.tableTopStrip,
                        table.status === 'Available' && { backgroundColor: colors.available },
                        table.status === 'Occupied' && { backgroundColor: colors.occupied },
                        table.status === 'Dirty' && { backgroundColor: colors.dirty },
                      ]}
                    />

                    <View style={styles.tableCardInner}>
                      <View style={styles.tableHeader}>
                        <View style={styles.tableTitleRow}>
                          <Text style={styles.tableNumber}>Table {table.tableNumber}</Text>
                        </View>
                        <StatusBadge status={table.status} type="table" size="small" />
                      </View>

                      {/* Guest seating count */}
                      <View style={styles.capacityBadge}>
                        <Text style={styles.tableCapacity}>🪑 {table.capacity} Guest Salon</Text>
                      </View>

                      {hasOrder ? (
                        <View style={styles.orderSnippet}>
                          <Text style={styles.orderAmount}>₹{table.currentOrderId.totalAmount}</Text>
                          <StatusBadge
                            status={table.currentOrderId.status}
                            type="order"
                            size="small"
                          />
                        </View>
                      ) : (
                        <View style={styles.emptySnippet}>
                          <Text style={styles.emptyText}>
                            {table.status === 'Dirty' ? 'Needs Clean' : '✦ Ready for Seating'}
                          </Text>
                        </View>
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          </ScrollView>
        )}
      </LuxuryPatternBackground>

      {/* ORDER & BILLING MODAL */}
      <Modal
        visible={orderModalVisible}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setOrderModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          {/* Modal Header */}
          <View style={styles.modalHeader}>
            <View>
              <Text style={styles.modalTitle}>
                Table {selectedTable?.tableNumber} Service
              </Text>
              {activeOrder ? (
                <Text style={styles.modalSubtitle}>
                  Order #{activeOrder.orderNumber} • Status: {activeOrder.status}
                </Text>
              ) : (
                <Text style={styles.modalSubtitle}>✦ New Dining Ticket ✦</Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.closeBtn}
              onPress={() => setOrderModalVisible(false)}
              activeOpacity={0.7}
            >
              <Text style={styles.closeBtnText}>✕ Close</Text>
            </TouchableOpacity>
          </View>

          {/* Kitchen Locked Banner */}
          {isOrderLocked && (
            <View style={styles.lockedBanner}>
              <Text style={styles.lockedBannerText}>
                🔒 Kitchen Status: '{activeOrder.status}'. Courses are currently in chef preparation.
              </Text>
            </View>
          )}

          {/* Modal Tab Switcher */}
          <View style={styles.modalTabSwitcher}>
            <TouchableOpacity
              style={[
                styles.modalTabBtn,
                modalViewMode === 'catalog' && styles.modalTabBtnActive,
              ]}
              onPress={() => setModalViewMode('catalog')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modalTabBtnText,
                  modalViewMode === 'catalog' && styles.modalTabBtnTextActive,
                ]}
              >
                🍲 Menu Catalog ({filteredMenuItems.length})
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.modalTabBtn,
                modalViewMode === 'slip' && styles.modalTabBtnActive,
              ]}
              onPress={() => setModalViewMode('slip')}
              activeOpacity={0.8}
            >
              <Text
                style={[
                  styles.modalTabBtnText,
                  modalViewMode === 'slip' && styles.modalTabBtnTextActive,
                ]}
              >
                📜 Dining Slip ({cart.length})
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.modalBody}>
            {modalViewMode === 'catalog' ? (
              /* Catalog Section */
              <View style={styles.catalogSection}>
                {/* Waiter Real-Time Search Bar */}
                <View style={styles.searchBarWrapper}>
                  <View style={styles.searchBarContainer}>
                    <Text style={styles.searchBarIcon}>🔍</Text>
                    <TextInput
                      style={styles.searchBarInput}
                      placeholder={
                        menuItems.length > 0
                          ? `Search ${menuItems.length} dishes (e.g. Paratha, Chai)...`
                          : 'Search menu dishes...'
                      }
                      placeholderTextColor={colors.textMuted}
                      value={searchQuery}
                      onChangeText={setSearchQuery}
                      autoCorrect={false}
                      autoCapitalize="none"
                      returnKeyType="search"
                      clearButtonMode="while-editing"
                    />
                    {searchQuery.length > 0 && (
                      <TouchableOpacity
                        style={styles.searchClearBtn}
                        onPress={() => setSearchQuery('')}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.searchClearBtnText}>✕</Text>
                      </TouchableOpacity>
                    )}
                  </View>

                  {/* Search Metadata & Quick Reset */}
                  {searchQuery.trim().length > 0 && (
                    <View style={styles.searchStatusRow}>
                      <Text style={styles.searchStatusText}>
                        Found {filteredMenuItems.length} dish{filteredMenuItems.length !== 1 ? 'es' : ''} for "{searchQuery}"
                      </Text>
                      <TouchableOpacity
                        style={styles.searchResetLink}
                        onPress={() => setSearchQuery('')}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={styles.searchResetLinkText}>Clear Search ✕</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Category Carousel (displayed when not actively searching) */}
                {!searchQuery.trim() && (
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.catScroll}>
                    {categories.map((cat) => (
                      <TouchableOpacity
                        key={cat}
                        style={[
                          styles.catPill,
                          selectedCategory === cat && styles.catPillActive,
                        ]}
                        onPress={() => setSelectedCategory(cat)}
                        activeOpacity={0.75}
                      >
                        <Text style={styles.catIcon}>{CATEGORY_ICONS[cat] || '🍲'}</Text>
                        <Text
                          style={[
                            styles.catPillText,
                            selectedCategory === cat && styles.catPillTextActive,
                          ]}
                        >
                          {cat}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}

                {/* Items List */}
                <FlatList
                  data={filteredMenuItems}
                  keyExtractor={(item) => item._id}
                  showsVerticalScrollIndicator={false}
                  keyboardShouldPersistTaps="handled"
                  contentContainerStyle={{ paddingBottom: cart.length > 0 ? 80 : 20 }}
                  ListEmptyComponent={
                    <View style={styles.emptySearchContainer}>
                      <Text style={styles.emptySearchEmoji}>🔍🍲</Text>
                      <Text style={styles.emptySearchTitle}>No Dishes Found</Text>
                      <Text style={styles.emptySearchSubtitle}>
                        {searchQuery.trim()
                          ? `No menu courses match "${searchQuery}". Please check the dish name or tap below to browse all items.`
                          : 'No menu items available in this category.'}
                      </Text>
                      {searchQuery.trim().length > 0 ? (
                        <TouchableOpacity
                          style={styles.emptySearchActionBtn}
                          onPress={() => {
                            setSearchQuery('');
                            setSelectedCategory('All');
                          }}
                          activeOpacity={0.8}
                        >
                          <Text style={styles.emptySearchActionText}>Show All Dishes ({menuItems.length})</Text>
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  }
                  renderItem={({ item }) => (
                    <View style={styles.menuItemCard}>
                      <View style={styles.menuItemInfo}>
                        <View style={styles.dishTitleRow}>
                          <Text style={styles.dishCategoryTag}>{item.category}</Text>
                          <Text style={styles.menuItemName}>{item.name}</Text>
                        </View>
                        {item.description ? (
                          <Text style={styles.dishDescription} numberOfLines={2}>
                            {item.description}
                          </Text>
                        ) : null}
                        <Text style={styles.menuItemPrice}>₹{item.price}</Text>
                      </View>
                      <TouchableOpacity
                        style={[styles.addBtn, isOrderLocked && styles.disabledBtn]}
                        onPress={() => addToCart(item)}
                        disabled={isOrderLocked}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.addBtnText}>+ Add Course</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                />

                {/* Floating Quick Slip Banner */}
                {cart.length > 0 && (
                  <TouchableOpacity
                    style={styles.floatingSlipBar}
                    onPress={() => setModalViewMode('slip')}
                    activeOpacity={0.9}
                  >
                    <View style={styles.floatingSlipLeft}>
                      <Text style={styles.floatingSlipCount}>
                        🛒 {cart.reduce((a, b) => a + b.quantity, 0)} Courses
                      </Text>
                      <Text style={styles.floatingSlipTotal}>₹{calculateTotal()}</Text>
                    </View>
                    <Text style={styles.floatingSlipAction}>Review Slip & Send →</Text>
                  </TouchableOpacity>
                )}
              </View>
            ) : (
              /* Cart / Slip Section */
              <View style={styles.cartSection}>
                {/* Brass Ticket Clip for Slip */}
                <LuxuryTicketClip
                  label={`SALON TABLE ${selectedTable?.tableNumber || '?'} SLIP`}
                  color={colors.primary}
                />

                <View style={styles.cartTitleRow}>
                  <Text style={styles.cartTitle}>Dining Ticket Slip</Text>
                  <TouchableOpacity
                    style={styles.addMorePill}
                    onPress={() => setModalViewMode('catalog')}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addMorePillText}>+ Add Courses</Text>
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.cartScroll} showsVerticalScrollIndicator={false}>
                  {cart.length === 0 ? (
                    <View style={styles.emptyCartBox}>
                      <Text style={styles.emptyCartIcon}>📜</Text>
                      <Text style={styles.emptyCartText}>No courses selected yet.</Text>
                      <Text style={styles.emptyCartSub}>Select dishes from the menu catalog.</Text>
                      <TouchableOpacity
                        style={styles.browseMenuBtn}
                        onPress={() => setModalViewMode('catalog')}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.browseMenuBtnText}>Browse Menu Catalog →</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    cart.map((item) => (
                      <View key={item.menuItemId} style={styles.cartItemRow}>
                        <View style={styles.cartItemLeft}>
                          <Text style={styles.cartItemName}>{item.name}</Text>
                          <Text style={styles.cartItemSub}>₹{item.price} × {item.quantity} = ₹{item.price * item.quantity}</Text>
                          <TextInput
                            style={styles.notesInput}
                            placeholder="Special chef notes (e.g. less spicy)..."
                            placeholderTextColor={colors.textMuted}
                            value={item.notes}
                            onChangeText={(text) => updateItemNotes(item.menuItemId, text)}
                            editable={!isOrderLocked}
                          />
                        </View>

                        {!isOrderLocked && (
                          <View style={styles.qtyControls}>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => updateQuantity(item.menuItemId, -1)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.qtyBtnText}>-</Text>
                            </TouchableOpacity>
                            <Text style={styles.qtyText}>{item.quantity}</Text>
                            <TouchableOpacity
                              style={styles.qtyBtn}
                              onPress={() => updateQuantity(item.menuItemId, 1)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.qtyBtnText}>+</Text>
                            </TouchableOpacity>
                          </View>
                        )}
                      </View>
                    ))
                  )}
                </ScrollView>

                {/* Summary & Checkout */}
                <View style={styles.summaryBox}>
                  <View style={styles.totalRow}>
                    <Text style={styles.totalLabel}>Grand Bill Total:</Text>
                    <Text style={styles.totalAmountText}>₹{calculateTotal()}</Text>
                  </View>

                  <View style={styles.actionButtonsRow}>
                    {!isOrderLocked && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.dispatchBtn]}
                        onPress={handleSendToKitchen}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                      >
                        {isSubmitting ? (
                          <ActivityIndicator color="#FFF" size="small" />
                        ) : (
                          <Text style={styles.actionBtnText}>🚀 Dispatch to Kitchen</Text>
                        )}
                      </TouchableOpacity>
                    )}

                    {activeOrder && (
                      <TouchableOpacity
                        style={[styles.actionBtn, styles.payBtn]}
                        onPress={handleProcessPayment}
                        disabled={isSubmitting}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.actionBtnText}>💳 Settle Bill</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </View>
            )}
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
  floorBanner: {
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
  floorBannerLeft: {
    flex: 1,
  },
  floorInsignia: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.primaryDark,
    letterSpacing: 1.5,
  },
  floorTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    marginTop: 2,
  },
  activeGuestBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  activeGuestText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },
  scrollContent: {
    padding: 12,
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
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  legendDivider: {
    width: 1,
    height: 16,
    backgroundColor: colors.cardBorder,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  tableGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
  },
  tableCard: {
    width: '48%',
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
    overflow: 'hidden',
  },
  tableTopStrip: {
    height: 4,
    width: '100%',
  },
  tableCardInner: {
    padding: 12,
  },
  tableAvailable: {
    borderColor: colors.availableBorder,
  },
  tableOccupied: {
    borderColor: colors.occupiedBorder,
  },
  tableDirty: {
    borderColor: colors.dirtyBorder,
    backgroundColor: colors.dirtyBg,
  },
  tableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  tableTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableNumber: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
  },
  capacityBadge: {
    backgroundColor: colors.bg,
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    marginBottom: 12,
    borderWidth: 1.5,
    borderColor: colors.cardBorder,
  },
  tableCapacity: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '700',
  },
  orderSnippet: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
    paddingTop: 10,
    borderTopWidth: 1.5,
    borderTopColor: colors.cardBorder,
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textGold,
  },
  emptySnippet: {
    marginTop: 6,
  },
  emptyText: {
    fontSize: 11,
    color: colors.textMuted,
    fontWeight: '600',
  },

  // Modal styles
  modalContainer: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 3,
  },
  modalTitle: {
    fontSize: 19,
    fontWeight: '900',
    color: colors.text,
  },
  modalSubtitle: {
    fontSize: 12,
    color: colors.primaryDark,
    marginTop: 2,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  closeBtn: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  closeBtnText: {
    color: colors.textSecondary,
    fontWeight: '800',
    fontSize: 12,
  },
  lockedBanner: {
    backgroundColor: colors.occupiedBg,
    padding: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.occupiedBorder,
  },
  lockedBannerText: {
    color: colors.occupied,
    fontSize: 12,
    fontWeight: '800',
    textAlign: 'center',
  },
  modalTabSwitcher: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  modalTabBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderBottomWidth: 2.5,
    borderBottomColor: 'transparent',
  },
  modalTabBtnActive: {
    borderBottomColor: colors.primary,
    backgroundColor: colors.primaryLight,
  },
  modalTabBtnText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.textSecondary,
  },
  modalTabBtnTextActive: {
    color: colors.primaryDark,
    fontWeight: '900',
  },
  modalBody: {
    flex: 1,
  },
  catalogSection: {
    flex: 1,
    paddingHorizontal: 14,
    paddingTop: 12,
    backgroundColor: colors.bg,
    position: 'relative',
  },
  searchBarWrapper: {
    marginBottom: 10,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 6,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  searchBarIcon: {
    fontSize: 16,
    marginRight: 8,
  },
  searchBarInput: {
    flex: 1,
    fontSize: 14,
    color: colors.textPrimary,
    fontWeight: '600',
    paddingVertical: 4,
  },
  searchClearBtn: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  searchClearBtnText: {
    fontSize: 13,
    fontWeight: '900',
    color: colors.textSecondary,
    lineHeight: 14,
  },
  searchStatusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  searchStatusText: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.goldDark,
  },
  searchResetLink: {
    paddingVertical: 2,
    paddingHorizontal: 6,
  },
  searchResetLinkText: {
    fontSize: 12,
    fontWeight: '800',
    color: colors.primary,
    textDecorationLine: 'underline',
  },
  emptySearchContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
    paddingHorizontal: 20,
  },
  emptySearchEmoji: {
    fontSize: 42,
    marginBottom: 10,
  },
  emptySearchTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.textPrimary,
    marginBottom: 6,
  },
  emptySearchSubtitle: {
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 18,
    marginBottom: 16,
  },
  emptySearchActionBtn: {
    backgroundColor: colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  emptySearchActionText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  catScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  catPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    marginRight: 8,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  catIcon: {
    fontSize: 14,
  },
  catPillActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primaryDark,
  },
  catPillText: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: '800',
  },
  catPillTextActive: {
    color: '#FFFFFF',
  },
  menuItemCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 16,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: colors.cardBorderStrong,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  menuItemInfo: {
    flex: 1,
    marginRight: 10,
  },
  dishTitleRow: {
    gap: 2,
  },
  dishCategoryTag: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  menuItemName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  dishDescription: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
  },
  menuItemPrice: {
    color: colors.textGold,
    fontSize: 15,
    fontWeight: '900',
    marginTop: 4,
  },
  addBtn: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  disabledBtn: {
    opacity: 0.3,
  },
  addBtnText: {
    color: colors.primaryDark,
    fontWeight: '900',
    fontSize: 12,
  },

  floatingSlipBar: {
    position: 'absolute',
    bottom: 14,
    left: 14,
    right: 14,
    backgroundColor: colors.primary,
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    shadowColor: colors.primaryDark,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  floatingSlipLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  floatingSlipCount: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '800',
  },
  floatingSlipTotal: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
  floatingSlipAction: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  addMorePill: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  addMorePillText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  browseMenuBtn: {
    backgroundColor: colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    marginTop: 12,
  },
  browseMenuBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },

  cartSection: {
    flex: 1,
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderTopWidth: 2,
    borderTopColor: colors.cardBorderStrong,
  },
  cartTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  cartTitle: {
    fontSize: 15,
    fontWeight: '900',
    color: colors.text,
  },
  itemCountBadge: {
    backgroundColor: colors.primaryLight,
    borderWidth: 1.5,
    borderColor: colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  itemCountText: {
    color: colors.primaryDark,
    fontSize: 11,
    fontWeight: '800',
  },
  cartScroll: {
    flex: 1,
  },
  emptyCartBox: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 30,
  },
  emptyCartIcon: {
    fontSize: 32,
    marginBottom: 6,
  },
  emptyCartText: {
    color: colors.text,
    fontWeight: '700',
    fontSize: 14,
  },
  emptyCartSub: {
    color: colors.textMuted,
    fontSize: 12,
    marginTop: 4,
  },
  cartItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1.5,
    borderBottomColor: colors.cardBorder,
  },
  cartItemLeft: {
    flex: 1,
    marginRight: 10,
  },
  cartItemName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
  },
  cartItemSub: {
    color: colors.textSecondary,
    fontSize: 11,
    marginTop: 2,
    fontWeight: '700',
  },
  notesInput: {
    backgroundColor: colors.bg,
    color: colors.text,
    fontSize: 11,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginTop: 4,
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    borderColor: colors.cardBorderStrong,
  },
  qtyBtnText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '900',
  },
  qtyText: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '900',
    minWidth: 16,
    textAlign: 'center',
  },
  summaryBox: {
    paddingTop: 12,
    borderTopWidth: 1.5,
    borderTopColor: colors.cardBorder,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  totalLabel: {
    color: colors.textSecondary,
    fontSize: 15,
    fontWeight: '800',
  },
  totalAmountText: {
    color: colors.primaryDark,
    fontSize: 22,
    fontWeight: '900',
  },
  actionButtonsRow: {
    flexDirection: 'row',
    gap: 10,
  },
  actionBtn: {
    flex: 1,
    paddingVertical: 13,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dispatchBtn: {
    backgroundColor: colors.primary,
    borderWidth: 1.5,
    borderColor: colors.primaryDark,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  payBtn: {
    backgroundColor: colors.available,
    borderWidth: 1.5,
    borderColor: colors.availableBorder,
    shadowColor: colors.available,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  actionBtnText: {
    color: '#FFF',
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0.5,
  },
});

export default WaiterDashboard;
