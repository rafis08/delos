import { Platform } from 'react-native';

export const colors = {
  ink: '#FFFFFF',
  panel: '#FFF9EF',
  raised: '#F4E8D3',
  line: '#E4D4B9',
  text: '#1B140A',
  muted: '#746856',
  accent: '#FFC53D',
  accentInk: '#241500',
  orange: '#FF7A1A',
  danger: '#FF6047',
  info: '#FFD978',
  warning: '#FF9F1C',
  white: '#FFFFFF',
};
export const space = { xs: 6, sm: 10, md: 16, lg: 24, xl: 32, xxl: 48 };
export const radius = { sm: 10, md: 16, lg: 24, pill: 999 };
export const type = {
  display: { fontSize: 42, lineHeight: 44, fontWeight: '900' as const, letterSpacing: -1.5 },
  h1: { fontSize: 30, lineHeight: 34, fontWeight: '800' as const, letterSpacing: -0.7 },
  h2: { fontSize: 22, lineHeight: 27, fontWeight: '800' as const },
  body: { fontSize: 16, lineHeight: 23 },
  small: { fontSize: 13, lineHeight: 18 },
};
export const shadow = Platform.select({
  web: { boxShadow: '0 18px 60px rgba(0,0,0,.35)' },
  default: {
    shadowColor: '#000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 14 },
    elevation: 10,
  },
});
