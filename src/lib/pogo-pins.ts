import type { JigParams } from './jig-params';

export interface PogoPin {
  id: string;
  name: string;
  description: string;
  barrelD: number;
  barrelLen: number;
  totalLen: number;
  tip: string;
  /** Narrowest pitch that still leaves a printable wall between holes. */
  minPitch: number;
}

/** Pins we know the dimensions of. Add more as they get measured. */
export const POGO_PINS: PogoPin[] = [
  {
    id: 'p11-j',
    name: 'P11-J',
    description: '1.0 mm diameter, 18.5 mm barrel, 24 mm overall, 0.6 mm spherical tip',
    barrelD: 1.0,
    barrelLen: 18.5,
    totalLen: 24,
    tip: 'Spherical, 0.6 mm',
    minPitch: 2.0,
  },
];

export function pinParams(pin: PogoPin): Partial<JigParams> {
  return { pin_barrel_d: pin.barrelD, pin_barrel_len: pin.barrelLen, pin_total_len: pin.totalLen };
}

export function matchPin(p: JigParams): PogoPin | undefined {
  return POGO_PINS.find(
    (pin) => pin.barrelD === p.pin_barrel_d && pin.barrelLen === p.pin_barrel_len && pin.totalLen === p.pin_total_len,
  );
}
