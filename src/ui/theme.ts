// ============================================
// Theme Token System
// ============================================

import { useEditorStore } from '../editor/store';

export interface ThemeTokens {
  // Panel surfaces
  panelBg: string;
  panelBorder: string;
  panelText: string;
  panelTextSecondary: string;
  panelTextMuted: string;

  // Canvas
  canvasBg: string;
  canvasGridR: number;
  canvasGridG: number;
  canvasGridB: number;
  canvasGridA: number;
  canvasClearR: number;
  canvasClearG: number;
  canvasClearB: number;

  // Inputs
  inputBg: string;
  inputBorder: string;
  inputBorderFocus: string;
  inputText: string;

  // Accent
  accent: string;
  accentBg: string;
  accentTextSelected: string;

  // Interactive
  hoverBg: string;
  disabledColor: string;
  separatorColor: string;

  // Segmented control
  segmentBg: string;
  segmentActiveBg: string;
  segmentActiveShadow: string;

  // Layer rows
  layerSelectedBg: string;
  layerSelectedBorder: string;
  layerNameEditBg: string;

  // Loading / error
  loadingGradient: string;
  loadingText: string;
  errorBg: string;
  errorText: string;

  // Scrollbar
  scrollbarTrack: string;
  scrollbarThumb: string;

  // Preview shape label
  previewLabelBgR: number;
  previewLabelBgG: number;
  previewLabelBgB: number;
}

export const lightTheme: ThemeTokens = {
  panelBg: '#fff',
  panelBorder: '#ebe5df',
  panelText: '#3d3733',
  panelTextSecondary: '#756a5f',
  panelTextMuted: '#b8ada2',

  canvasBg: '#f5f1ed',
  canvasGridR: 216, canvasGridG: 207, canvasGridB: 198, canvasGridA: 0.3,
  canvasClearR: 251, canvasClearG: 249, canvasClearB: 247,

  inputBg: '#fbf9f7',
  inputBorder: '#ebe5df',
  inputBorderFocus: '#c4b5fd',
  inputText: '#3d3733',

  accent: '#7C5CFC',
  accentBg: '#f5f3ff',
  accentTextSelected: '#3b2299',

  hoverBg: '#f5f3ff',
  disabledColor: '#d8cfc6',
  separatorColor: '#ebe5df',

  segmentBg: '#f5f3f0',
  segmentActiveBg: '#fff',
  segmentActiveShadow: '0 1px 3px rgba(0,0,0,0.08)',

  layerSelectedBg: '#f5f3ff',
  layerSelectedBorder: '#7C5CFC',
  layerNameEditBg: '#fff',

  loadingGradient: 'linear-gradient(135deg, #f5f3ff, #fff5f3, #fffbf0)',
  loadingText: '#3d3733',
  errorBg: '#fbf9f7',
  errorText: '#c43d27',

  scrollbarTrack: '#f5f1ed',
  scrollbarThumb: '#d8cfc6',

  previewLabelBgR: 255, previewLabelBgG: 255, previewLabelBgB: 255,
};

export const darkTheme: ThemeTokens = {
  panelBg: '#1e1b18',
  panelBorder: '#33302c',
  panelText: '#e8e0d8',
  panelTextSecondary: '#968a7d',
  panelTextMuted: '#5a514a',

  canvasBg: '#151310',
  canvasGridR: 60, canvasGridG: 55, canvasGridB: 50, canvasGridA: 0.35,
  canvasClearR: 30, canvasClearG: 27, canvasClearB: 24,

  inputBg: '#2a2622',
  inputBorder: '#3d3733',
  inputBorderFocus: '#7C5CFC',
  inputText: '#e8e0d8',

  accent: '#9B82FC',
  accentBg: 'rgba(124, 92, 252, 0.15)',
  accentTextSelected: '#c4b5fd',

  hoverBg: 'rgba(124, 92, 252, 0.12)',
  disabledColor: '#4a433d',
  separatorColor: '#33302c',

  segmentBg: '#2a2622',
  segmentActiveBg: '#3d3733',
  segmentActiveShadow: '0 1px 3px rgba(0,0,0,0.3)',

  layerSelectedBg: 'rgba(124, 92, 252, 0.15)',
  layerSelectedBorder: '#9B82FC',
  layerNameEditBg: '#2a2622',

  loadingGradient: 'linear-gradient(135deg, #1e1b18, #231f1c, #2a2622)',
  loadingText: '#e8e0d8',
  errorBg: '#1e1b18',
  errorText: '#ff7b6b',

  scrollbarTrack: '#1e1b18',
  scrollbarThumb: '#4a433d',

  previewLabelBgR: 40, previewLabelBgG: 36, previewLabelBgB: 32,
};

/** Hook that returns the current theme tokens */
export function useTheme(): ThemeTokens {
  const theme = useEditorStore(s => s.theme);
  return theme === 'dark' ? darkTheme : lightTheme;
}

/** Get theme tokens without React (for renderer, etc.) */
export function getThemeTokens(): ThemeTokens {
  const theme = useEditorStore.getState().theme;
  return theme === 'dark' ? darkTheme : lightTheme;
}
