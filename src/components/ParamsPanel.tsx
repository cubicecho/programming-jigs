import { FieldGrid, JsonField, NumberField, Section, SwitchField } from '@/components/fields';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { JigParams, Layout, Peg, Point } from '@/lib/jig-params';
import { matchPin, POGO_PINS, pinParams } from '@/lib/pogo-pins';
import { PRESETS, presetGroups } from '@/lib/presets';

type Set = (patch: Partial<JigParams>) => void;

const isNumList = (v: unknown, n: number): boolean =>
  Array.isArray(v) && v.length === n && v.every((x) => typeof x === 'number' && Number.isFinite(x));
const isPoints = (v: unknown): v is Point[] => Array.isArray(v) && v.length > 0 && v.every((p) => isNumList(p, 2));
const isPegs = (v: unknown): v is Peg[] =>
  Array.isArray(v) && v.every((p) => isNumList(p, 4) && (p as number[])[2] > 0 && (p as number[])[3] > 0);

export const CUSTOM_PRESET = 'custom';

export function ParamsPanel({
  params,
  set,
  presetId,
  onPreset,
}: {
  params: JigParams;
  set: Set;
  presetId: string;
  onPreset: (id: string) => void;
}) {
  const p = params;
  const preset = PRESETS.find((x) => x.id === presetId);
  const pin = matchPin(p);

  return (
    <div className="text-sm">
      <Section title="Package / preset">
        <Select value={presetId} onValueChange={onPreset}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {presetGroups().map(([group, list]) => (
              <SelectGroup key={group}>
                <SelectLabel>{group}</SelectLabel>
                {list.map((x) => (
                  <SelectItem key={x.id} value={x.id}>
                    {x.name}
                  </SelectItem>
                ))}
              </SelectGroup>
            ))}
            <SelectGroup>
              <SelectLabel>Other</SelectLabel>
              <SelectItem value={CUSTOM_PRESET}>Custom (edited)</SelectItem>
            </SelectGroup>
          </SelectContent>
        </Select>
        {preset && <p className="text-xs text-muted-foreground">{preset.description}</p>}
      </Section>

      <Section title="Pogo pin">
        <Select
          value={pin?.id ?? 'custom'}
          onValueChange={(id) => {
            const found = POGO_PINS.find((x) => x.id === id);
            if (found) set(pinParams(found));
          }}
        >
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {POGO_PINS.map((x) => (
              <SelectItem key={x.id} value={x.id}>
                {x.name}
              </SelectItem>
            ))}
            <SelectItem value="custom" disabled>
              Custom size
            </SelectItem>
          </SelectContent>
        </Select>
        {pin && <p className="text-xs text-muted-foreground">{pin.description}</p>}
        <FieldGrid>
          <NumberField
            label="Barrel diameter"
            unit="mm"
            step={0.01}
            min={0.1}
            value={p.pin_barrel_d}
            onChange={(v) => set({ pin_barrel_d: v })}
          />
          <NumberField
            label="Barrel length"
            unit="mm"
            min={1}
            value={p.pin_barrel_len}
            onChange={(v) => set({ pin_barrel_len: v })}
          />
          <NumberField
            label="Overall length"
            unit="mm"
            min={1}
            value={p.pin_total_len}
            onChange={(v) => set({ pin_total_len: v })}
          />
        </FieldGrid>
      </Section>

      <Section title="Pin layout">
        <div className="grid gap-1">
          <Label className="text-xs text-muted-foreground">Arrangement</Label>
          <Select value={p.layout} onValueChange={(v) => set({ layout: v as Layout })}>
            <SelectTrigger className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="grid">Grid (headers, test pads)</SelectItem>
              <SelectItem value="dual">Two rows (DIP, SOIC, modules)</SelectItem>
              <SelectItem value="quad">Four sides (QFP, QFN)</SelectItem>
              <SelectItem value="custom">Custom points</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <FieldGrid>
          {p.layout !== 'custom' && (
            <NumberField
              label="Pin pitch"
              unit="mm"
              step={0.01}
              min={0.1}
              value={p.pitch}
              onChange={(v) => set({ pitch: v })}
            />
          )}
          {p.layout === 'grid' && (
            <>
              <NumberField
                label="Pins per row"
                integer
                min={1}
                max={60}
                value={p.grid_cols}
                onChange={(v) => set({ grid_cols: v })}
              />
              <NumberField
                label="Rows"
                integer
                min={1}
                max={20}
                value={p.grid_rows}
                onChange={(v) => set({ grid_rows: v })}
              />
              <NumberField
                label="Row pitch"
                unit="mm"
                step={0.01}
                min={0.1}
                value={p.grid_row_pitch}
                onChange={(v) => set({ grid_row_pitch: v })}
              />
            </>
          )}
          {p.layout === 'dual' && (
            <>
              <NumberField
                label="Pins per side"
                integer
                min={1}
                max={60}
                value={p.pins_per_side}
                onChange={(v) => set({ pins_per_side: v })}
              />
              <NumberField
                label="Row span (centre to centre)"
                unit="mm"
                step={0.01}
                min={0.1}
                value={p.row_span}
                onChange={(v) => set({ row_span: v })}
              />
            </>
          )}
          {p.layout === 'quad' && (
            <>
              <NumberField
                label="Pins, left & right sides"
                integer
                min={1}
                max={60}
                value={p.quad_pins_y}
                onChange={(v) => set({ quad_pins_y: v })}
              />
              <NumberField
                label="Pins, top & bottom sides"
                integer
                min={1}
                max={60}
                value={p.quad_pins_x}
                onChange={(v) => set({ quad_pins_x: v })}
              />
              <NumberField
                label="Span, left to right"
                unit="mm"
                step={0.01}
                min={0.1}
                value={p.quad_span_x}
                onChange={(v) => set({ quad_span_x: v })}
              />
              <NumberField
                label="Span, top to bottom"
                unit="mm"
                step={0.01}
                min={0.1}
                value={p.quad_span_y}
                onChange={(v) => set({ quad_span_y: v })}
              />
            </>
          )}
        </FieldGrid>
        {p.layout === 'custom' && (
          <JsonField
            label="Pin positions [[x, y], …] in mm"
            value={p.custom_pins}
            validate={isPoints}
            onChange={(v) => set({ custom_pins: v })}
            hint="Numbered in list order. Top view, Y up."
            rows={4}
          />
        )}
        <JsonField
          label="Skipped pins"
          value={p.skip_pins}
          validate={(v): v is number[] => Array.isArray(v) && v.every((x) => Number.isInteger(x) && x > 0)}
          onChange={(v) => set({ skip_pins: v })}
          hint="Pin numbers to leave out, e.g. [2, 5]. Or click pins in the footprint view."
          rows={1}
        />
        <SwitchField
          label="Probe from the underside"
          hint="Mirrors the layout, for reaching through-hole joints from the back of the board."
          checked={p.view_from_bottom}
          onChange={(v) => set({ view_from_bottom: v })}
        />
      </Section>

      <Section title="Body">
        <FieldGrid>
          <NumberField
            label="Height"
            unit="mm"
            step={0.5}
            min={2}
            value={p.body_height}
            onChange={(v) => set({ body_height: v })}
          />
          <NumberField
            label="Margin around pins"
            unit="mm"
            min={0.5}
            value={p.margin}
            onChange={(v) => set({ margin: v })}
          />
          <NumberField
            label="Min width (0 = fit)"
            unit="mm"
            step={0.5}
            min={0}
            value={p.min_body_x}
            onChange={(v) => set({ min_body_x: v })}
          />
          <NumberField
            label="Min depth (0 = fit)"
            unit="mm"
            step={0.5}
            min={0}
            value={p.min_body_y}
            onChange={(v) => set({ min_body_y: v })}
          />
          <NumberField
            label="Corner radius"
            unit="mm"
            min={0}
            value={p.corner_radius}
            onChange={(v) => set({ corner_radius: v })}
          />
        </FieldGrid>
        <SwitchField
          label="Pin 1 corner marker"
          hint="Chamfers the body corner nearest pin 1."
          checked={p.pin1_marker}
          onChange={(v) => set({ pin1_marker: v })}
        />
      </Section>

      <Section title="Hole fit" defaultOpen={false}>
        <p className="text-xs text-muted-foreground">
          Printed holes come out smaller than modelled. Print a small test first and adjust these for your printer.
        </p>
        <FieldGrid>
          <NumberField
            label="Hole clearance"
            unit="mm"
            step={0.01}
            min={0}
            value={p.hole_clearance}
            onChange={(v) => set({ hole_clearance: v })}
          />
          <NumberField
            label="Entry chamfer"
            unit="mm"
            step={0.05}
            min={0}
            value={p.entry_chamfer}
            onChange={(v) => set({ entry_chamfer: v })}
          />
          <NumberField
            label="Grip length (top)"
            unit="mm"
            min={0}
            value={p.grip_len}
            onChange={(v) => set({ grip_len: v })}
          />
          <NumberField
            label="Grip clearance"
            unit="mm"
            step={0.01}
            min={-0.5}
            value={p.grip_clearance}
            onChange={(v) => set({ grip_clearance: v })}
          />
        </FieldGrid>
        <SwitchField
          label="Pin stop"
          hint="Narrows the bottom of each hole so every barrel seats at the same depth."
          checked={p.pin_stop}
          onChange={(v) => set({ pin_stop: v })}
        />
        {p.pin_stop && (
          <FieldGrid>
            <NumberField
              label="Stop thickness"
              unit="mm"
              min={0.2}
              value={p.stop_len}
              onChange={(v) => set({ stop_len: v })}
            />
            <NumberField
              label="Stop hole diameter"
              unit="mm"
              step={0.01}
              min={0.1}
              value={p.stop_hole_d}
              onChange={(v) => set({ stop_hole_d: v })}
            />
          </FieldGrid>
        )}
      </Section>

      <Section title="Locating" defaultOpen={p.pocket || p.pegs.length > 0}>
        <SwitchField
          label="Pocket over the part"
          hint="A recess in the bottom that sits over the chip or module body."
          checked={p.pocket}
          onChange={(v) => set({ pocket: v })}
        />
        {p.pocket && (
          <FieldGrid>
            <NumberField
              label="Pocket width"
              unit="mm"
              min={0.5}
              value={p.pocket_x}
              onChange={(v) => set({ pocket_x: v })}
            />
            <NumberField
              label="Pocket depth (Y)"
              unit="mm"
              min={0.5}
              value={p.pocket_y}
              onChange={(v) => set({ pocket_y: v })}
            />
            <NumberField
              label="Pocket height"
              unit="mm"
              min={0.1}
              value={p.pocket_depth}
              onChange={(v) => set({ pocket_depth: v })}
            />
            <NumberField
              label="Pocket clearance"
              unit="mm"
              step={0.05}
              min={0}
              value={p.pocket_clearance}
              onChange={(v) => set({ pocket_clearance: v })}
            />
          </FieldGrid>
        )}
        <JsonField
          label="Alignment pegs [[x, y, diameter, length], …]"
          value={p.pegs}
          validate={isPegs}
          onChange={(v) => set({ pegs: v })}
          hint="Pegs that drop into PCB holes, in the same coordinates as the pins."
          rows={2}
        />
      </Section>

      <Section title="Printing" defaultOpen={false}>
        <SwitchField
          label="Flip for printing"
          hint="Exports the jig upside down, so a pocket or pegs face up on the print bed."
          checked={p.flip_for_printing}
          onChange={(v) => set({ flip_for_printing: v })}
        />
      </Section>
    </div>
  );
}
