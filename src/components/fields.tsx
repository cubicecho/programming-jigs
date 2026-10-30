import { useEffect, useId, useState } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface NumberFieldProps {
  label: string;
  value: number;
  onChange: (v: number) => void;
  step?: number;
  min?: number;
  max?: number;
  unit?: string;
  integer?: boolean;
  hint?: string;
}

/** Number input that lets you type freely and only commits valid numbers. */
export function NumberField({ label, value, onChange, step = 0.1, min, max, unit, integer, hint }: NumberFieldProps) {
  const id = useId();
  const [text, setText] = useState(String(value));
  useEffect(() => {
    setText((t) => (Number(t) === value ? t : String(value)));
  }, [value]);

  const parse = (t: string): number | null => {
    if (t.trim() === '') return null;
    const n = Number(t);
    if (!Number.isFinite(n)) return null;
    if (integer && !Number.isInteger(n)) return null;
    if (min !== undefined && n < min) return null;
    if (max !== undefined && n > max) return null;
    return n;
  };
  const invalid = parse(text) === null;

  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground" title={hint}>
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          type="number"
          inputMode="decimal"
          value={text}
          step={integer ? 1 : step}
          min={min}
          max={max}
          aria-invalid={invalid}
          className={cn('h-8 tabular-nums', unit && 'pr-9')}
          onChange={(e) => {
            setText(e.target.value);
            const n = parse(e.target.value);
            if (n !== null) onChange(n);
          }}
          onBlur={() => invalid && setText(String(value))}
        />
        {unit && (
          <span className="pointer-events-none absolute inset-y-0 right-2.5 flex items-center text-xs text-muted-foreground">
            {unit}
          </span>
        )}
      </div>
    </div>
  );
}

export function SwitchField({
  label,
  checked,
  onChange,
  hint,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  hint?: string;
}) {
  const id = useId();
  return (
    <div className="flex items-start justify-between gap-3 py-1">
      <div className="grid gap-0.5">
        <Label htmlFor={id} className="text-sm">
          {label}
        </Label>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </div>
      <Switch id={id} checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

/** Edits a JSON value (point lists etc.) and only commits when it parses and validates. */
export function JsonField<T>({
  label,
  value,
  onChange,
  validate,
  hint,
  rows = 3,
}: {
  label: string;
  value: T;
  onChange: (v: T) => void;
  validate: (v: unknown) => v is T;
  hint?: string;
  rows?: number;
}) {
  const id = useId();
  const [text, setText] = useState(JSON.stringify(value));
  const [error, setError] = useState(false);
  useEffect(() => {
    setText((t) => {
      try {
        if (JSON.stringify(JSON.parse(t)) === JSON.stringify(value)) return t;
      } catch {}
      return JSON.stringify(value);
    });
  }, [value]);

  return (
    <div className="grid gap-1">
      <Label htmlFor={id} className="text-xs text-muted-foreground">
        {label}
      </Label>
      <Textarea
        id={id}
        rows={rows}
        value={text}
        spellCheck={false}
        aria-invalid={error}
        className="min-h-0 font-mono text-xs"
        onChange={(e) => {
          setText(e.target.value);
          try {
            const v = JSON.parse(e.target.value);
            if (validate(v)) {
              setError(false);
              onChange(v);
              return;
            }
          } catch {}
          setError(true);
        }}
      />
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

export function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  return (
    <details open={defaultOpen} className="group border-b border-border px-4 py-3 last:border-b-0">
      <summary className="flex cursor-pointer list-none items-center justify-between text-sm font-medium select-none">
        {title}
        <span className="text-muted-foreground transition-transform group-open:rotate-90">›</span>
      </summary>
      <div className="mt-3 grid gap-3">{children}</div>
    </details>
  );
}

export function FieldGrid({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-2 gap-x-3 gap-y-2.5">{children}</div>;
}
