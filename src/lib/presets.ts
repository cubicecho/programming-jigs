import { DEFAULT_PARAMS, type JigParams, type ParamKey } from './jig-params';

export interface Preset {
  id: string;
  name: string;
  group: string;
  description: string;
  params: Partial<JigParams>;
}

/** Keys a preset owns. Applying a preset resets these and leaves pin and body settings alone. */
export const PRESET_KEYS: ParamKey[] = [
  'layout',
  'pitch',
  'grid_cols',
  'grid_rows',
  'grid_row_pitch',
  'pins_per_side',
  'row_span',
  'quad_pins_y',
  'quad_pins_x',
  'quad_span_x',
  'quad_span_y',
  'custom_pins',
  'skip_pins',
  'view_from_bottom',
  'min_body_x',
  'min_body_y',
  'pocket',
  'pocket_x',
  'pocket_y',
  'pocket_depth',
  'pegs',
  'sit_on_board',
  'clamp_tab',
];

// Small header and test-pad jigs are easier to use clamped down.
const CLAMPED: Partial<JigParams> = { sit_on_board: true, clamp_tab: true };

const grid = (cols: number, rows: number, pitch: number, rowPitch = pitch): Partial<JigParams> => ({
  ...CLAMPED,
  layout: 'grid',
  grid_cols: cols,
  grid_rows: rows,
  pitch,
  grid_row_pitch: rowPitch,
});

const dual = (perSide: number, pitch: number, span: number): Partial<JigParams> => ({
  layout: 'dual',
  pins_per_side: perSide,
  pitch,
  row_span: span,
});

const quad = (perSide: number, pitch: number, span: number): Partial<JigParams> => ({
  layout: 'quad',
  quad_pins_x: perSide,
  quad_pins_y: perSide,
  pitch,
  quad_span_x: span,
  quad_span_y: span,
});

const pocket = (x: number, y: number, depth = 1.0): Partial<JigParams> => ({
  pocket: true,
  pocket_x: x,
  pocket_y: y,
  pocket_depth: depth,
});

const DIP_NOTE = 'Probes the solder joints from the underside of the board, so the layout is mirrored.';
// Spans for SMD parts are lead-foot centres (overall lead span minus one foot length).
const SMD_NOTE = 'Pocket fits over the package body.';

