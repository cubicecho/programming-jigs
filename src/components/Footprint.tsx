import { useMemo } from 'react';
import { FDM_MIN_WALL, type JigInfo, MIN_PRINTABLE_WALL } from '@/lib/analysis';
import type { JigParams } from '@/lib/jig-params';

/** To-scale top view of the jig. Click a pin to skip or restore it. */
export function Footprint({
  params,
  info,
  onTogglePin,
}: {
  params: JigParams;
  info: JigInfo;
  onTogglePin: (num: number) => void;
}) {
  const { body, pins, holeD, pocket, tabs } = info;
  const pad = 2;
  // Fit the view to the body and any clamp tabs.
  const rects = [[body.cx - body.x / 2, body.cy - body.y / 2, body.cx + body.x / 2, body.cy + body.y / 2], ...tabs];
  const minX = Math.min(...rects.map((r) => r[0]));
  const minY = Math.min(...rects.map((r) => r[1]));
  const maxX = Math.max(...rects.map((r) => r[2]));
  const maxY = Math.max(...rects.map((r) => r[3]));
  const x0 = minX - pad;
  const y0 = -maxY - pad;
  const w = maxX - minX + 2 * pad;
  const h = maxY - minY + 2 * pad;

  // Thinnest wall from each pin to its nearest used neighbour, for colouring.
  const walls = useMemo(() => {
    const used = pins.filter((p) => p.used);
    const m = new Map<number, number>();
    for (const a of used) {
      let best = Number.POSITIVE_INFINITY;
      for (const b of used) if (a !== b) best = Math.min(best, Math.hypot(a.x - b.x, a.y - b.y) - holeD);
      m.set(a.num, best);
    }
    return m;
  }, [pins, holeD]);

  const spacing = useMemo(() => {
    let s = Number.POSITIVE_INFINITY;
    for (let i = 0; i < pins.length; i++)
      for (let j = i + 1; j < pins.length; j++)
        s = Math.min(s, Math.hypot(pins[i].x - pins[j].x, pins[i].y - pins[j].y));
    return Number.isFinite(s) ? s : holeD * 2;
  }, [pins, holeD]);
  const font = Math.max(0.25, Math.min(spacing * 0.42, holeD * 0.7, 1.2));
  const mx = params.view_from_bottom ? -1 : 1;
  const r = Math.min(params.corner_radius, body.x / 2, body.y / 2);

  return (
    <div className="flex h-full flex-col">
      <svg
        viewBox={`${x0} ${y0} ${w} ${h}`}
        className="min-h-0 w-full flex-1"
        role="img"
        aria-label="Jig footprint, top view"
      >
        {tabs.map(([tx0, ty0, tx1, ty1]) => (
          <rect
            key={`${tx0},${ty0}`}
            x={tx0}
            y={-ty1}
            width={tx1 - tx0}
            height={ty1 - ty0}
            rx={Math.min(r, (tx1 - tx0) / 2, (ty1 - ty0) / 2)}
            className="fill-muted/60 stroke-border"
            strokeWidth={0.08}
          />
        ))}
        {params.clamp_tab && params.clamp_tab_hole_d > 0 && <TabHoles info={info} d={params.clamp_tab_hole_d} />}
        <rect
          x={body.cx - body.x / 2}
          y={-(body.cy + body.y / 2)}
          width={body.x}
          height={body.y}
          rx={r}
          className="fill-muted stroke-border"
          strokeWidth={0.08}
        />
        {params.pin1_marker && pins.length > 0 && <Pin1Corner info={info} margin={params.margin} />}
        {pocket.hx > 0 && (
          <rect
            x={pocket.cx - pocket.hx}
            y={-(pocket.cy + pocket.hy)}
            width={pocket.hx * 2}
            height={pocket.hy * 2}
            className="fill-background/60 stroke-muted-foreground"
            strokeWidth={0.06}
            strokeDasharray="0.3 0.2"
          />
        )}
        {params.pegs.map(([x, y, d], i) => (
          <circle
            // biome-ignore lint/suspicious/noArrayIndexKey: pegs have no identity besides position
            key={i}
            cx={mx * x}
            cy={-y}
            r={d / 2}
            className="fill-sky-500/30 stroke-sky-500"
            strokeWidth={0.06}
          />
        ))}
        {pins.map((p) => {
          const wall = walls.get(p.num) ?? Number.POSITIVE_INFINITY;
          const tone = !p.used
            ? 'fill-transparent stroke-muted-foreground'
            : wall < MIN_PRINTABLE_WALL
              ? 'fill-red-500/70 stroke-red-400'
              : wall < FDM_MIN_WALL
                ? 'fill-amber-500/70 stroke-amber-400'
                : p.num === 1
                  ? 'fill-emerald-500 stroke-emerald-300'
                  : 'fill-sky-600 stroke-sky-400';
          return (
            // biome-ignore lint/a11y/useSemanticElements: an SVG group can't be a <button>
            <g
              key={p.num}
              role="button"
              tabIndex={0}
              aria-label={`Pin ${p.num}${p.used ? '' : ' (skipped)'}`}
              className="cursor-pointer outline-none"
              onClick={() => onTogglePin(p.num)}
              onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onTogglePin(p.num)}
            >
              <circle
                cx={p.x}
                cy={-p.y}
                r={holeD / 2}
                className={tone}
                strokeWidth={0.06}
                strokeDasharray={p.used ? undefined : '0.15 0.1'}
              />
              <text
                x={p.x}
                y={-p.y}
                fontSize={font}
                textAnchor="middle"
                dominantBaseline="central"
                className="pointer-events-none fill-foreground font-medium select-none"
              >
                {p.num}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 pt-2 text-xs text-muted-foreground">
        <span>{params.view_from_bottom ? 'Viewed from under the board (mirrored)' : 'Top view'}</span>
        <span>
          Body {body.x.toFixed(1)} × {body.y.toFixed(1)} × {body.height} mm
        </span>
        <Legend className="bg-emerald-500" label="Pin 1" />
        <Legend className="bg-amber-500" label="Thin wall" />
        <Legend className="bg-red-500" label="Too thin" />
        <span>Click a pin to skip it</span>
      </div>
    </div>
  );
}

/** Mirrors tab_hole_at() in jig.scad: each hole sits in the middle of the part of the tab outside the body. */
function TabHoles({ info, d }: { info: JigInfo; d: number }) {
  const { body } = info;
  const bx0 = body.cx - body.x / 2;
  const bx1 = body.cx + body.x / 2;
  const by0 = body.cy - body.y / 2;
  const by1 = body.cy + body.y / 2;
  return info.tabs.map(([x0, y0, x1, y1]) => {
    // Left/right tabs stick out in X; top/bottom tabs stick out in Y.
    const sideways = x1 > bx1 + 0.5 || x0 < bx0 - 0.5;
    const cx = !sideways ? (x0 + x1) / 2 : x1 > bx1 + 0.5 ? (x1 + bx1) / 2 : (x0 + bx0) / 2;
    const cy = sideways ? (y0 + y1) / 2 : y1 > by1 + 0.5 ? (y1 + by1) / 2 : (y0 + by0) / 2;
    return (
      <circle
        key={`${x0},${y0}`}
        cx={cx}
        cy={-cy}
        r={d / 2}
        className="fill-background stroke-border"
        strokeWidth={0.08}
      />
    );
  });
}

/** Mirrors pin1_cut() in jig.scad: the body corner nearest pin 1 is chamfered. */
function Pin1Corner({ info, margin }: { info: JigInfo; margin: number }) {
  const { body, pins } = info;
  const sx = pins[0].x >= body.cx ? 1 : -1;
  const sy = pins[0].y >= body.cy ? 1 : -1;
  const kx = body.cx + (sx * body.x) / 2;
  const ky = body.cy + (sy * body.y) / 2;
  const c = Math.min(margin * 0.8, 2.5);
  const pts = [
    [kx - sx * (c + 1), ky + sy],
    [kx + sx, ky - sy * (c + 1)],
    [kx + sx * 2, ky + sy * 2],
  ];
  return <polygon points={pts.map(([x, y]) => `${x},${-y}`).join(' ')} className="fill-background" />;
}

function Legend({ className, label }: { className: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <span className={`inline-block size-2.5 rounded-full ${className}`} />
      {label}
    </span>
  );
}
