/**
 * @file LuxuryPattern.js
 * @description Decorative luxury ornaments, geometric lattice patterns,
 * ambient champagne gold flourishes, brass ticket clips, and royal emblems for fine-dining aesthetic.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import colors from '../theme/colors';

/**
 * Background pattern overlay with subtle geometric diamond lattices,
 * ornamental corner brackets, and ambient champagne glow accents.
 */
export const LuxuryPatternBackground = ({ children }) => {
  return (
    <View style={styles.container}>
      {/* Ambient Champagne Gold Halos in corners */}
      <View style={[styles.glowOrb, styles.glowOrbTopLeft]} />
      <View style={[styles.glowOrb, styles.glowOrbTopRight]} />
      <View style={[styles.glowOrb, styles.glowOrbBottomRight]} />
      <View style={[styles.glowOrb, styles.glowOrbCenter]} />

      {/* Subtle Geometric Diamond Watermark Grid */}
      <View style={styles.patternGrid} pointerEvents="none">
        <View style={styles.patternRow}>
          <Text style={styles.patternSymbol}>◇</Text>
          <Text style={styles.patternSymbolSmall}>✦</Text>
          <Text style={styles.patternSymbol}>◆</Text>
          <Text style={styles.patternSymbolSmall}>✦</Text>
          <Text style={styles.patternSymbol}>◇</Text>
        </View>
        <View style={styles.patternRow}>
          <Text style={styles.patternSymbol}>◆</Text>
          <Text style={styles.patternSymbolSmall}>⚜</Text>
          <Text style={styles.patternSymbol}>◇</Text>
          <Text style={styles.patternSymbolSmall}>⚜</Text>
          <Text style={styles.patternSymbol}>◆</Text>
        </View>
        <View style={styles.patternRow}>
          <Text style={styles.patternSymbol}>◇</Text>
          <Text style={styles.patternSymbolSmall}>✦</Text>
          <Text style={styles.patternSymbol}>◆</Text>
          <Text style={styles.patternSymbolSmall}>✦</Text>
          <Text style={styles.patternSymbol}>◇</Text>
        </View>
        <View style={styles.patternRow}>
          <Text style={styles.patternSymbol}>◆</Text>
          <Text style={styles.patternSymbolSmall}>⚜</Text>
          <Text style={styles.patternSymbol}>◇</Text>
          <Text style={styles.patternSymbolSmall}>⚜</Text>
          <Text style={styles.patternSymbol}>◆</Text>
        </View>
      </View>

      {/* Decorative Outer Gold Hairline Border Frame */}
      <View style={styles.frameBorderTop} pointerEvents="none" />

      {/* Content wrapper */}
      <View style={styles.content}>{children}</View>
    </View>
  );
};

/**
 * Fine Brass Order Rail Ticket Clip.
 * Simulates a high-end restaurant brass clip rail with metallic rivets,
 * subtle drop shadow, and stitched perforated receipt edge.
 */
export const LuxuryTicketClip = ({ label = 'KITCHEN TICKET', color = colors.primary }) => {
  return (
    <View style={styles.ticketClipWrapper}>
      {/* Brass Rail Bar */}
      <View style={[styles.ticketBrassBar, { borderColor: color }]}>
        <View style={styles.brassRivet} />
        <View style={styles.clipCenterLabel}>
          <Text style={[styles.clipLabelText, { color }]}>✦ {label} ✦</Text>
        </View>
        <View style={styles.brassRivet} />
      </View>
      {/* Perforated ticket tear line */}
      <View style={styles.perforatedLine}>
        {Array.from({ length: 24 }).map((_, i) => (
          <View key={`perf-${i}`} style={styles.perfDot} />
        ))}
      </View>
    </View>
  );
};

/**
 * Royal Crest Emblem with double champagne gold rings.
 */
export const LuxuryEmblem = ({ icon = '👑', size = 44, bg = colors.primaryLight, border = colors.primary }) => {
  return (
    <View style={[styles.emblemOuter, { width: size, height: size, borderRadius: size / 2, borderColor: border, backgroundColor: bg }]}>
      <View style={[styles.emblemInner, { width: size - 8, height: size - 8, borderRadius: (size - 8) / 2, borderColor: border }]}>
        <Text style={[styles.emblemIcon, { fontSize: Math.floor(size * 0.44) }]}>{icon}</Text>
      </View>
    </View>
  );
};

/**
 * Elegant Golden Filigree Divider with centered diamond crest.
 */
export const GoldDivider = ({ label }) => {
  return (
    <View style={styles.dividerContainer}>
      <View style={styles.dividerLine} />
      <View style={styles.dividerCrest}>
        <Text style={styles.dividerDiamond}>✦</Text>
        {label ? <Text style={styles.dividerText}>{label}</Text> : null}
        <Text style={styles.dividerDiamond}>✦</Text>
      </View>
      <View style={styles.dividerLine} />
    </View>
  );
};

/**
 * Michelin-grade golden star rating flourish.
 */
export const MichelinStars = ({ count = 5 }) => {
  return (
    <View style={styles.starsRow}>
      {Array.from({ length: count }).map((_, i) => (
        <Text key={`star-${i}`} style={styles.star}>★</Text>
      ))}
    </View>
  );
};

/**
 * Luxury Champagne Gold Progress Bar with percentage display.
 */
