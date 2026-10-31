import { describe, expect, it } from 'vitest';
import { analyse, parseJigInfo } from './analysis';
import { DEFAULT_PARAMS, jigSource, PARAM_KEYS, parseDefaults, toDefines, withParams } from './jig-params';
import { renderScad } from './openscad-core';
import { applyPreset, DEFAULT_PRESET_ID, PRESETS } from './presets';

const preset = (id: string) => PRESETS.find((p) => p.id === id)!;

describe('jig params', () => {
  it('reads every Customizer default from the .scad file', () => {
    expect(PARAM_KEYS).toContain('layout');
    expect(PARAM_KEYS).toContain('flip_for_printing');
    expect(DEFAULT_PARAMS.custom_pins).toEqual([
      [0, 0],
      [2.54, 0],
    ]);
    expect(DEFAULT_PARAMS.skip_pins).toEqual([]);
  });

  it('matches the default preset, so a fresh page and the .scad agree', () => {
    expect(applyPreset(DEFAULT_PARAMS, preset(DEFAULT_PRESET_ID))).toEqual(DEFAULT_PARAMS);
  });

  it('writes chosen values back into the .scad source', () => {
    const p = { ...applyPreset(DEFAULT_PARAMS, preset('soic-8')), skip_pins: [2, 3], margin: 4.5 };
    const out = withParams(jigSource, p, '// header');
    expect(out.startsWith('// header')).toBe(true);
    expect(parseDefaults(out)).toEqual(p);
    expect(out).toContain('$fs = 0.15;');
  });

  it('formats defines for the OpenSCAD command line', () => {
    const d = toDefines({ ...DEFAULT_PARAMS, layout: 'quad', pegs: [[1, 2, 3, 4]] });
    expect(d).toContain('layout="quad"');
    expect(d).toContain('pegs=[[1,2,3,4]]');
    expect(d).toContain('pin_stop=true');
  });
});

describe('rendering', () => {
  it.each(PRESETS.map((p) => [p.id, p] as const))('renders preset %s', async (_id, p) => {
    const params = applyPreset(DEFAULT_PARAMS, p);
    const r = await renderScad(jigSource, toDefines(params));
    expect(r.ok, r.logs.join('\n')).toBe(true);
    expect(r.logs.some((l) => l.startsWith('WARNING'))).toBe(false);
    const info = parseJigInfo(r.logs)!;
    expect(info).not.toBeNull();

    const expected =
      params.layout === 'grid'
        ? params.grid_cols * params.grid_rows
        : params.layout === 'dual'
          ? params.pins_per_side * 2
          : (params.quad_pins_x + params.quad_pins_y) * 2;
    expect(info.pins).toHaveLength(expected);
    expect(info.pins[0].num).toBe(1);

    // P11 pins (1 mm) work at 2 mm and up; finer pitches must be flagged.
    const { findings } = analyse(params, info);
    const errors = findings.filter((f) => f.severity === 'error');
    if (params.pitch >= 2) expect(errors).toEqual([]);
    else expect(errors.length).toBeGreaterThan(0);
  });

  it('puts pin 1 top-left and mirrors it when viewed from the bottom', async () => {
    const base = applyPreset(DEFAULT_PARAMS, preset('dip-8'));
    for (const fromBottom of [false, true]) {
      const r = await renderScad(jigSource, toDefines({ ...base, view_from_bottom: fromBottom }));
      const pin1 = parseJigInfo(r.logs)!.pins[0];
      expect(pin1.y).toBeGreaterThan(0);
      expect(Math.sign(pin1.x)).toBe(fromBottom ? 1 : -1);
    }
  });

  it('keeps numbering when pins are skipped', async () => {
    const p = { ...DEFAULT_PARAMS, skip_pins: [2, 9] };
    const info = parseJigInfo((await renderScad(jigSource, toDefines(p))).logs)!;
    expect(info.pins.filter((x) => !x.used).map((x) => x.num)).toEqual([2, 9]);
    expect(analyse(p, info).stats.usedPins).toBe(14);
  });

  it('sits flat on the board with the chosen push-in, and adds clamp tabs', async () => {
    const p = {
      ...applyPreset(DEFAULT_PARAMS, preset('pads-1x4-2.54')),
      preload: 1.2,
      clamp_tab_side: 'left_right' as const,
    };
    expect(p.clamp_tab && p.sit_on_board).toBe(true);
    const r = await renderScad(jigSource, toDefines(p));
    expect(r.ok, r.logs.join('\n')).toBe(true);
    const info = parseJigInfo(r.logs)!;
    expect(info.tabs).toHaveLength(2);
    const [left, right] = info.tabs;
    expect(left[0]).toBeCloseTo(info.body.cx - info.body.x / 2 - p.clamp_tab_length);
    expect(right[2]).toBeCloseTo(info.body.cx + info.body.x / 2 + p.clamp_tab_length);
    const { stats, findings } = analyse(p, info);
    expect(stats.tipBelow).toBeCloseTo(1.2);
    expect(findings.filter((f) => f.severity !== 'info')).toEqual([]);
  });

  it('warns when a clamp tab is used without sitting on the board', async () => {
    const p = { ...DEFAULT_PARAMS, clamp_tab: true, clamp_tab_hole_d: 3 };
    const info = parseJigInfo((await renderScad(jigSource, toDefines(p))).logs)!;
    const messages = analyse(p, info).findings.map((f) => f.message);
    expect(messages.some((m) => m.includes('crush the pins'))).toBe(true);
  });

  it('renders custom points, pegs and a flipped body', async () => {
    const p = {
      ...DEFAULT_PARAMS,
      layout: 'custom' as const,
      custom_pins: [
        [0, 0],
        [5, 0],
        [0, 5],
      ] as [number, number][],
      pegs: [[10, 10, 2, 3]] as [number, number, number, number][],
      flip_for_printing: true,
    };
    const r = await renderScad(jigSource, toDefines(p));
    expect(r.ok, r.logs.join('\n')).toBe(true);
    expect(parseJigInfo(r.logs)!.pins).toHaveLength(3);
  });
});
