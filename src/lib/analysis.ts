import type { JigParams } from './jig-params';

export interface JigPin {
  num: number;
  x: number;
  y: number;
  used: boolean;
}

export interface JigInfo {
  pins: JigPin[];
  body: { cx: number; cy: number; x: number; y: number; height: number };
  /** Layout centre and pocket half-sizes (0 when there is no pocket). */
  pocket: { cx: number; cy: number; hx: number; hy: number };
  holeD: number;
  stopH: number;
  /** Height of the stop ledge above the exit face (0 unless the jig sits on the board). */
  standoff: number;
  /** Clamp tab footprints as [x0, y0, x1, y1]. */
  tabs: [number, number, number, number][];
}

function echoValue(logs: string[], tag: string): unknown {
  const prefix = `ECHO: "${tag}", `;
  const line = logs.find((l) => l.startsWith(prefix));
  return line ? JSON.parse(line.slice(prefix.length)) : undefined;
}

/** Reads the JIG_* echo lines that scad/jig.scad prints. */
export function parseJigInfo(logs: string[]): JigInfo | null {
  try {
    const pins = echoValue(logs, 'JIG_PINS') as number[][] | undefined;
    const body = echoValue(logs, 'JIG_BODY') as number[] | undefined;
    const hole = echoValue(logs, 'JIG_HOLE') as number[] | undefined;
    const tabs = echoValue(logs, 'JIG_TABS') as JigInfo['tabs'] | undefined;
    if (!pins || !body || !hole || !tabs) return null;
    return {
      pins: pins.map(([num, x, y, used]) => ({ num, x, y, used: used === 1 })),
      body: { cx: body[0], cy: body[1], x: body[2], y: body[3], height: body[4] },
      holeD: hole[0],
      stopH: hole[1],
      pocket: { cx: hole[2], cy: hole[3], hx: hole[4], hy: hole[5] },
      standoff: hole[6],
      tabs,
    };
  } catch {
    return null;
  }
}

export function inPocket(info: JigInfo, x: number, y: number): boolean {
  const p = info.pocket;
  return p.hx > 0 && Math.abs(x - p.cx) <= p.hx && Math.abs(y - p.cy) <= p.hy;
}

export type Severity = 'error' | 'warning' | 'info';
export interface Finding {
  severity: Severity;
  message: string;
}

export interface JigStats {
  usedPins: number;
  /** Closest centre-to-centre distance between used pins. */
  minSpacing: number | null;
  /** Thinnest wall between two holes (negative = holes overlap). */
  minWall: number | null;
  /** How far the tip hangs below the face it exits from, uncompressed. Null without a stop. */
  tipBelow: number | null;
  /** How much barrel sticks out of the top for soldering. */
  tailAbove: number;
}

/** Wall thickness FDM printers manage reliably (two 0.4 mm perimeters). */
export const FDM_MIN_WALL = 0.8;
/** Below this no printer holds a wall between holes. */
export const MIN_PRINTABLE_WALL = 0.3;

