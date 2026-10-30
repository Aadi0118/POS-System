/**
 * @file colors.js
 * @description White & Luxury Fine-Dining Palette with High-Definition, Visible Borders.
 * Employs a soft slate-tinted canvas (#F1F5F9) so pure white (#FFFFFF) cards pop with
 * razor-sharp, visible borders (#CBD5E1 and #94A3B8) and champagne gold accents.
 */

const colors = {
  // Base Canvas & Surfaces
  bg: '#F1F5F9', // Elegant soft marble canvas (creates sharp contrast with pure white cards)
  bgAlt: '#E2E8F0',
  cardBg: '#FFFFFF', // Crisp pure white
  cardBgHover: '#F8FAFC',

  // High-Definition, Visible Borders (Prevents blending into the background)
  cardBorder: '#CBD5E1', // Visible medium border (Slate 300)
  cardBorderStrong: '#94A3B8', // High-contrast border (Slate 400)
  cardBorderGold: '#C5A059', // Champagne gold border

  // Luxury Accents (Champagne Gold / Imperial Cognac)
  primary: '#C5A059', // Champagne Gold / Royal Brass
  primaryDark: '#9A7B38', // Deep burnished gold
  primaryLight: '#FDF8ED', // Silky champagne tinted cream
  primaryBorder: '#D4AF37', // Visible gold border

  secondary: '#0F172A', // Deep obsidian black-navy
  secondaryLight: '#334155',

  // Status Colors & High-Contrast Borders
  available: '#059669', // Emerald jewel
  availableBg: '#ECFDF5',
  availableBorder: '#10B981', // Crisp visible emerald border

  occupied: '#D97706', // Warm cognac amber
  occupiedBg: '#FFFBEB',
  occupiedBorder: '#F59E0B', // Crisp visible amber border

  dirty: '#E11D48', // Rich ruby rose
  dirtyBg: '#FFF1F2',
  dirtyBorder: '#EF4444', // Crisp visible ruby border

  pending: '#D97706',
  pendingBg: '#FFFBEB',
  pendingBorder: '#F59E0B',

  accepted: '#2563EB', // Royal sapphire blue
  acceptedBg: '#EFF6FF',
  acceptedBorder: '#3B82F6', // Crisp visible sapphire border

  ready: '#059669',
  readyBg: '#ECFDF5',
  readyBorder: '#10B981',

  completed: '#64748B',
  completedBg: '#F8FAFC',
  completedBorder: '#94A3B8',

  rejected: '#E11D48',
  rejectedBg: '#FFF1F2',
  rejectedBorder: '#EF4444',

  // Typography
  text: '#0F172A', // Obsidian charcoal
  textSecondary: '#475569', // Refined slate
  textMuted: '#64748B',
  textGold: '#B48A3C',
  textInverse: '#FFFFFF',

  // Keypad & Controls
  keypadBg: '#FFFFFF',
  keypadText: '#0F172A',
  keypadActive: '#F1F5F9',
  keypadBorder: '#CBD5E1',

  // General Constants
  white: '#FFFFFF',
  black: '#000000',
  transparent: 'transparent',
  shadowColor: '#0F172A',
};

export default colors;
