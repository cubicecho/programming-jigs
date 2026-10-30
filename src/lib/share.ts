import { DEFAULT_PARAMS, type JigParams, PARAM_KEYS } from './jig-params';

interface Shared {
  preset: string;
  params: JigParams;
}

/** Encodes only the values that differ from the defaults, so links stay short. */
export function encodeShare(preset: string, params: JigParams): string {
  const diff: Record<string, unknown> = {};
  for (const k of PARAM_KEYS) {
    if (JSON.stringify(params[k]) !== JSON.stringify(DEFAULT_PARAMS[k])) diff[k] = params[k];
  }
  return encodeURIComponent(JSON.stringify({ preset, ...diff }));
}

export function decodeShare(hash: string): Shared | null {
  const raw = hash.replace(/^#/, '');
  if (!raw) return null;
  try {
    const { preset, ...rest } = JSON.parse(decodeURIComponent(raw)) as Record<string, unknown>;
    const params = { ...DEFAULT_PARAMS };
    for (const k of PARAM_KEYS) {
      // Only accept values of the same JSON type as the default.
      const v = rest[k];
      if (
        v !== undefined &&
        typeof v === typeof DEFAULT_PARAMS[k] &&
        Array.isArray(v) === Array.isArray(DEFAULT_PARAMS[k])
      )
        (params as Record<string, unknown>)[k] = v;
    }
    return { preset: typeof preset === 'string' ? preset : 'custom', params };
  } catch {
    return null;
  }
}