export function analyse(p: JigParams, info: JigInfo): { stats: JigStats; findings: Finding[] } {
  const used = info.pins.filter((pin) => pin.used);
  const holeD = Math.max(p.pin_barrel_d + p.hole_clearance, p.grip_len > 0 ? p.pin_barrel_d + p.grip_clearance : 0);

  let minSpacing: number | null = null;
  for (let i = 0; i < used.length; i++) {
    for (let j = i + 1; j < used.length; j++) {
      const d = Math.hypot(used[i].x - used[j].x, used[i].y - used[j].y);
      if (minSpacing === null || d < minSpacing) minSpacing = d;
    }
  }
  const minWall = minSpacing === null ? null : minSpacing - holeD;
  const stopH = p.pin_stop ? p.stop_len : 0;
  const seat = info.standoff + stopH;
  const tipBelow = p.pin_stop ? p.pin_total_len - p.pin_barrel_len - seat : null;
  const tailAbove = p.pin_barrel_len - (p.body_height - seat);

  const findings: Finding[] = [];
  const mm = (n: number) => `${Math.round(n * 100) / 100} mm`;

  if (used.length === 0) findings.push({ severity: 'error', message: 'No pins to place.' });
  if (minWall !== null && minSpacing !== null) {
    if (minWall <= 0) {
      findings.push({
        severity: 'error',
        message: `Holes overlap: pins ${mm(minSpacing)} apart need holes under ${mm(minSpacing)}, but each is ${mm(holeD)}. Use thinner pins, or skip every other pin.`,
      });
    } else if (minWall < MIN_PRINTABLE_WALL) {
      findings.push({
        severity: 'error',
        message: `Walls between holes would be ${mm(minWall)}, too thin to print. Use thinner pins, or skip every other pin.`,
      });
    } else if (minWall < FDM_MIN_WALL) {
      findings.push({
        severity: 'warning',
        message: `Thinnest wall between holes is ${mm(minWall)}. FDM printers need about ${mm(FDM_MIN_WALL)}; a resin printer may manage.`,
      });
    }
  }
  if (p.pin_stop && p.stop_hole_d >= p.pin_barrel_d) {
    findings.push({
      severity: 'error',
      message: `The stop hole (${mm(p.stop_hole_d)}) is not smaller than the barrel (${mm(p.pin_barrel_d)}), so it won't stop the pin.`,
    });
  } else if (p.pin_stop && p.pin_barrel_d - p.stop_hole_d < 0.15) {
    findings.push({
      severity: 'warning',
      message: 'The stop ledge is very narrow and may not hold the barrel once printed.',
    });
  }
  if (tailAbove < 0) {
    findings.push({ severity: 'error', message: 'The barrel is buried inside the jig. Lower the body height.' });
  } else if (tailAbove < 2) {
    findings.push({
      severity: 'warning',
      message: `Only ${mm(tailAbove)} of barrel sticks out of the top to solder wires to.`,
    });
  }
  if (!p.pin_stop) {
    findings.push({
      severity: 'info',
      message:
        'No pin stop: set every pin to the same depth by hand (press the jig onto a flat surface) before gluing.',
    });
  }
  if (p.sit_on_board && !p.pin_stop) {
    findings.push({
      severity: 'warning',
      message:
        'Sitting flat on the board needs the pin stop, so the pins have something to push against. Turn on Pin stop.',
    });
  } else if (p.sit_on_board && info.standoff === 0 && tipBelow !== null && tipBelow > p.preload) {
    findings.push({
      severity: 'warning',
      message: `The stop is already as low as it goes, so the pins get pushed in ${mm(tipBelow)} rather than ${mm(p.preload)}.`,
    });
  }
  if (p.clamp_tab) {
    if (!p.sit_on_board && tipBelow !== null && tipBelow > 0) {
      findings.push({
        severity: 'warning',
        message: `The pin tips reach ${mm(tipBelow)} below the tab, so clamping the tab flat would crush the pins. Turn on Sit flat on the board.`,
      });
    }
    const tabW = p.clamp_tab_width > 0 ? p.clamp_tab_width : Math.min(info.body.x, info.body.y);
    if (p.clamp_tab_hole_d > 0 && p.clamp_tab_hole_d > Math.min(tabW, p.clamp_tab_length) - 2) {
      findings.push({
        severity: 'error',
        message: 'The tab hole leaves less than 1 mm of tab around it. Make the hole smaller or the tab bigger.',
      });
    }
    if (p.flip_for_printing) {
      findings.push({
        severity: 'info',
        message:
          'The clamp tab is level with the bottom face, so the jig prints best upright. Turn off Flip for printing.',
      });
    }
  }
  const inPocketCount = used.filter((pin) => inPocket(info, pin.x, pin.y)).length;
  if (inPocketCount > 0) {
    findings.push({
      severity: 'info',
      message: `${inPocketCount} pin(s) exit through the pocket roof, so their tips sit ${mm(p.pocket_depth)} higher than the rest.`,
    });
  }

  return { stats: { usedPins: used.length, minSpacing, minWall, tipBelow, tailAbove }, findings };
}
