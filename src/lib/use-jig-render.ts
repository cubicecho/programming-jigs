import { useEffect, useMemo, useRef, useState } from 'react';
import { type JigInfo, parseJigInfo } from './analysis';
import { type JigParams, jigSource, toDefines } from './jig-params';
import { Renderer } from './renderer';

export interface RenderState {
  busy: boolean;
  stl: ArrayBuffer | null;
  info: JigInfo | null;
  /** Params the shown STL and info were made from. */
  renderedParams: JigParams | null;
  logs: string[];
  error: string | null;
  ms: number;
}

const DEBOUNCE_MS = 200;

/** Re-renders the jig in a worker whenever params change, keeping the last good result on screen. */
export function useJigRender(params: JigParams): RenderState {
  const renderer = useMemo(() => new Renderer(), []);
  const [state, setState] = useState<RenderState>({
    busy: true,
    stl: null,
    info: null,
    renderedParams: null,
    logs: [],
    error: null,
    ms: 0,
  });
  const latest = useRef(params);
  latest.current = params;

  useEffect(() => {
    setState((s) => ({ ...s, busy: true }));
    const timer = setTimeout(async () => {
      const r = await renderer.render(jigSource, toDefines(params));
      if (!r || latest.current !== params) return; // superseded
      const errorLine = r.logs.find((l) => l.startsWith('ERROR') || l.includes('Parser error'));
      setState((s) =>
        r.ok
          ? {
              busy: false,
              stl: r.stl,
              info: parseJigInfo(r.logs),
              renderedParams: params,
              logs: r.logs,
              error: null,
              ms: r.ms,
            }
          : { ...s, busy: false, logs: r.logs, error: errorLine ?? 'OpenSCAD failed to render this jig.', ms: r.ms },
      );
    }, DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [params, renderer]);

  return state;
}