export const PRESETS: Preset[] = [
  // Headers and test pads
  {
    id: 'pads-1x4-2.54',
    name: '1×4 test pads, 2.54 mm',
    group: 'Headers & test pads',
    description:
      'A row of 4 pads, common for SWD or UART test points (for example TP1–TP4 on a Keystation Mini 32 MK3). Measure your board first.',
    params: grid(4, 1, 2.54),
  },
  {
    id: 'pads-1x4-2.0',
    name: '1×4 test pads, 2.0 mm',
    group: 'Headers & test pads',
    description: 'A row of 4 pads at 2 mm pitch.',
    params: grid(4, 1, 2.0),
  },
  {
    id: 'hdr-1x6-2.54',
    name: '1×6 serial header, 2.54 mm',
    group: 'Headers & test pads',
    description: 'FTDI-style 6-pin serial header footprint.',
    params: grid(6, 1, 2.54),
  },
  {
    id: 'avr-isp-6',
    name: 'AVR ISP 2×3, 2.54 mm',
    group: 'Headers & test pads',
    description: 'Standard 6-pin AVR ISP footprint. Pin 2 sits across from pin 1.',
    params: grid(3, 2, 2.54),
  },
  {
    id: 'avr-isp-10',
    name: 'AVR ISP 2×5, 2.54 mm',
    group: 'Headers & test pads',
    description: 'Older 10-pin AVR ISP footprint.',
    params: grid(5, 2, 2.54),
  },
  {
    id: 'esp-01',
    name: 'ESP-01 header 2×4, 2.54 mm',
    group: 'Headers & test pads',
    description: 'ESP-01 / ESP-01S pin header.',
    params: grid(4, 2, 2.54),
  },
  {
    id: 'arm-10-1.27',
    name: 'ARM Cortex debug 2×5, 1.27 mm',
    group: 'Headers & test pads',
    description: '10-pin Cortex debug (SWD) footprint. Needs pins thinner than 1 mm.',
    params: grid(5, 2, 1.27),
  },

  // Castellated modules
  {
    id: 'tywe3s',
    name: 'TYWE3S (ESP8266)',
    group: 'Modules',
    description: 'Tuya TYWE3S, 2×8 castellated pads at 2 mm. Matches the reference 16 mm pogo-pin jig.',
    params: dual(8, 2.0, 16.0),
  },
  {
    id: 'esp-12',
    name: 'ESP-12E / ESP-12F',
    group: 'Modules',
    description: 'ESP-12 side pads, 2×8 at 2 mm. The 6 pads on the bottom edge are not included.',
    params: dual(8, 2.0, 16.0),
  },

  // Through-hole ICs
  ...[8, 14, 16, 20, 28].map(
    (n): Preset => ({
      id: `dip-${n}`,
      name: `DIP-${n} (7.62 mm)`,
      group: 'Through-hole ICs',
      description: DIP_NOTE,
      params: { ...dual(n / 2, 2.54, 7.62), view_from_bottom: true },
    }),
  ),
  {
    id: 'dip-40',
    name: 'DIP-40 (15.24 mm)',
    group: 'Through-hole ICs',
    description: DIP_NOTE,
    params: { ...dual(20, 2.54, 15.24), view_from_bottom: true },
  },

  // Surface-mount ICs (finer than P11 pins can do)
  {
    id: 'soic-8',
    name: 'SOIC-8 (3.9 mm body)',
    group: 'Surface-mount ICs (need thinner pins)',
    description: `1.27 mm pitch. ${SMD_NOTE}`,
    params: { ...dual(4, 1.27, 5.2), ...pocket(3.9, 4.9) },
  },
  {
    id: 'soic-8-wide',
    name: 'SOIC-8 wide (5.3 mm body, 208 mil)',
    group: 'Surface-mount ICs (need thinner pins)',
    description: `Common for SPI flash. 1.27 mm pitch. ${SMD_NOTE}`,
    params: { ...dual(4, 1.27, 7.35), ...pocket(5.3, 5.3) },
  },
  {
    id: 'soic-16',
    name: 'SOIC-16 (3.9 mm body)',
    group: 'Surface-mount ICs (need thinner pins)',
    description: `1.27 mm pitch. ${SMD_NOTE}`,
    params: { ...dual(8, 1.27, 5.2), ...pocket(3.9, 9.9) },
  },
  {
    id: 'tssop-20',
    name: 'TSSOP-20 (4.4 mm body)',
    group: 'Surface-mount ICs (need thinner pins)',
    description: `0.65 mm pitch. ${SMD_NOTE}`,
    params: { ...dual(10, 0.65, 5.8), ...pocket(4.4, 6.5) },
  },
  {
    id: 'tqfp-32',
    name: 'TQFP-32 7×7 (ATmega328P-AU)',
    group: 'Surface-mount ICs (need thinner pins)',
    description: `0.8 mm pitch. ${SMD_NOTE}`,
    params: { ...quad(8, 0.8, 8.4), ...pocket(7, 7) },
  },
  {
    id: 'lqfp-48',
    name: 'LQFP-48 7×7 (e.g. NUC120LC1BN)',
    group: 'Surface-mount ICs (need thinner pins)',
    description: `0.5 mm pitch. ${SMD_NOTE}`,
    params: { ...quad(12, 0.5, 8.4), ...pocket(7, 7) },
  },
  {
    id: 'lqfp-64',
    name: 'LQFP-64 10×10',
    group: 'Surface-mount ICs (need thinner pins)',
    description: `0.5 mm pitch. ${SMD_NOTE}`,
    params: { ...quad(16, 0.5, 11.4), ...pocket(10, 10) },
  },
];

export const DEFAULT_PRESET_ID = 'tywe3s';

export function applyPreset(current: JigParams, preset: Preset): JigParams {
  const next = { ...current };
  for (const k of PRESET_KEYS) (next as Record<string, unknown>)[k] = DEFAULT_PARAMS[k];
  // A preset without a pocket keeps the pocket off rather than inheriting the scad default size.
  return { ...next, pocket: false, ...preset.params };
}

export function presetGroups(): [string, Preset[]][] {
  const groups = new Map<string, Preset[]>();
  for (const p of PRESETS) groups.set(p.group, [...(groups.get(p.group) ?? []), p]);
  return [...groups];
}
