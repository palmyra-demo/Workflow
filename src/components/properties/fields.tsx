import { useEffect, useRef, useState } from 'react';
import { Checkbox, Select, Textarea, TextInput } from '@mantine/core';

const COMMIT_DELAY = 300;

export function useCommittedValue(value: string, onCommit: (value: string) => void, delay = COMMIT_DELAY) {
  const [local, setLocal] = useState(value);
  const pending = useRef(false);
  const latest = useRef(value);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const commitRef = useRef(onCommit);
  const valueRef = useRef(value);
  commitRef.current = onCommit;
  valueRef.current = value;

  useEffect(() => {
    if (!pending.current) {
      setLocal(value);
      latest.current = value;
    }
  }, [value]);

  const flush = () => {
    clearTimeout(timer.current);
    if (!pending.current) return;
    pending.current = false;
    if (latest.current !== valueRef.current) commitRef.current(latest.current);
  };
  const change = (next: string) => {
    setLocal(next);
    latest.current = next;
    pending.current = true;
    clearTimeout(timer.current);
    timer.current = setTimeout(flush, delay);
  };
  useEffect(() => () => flush(), []);

  return { local, change, flush };
}

interface EntryProps {
  label: string;
  value: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  help?: string;
  error?: string;
  required?: boolean;
  readOnly?: boolean;
  autoFocus?: boolean;
  mono?: boolean;
  type?: 'text' | 'number';
}

const entryClasses = {
  root: 'bpp-entry',
  label: 'bpp-label',
  input: 'bpp-input',
  description: 'bpp-help',
  error: 'bpp-error',
};

export function TextField({
  label,
  value,
  onChange,
  placeholder,
  help,
  error,
  required,
  readOnly,
  autoFocus,
  mono,
  type = 'text',
}: EntryProps) {
  const { local, change, flush } = useCommittedValue(value, (v) => onChange?.(v));
  return (
    <TextInput
      classNames={entryClasses}
      className={mono ? 'bpp-mono' : undefined}
      label={label}
      description={help}
      error={error}
      withAsterisk={required}
      type={type}
      value={readOnly ? value : local}
      readOnly={readOnly}
      data-autofocus={autoFocus ? true : undefined}
      autoFocus={autoFocus}
      placeholder={placeholder}
      onChange={(e) => change(e.currentTarget.value)}
      onBlur={flush}
      onKeyDown={(e) => {
        if (e.key === 'Enter') flush();
      }}
    />
  );
}

export function TextAreaField({
  label,
  value,
  onChange,
  placeholder,
  help,
  error,
  required,
  readOnly,
  rows = 3,
  mono,
}: EntryProps & { rows?: number }) {
  const { local, change, flush } = useCommittedValue(value, (v) => onChange?.(v));
  return (
    <Textarea
      classNames={{ ...entryClasses, input: 'bpp-input bpp-textarea' }}
      className={mono ? 'bpp-mono' : undefined}
      label={label}
      description={help}
      error={error}
      withAsterisk={required}
      autosize
      minRows={rows}
      maxRows={12}
      value={readOnly ? value : local}
      readOnly={readOnly}
      placeholder={placeholder}
      onChange={(e) => change(e.currentTarget.value)}
      onBlur={flush}
    />
  );
}

export interface SelectOption {
  label: string;
  value: string;
}

export function SelectField({
  label,
  value,
  options,
  onChange,
  help,
  error,
  readOnly,
  disabled,
}: {
  label: string;
  value: string;
  options: (string | SelectOption)[];
  onChange?: (value: string) => void;
  help?: string;
  error?: string;
  readOnly?: boolean;
  disabled?: boolean;
}) {
  const data = options.map((o) => (typeof o === 'string' ? { label: o, value: o } : o));
  return (
    <Select
      classNames={{ ...entryClasses, dropdown: 'bpp-dropdown', option: 'bpp-option' }}
      label={label}
      description={help}
      error={error}
      data={data}
      value={value || null}
      allowDeselect={false}
      readOnly={readOnly}
      disabled={disabled}
      comboboxProps={{ withinPortal: true, zIndex: 1000, shadow: 'sm' }}
      onChange={(v) => {
        if (v !== null) onChange?.(v);
      }}
    />
  );
}

export function BooleanField({
  label,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  value: boolean;
  onChange?: (value: boolean) => void;
  readOnly?: boolean;
}) {
  return (
    <Checkbox
      classNames={{ root: 'bpp-entry bpp-check', label: 'bpp-check-label', input: 'bpp-check-input' }}
      size="xs"
      label={label}
      checked={value}
      disabled={readOnly}
      onChange={(e) => onChange?.(e.currentTarget.checked)}
    />
  );
}