export const LuxuryProgressBar = ({ progress = 0, label, totalLabel }) => {
  const clamped = Math.min(Math.max(progress, 0), 1);
  const percentage = Math.round(clamped * 100);

  return (
    <View style={styles.progressContainer}>
      {(label || totalLabel) && (
        <View style={styles.progressHeader}>
          <Text style={styles.progressLabel}>{label || 'Performance'}</Text>
          <Text style={styles.progressValue}>{totalLabel || `${percentage}%`}</Text>
        </View>
      )}
      <View style={styles.progressBarTrack}>
        <View style={[styles.progressBarFill, { width: `${percentage}%` }]} />
      </View>
    </View>
  );
};

/**
 * Ornate Banner for section headers.
 */
export const LuxurySectionHeader = ({ title, subtitle, icon }) => {
  return (
    <View style={styles.sectionHeaderContainer}>
      <View style={styles.sectionHeaderTopLine} />
      <View style={styles.sectionHeaderContent}>
        {icon ? <Text style={styles.sectionHeaderIcon}>{icon}</Text> : <Text style={styles.sectionHeaderDiamond}>✦</Text>}
        <View style={styles.sectionHeaderTextWrap}>
          <Text style={styles.sectionHeaderTitle}>{title}</Text>
          {subtitle ? <Text style={styles.sectionHeaderSubtitle}>{subtitle}</Text> : null}
        </View>
        <Text style={styles.sectionHeaderDiamond}>✦</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    position: 'relative',
    overflow: 'hidden',
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  frameBorderTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 2,
    backgroundColor: colors.primary,
    opacity: 0.5,
    zIndex: 10,
  },
  // Ambient Soft Glow Halos
  glowOrb: {
    position: 'absolute',
    borderRadius: 300,
    zIndex: 1,
    pointerEvents: 'none',
  },
  glowOrbTopLeft: {
    width: 280,
    height: 280,
    top: -80,
    left: -80,
    backgroundColor: 'rgba(217, 180, 110, 0.09)',
  },
  glowOrbTopRight: {
    width: 320,
    height: 320,
    top: -100,
    right: -100,
    backgroundColor: 'rgba(197, 160, 89, 0.08)',
  },
  glowOrbBottomRight: {
    width: 360,
    height: 360,
    bottom: -100,
    right: -80,
    backgroundColor: 'rgba(217, 180, 110, 0.07)',
  },
  glowOrbCenter: {
    width: 400,
    height: 400,
    top: '40%',
    left: '25%',
    backgroundColor: 'rgba(245, 230, 200, 0.05)',
  },
  // Subtle Diamond Lattice Watermark
  patternGrid: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'space-around',
    paddingVertical: 30,
    zIndex: 1,
    opacity: 0.16,
  },
  patternRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 16,
    alignItems: 'center',
  },
  patternSymbol: {
    fontSize: 20,
    color: colors.primary,
    fontWeight: '300',
  },
  patternSymbolSmall: {
    fontSize: 12,
    color: colors.primaryDark,
    opacity: 0.8,
  },
  // Dividers
  dividerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 14,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: colors.cardBorder,
  },
  dividerCrest: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    gap: 6,
  },
  dividerDiamond: {
    color: colors.primary,
    fontSize: 10,
  },
  dividerText: {
    color: colors.primaryDark,
    fontSize: 10,
    fontWeight: '800',
    textTransform: 'uppercase',
    letterSpacing: 1.5,
  },
  starsRow: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    marginVertical: 4,
  },
  star: {
    color: colors.primary,
    fontSize: 12,
  },
  // Ticket Clip
  ticketClipWrapper: {
    marginBottom: 8,
  },
  ticketBrassBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F8FAFC',
    borderWidth: 1.5,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 1,
  },
  brassRivet: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.primary,
    borderWidth: 1,
    borderColor: colors.primaryDark,
  },
  clipCenterLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  clipLabelText: {
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 1.2,
    textTransform: 'uppercase',
  },
  perforatedLine: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
    paddingHorizontal: 4,
  },
  perfDot: {
    width: 4,
    height: 1.5,
    backgroundColor: colors.cardBorderStrong,
    borderRadius: 1,
  },
  // Emblem
  emblemOuter: {
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  emblemInner: {
    borderWidth: 1,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  emblemIcon: {
    textAlign: 'center',
  },
  // Progress Bar
  progressContainer: {
    marginVertical: 6,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: colors.textSecondary,
  },
  progressValue: {
    fontSize: 12,
    fontWeight: '900',
    color: colors.primaryDark,
  },
  progressBarTrack: {
    height: 8,
    backgroundColor: colors.cardBorder,
    borderRadius: 4,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.cardBorderStrong,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.primary,
    borderRadius: 3,
  },
  // Section Header
  sectionHeaderContainer: {
    marginVertical: 12,
  },
  sectionHeaderTopLine: {
    height: 1.5,
    backgroundColor: colors.cardBorder,
    marginBottom: 8,
  },
  sectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
  },
  sectionHeaderIcon: {
    fontSize: 18,
    marginRight: 8,
  },
  sectionHeaderDiamond: {
    color: colors.primary,
    fontSize: 12,
  },
  sectionHeaderTextWrap: {
    flex: 1,
  },
  sectionHeaderTitle: {
    fontSize: 16,
    fontWeight: '900',
    color: colors.text,
    letterSpacing: 0.5,
  },
  sectionHeaderSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '600',
    marginTop: 1,
  },
});
