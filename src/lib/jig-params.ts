import jigSource from '../../scad/jig.scad?raw';

export { jigSource };

export type Layout = 'grid' | 'dual' | 'quad' | 'custom';
export type Point = [number, number];
/** [x, y, diameter, length] */
export type Peg = [number, number, number, number];

/** Mirrors the Customizer variables in scad/jig.scad (names match exactly). */
export interface JigParams {
  layout: Layout;
  pitch: number;
  grid_cols: number;
  grid_rows: number;
  grid_row_pitch: number;
  pins_per_side: number;
  row_span: number;
  quad_pins_y: number;
  quad_pins_x: number;
  quad_span_x: number;
  quad_span_y: number;
  custom_pins: Point[];
  skip_pins: number[];
  view_from_bottom: boolean;

  pin_barrel_d: number;
  pin_barrel_len: number;
  pin_total_len: number;
  hole_clearance: number;
  grip_len: number;
  grip_clearance: number;
  pin_stop: boolean;
  stop_len: number;
  stop_hole_d: number;
  entry_chamfer: number;

  body_height: number;
  margin: number;
  min_body_x: number;
  min_body_y: number;
  corner_radius: number;
  pin1_marker: boolean;

  pocket: boolean;
  pocket_x: number;
  pocket_y: number;
  pocket_depth: number;
  pocket_clearance: number;
  pegs: Peg[];

  flip_for_printing: boolean;
}

export type ParamKey = keyof JigParams;
type Value = JigParams[ParamKey];

// Top-level `name = value;` lines, before the [Hidden] section.
const ASSIGNMENT = /^([a-z_][a-z0-9_]*)\s*=\s*(.*?);/gm;

function customizerSection(source: string): string {
  const end = source.indexOf('/* [Hidden] */');
  return end === -1 ? source : source.slice(0, end);
}

/** Reads the default values straight out of the .scad file, so it stays the single source of truth. */
export function parseDefaults(source: string): JigParams {
  const out: Record<string, unknown> = {};
  for (const m of customizerSection(source).matchAll(ASSIGNMENT)) {
    out[m[1]] = JSON.parse(m[2]);
  }
  return out as unknown as JigParams;
}

export const DEFAULT_PARAMS: JigParams = parseDefaults(jigSource);
export const PARAM_KEYS = Object.keys(DEFAULT_PARAMS) as ParamKey[];

export function scadValue(v: Value): string {
  if (typeof v === 'number') {
    if (!Number.isFinite(v)) throw new Error(`Not a finite number: ${v}`);
    return String(v);
  }
  // Strings, booleans and (nested) number lists share JSON's syntax in OpenSCAD.
  return JSON.stringify(v);
}

/** `-D name=value` arguments for the OpenSCAD command line. */
export function toDefines(params: JigParams): string[] {
  return PARAM_KEYS.map((k) => `${k}=${scadValue(params[k])}`);
}

/** The .scad source with each Customizer default replaced by the chosen value. */
export function withParams(source: string, params: JigParams, header?: string): string {
  const end = source.indexOf('/* [Hidden] */');
  const head = end === -1 ? source : source.slice(0, end);
  const tail = end === -1 ? '' : source.slice(end);
  const replaced = head.replace(ASSIGNMENT, (line, name: string) => {
    if (!(name in params)) return line;
    return `${name} = ${scadValue(params[name as ParamKey])};`;
  });
  return (header ? `${header}\n\n` : '') + replaced + tail;
}
