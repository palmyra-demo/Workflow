import { useState } from 'react';
import { ActionIcon, Tooltip } from '@mantine/core';
import { Group, ChevronIcon } from './Group';
import { TextField } from './fields';

export interface ListField { key: string; label: string; placeholder?: string; required?: boolean }

const PlusIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>;
const TrashIcon = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></svg>;

export function ListGroup({ id, title, itemName, items, fields, summary, onChange, errorFor, invalid, disabledAdd, children }: {
  id: string;
  title: string;
  itemName: string;
  items: any[];
  fields: ListField[];
  summary: (item: any) => string;
  onChange: (items: any[]) => void;
  errorFor?: (index: number, fieldKey: string) => string | undefined;
  invalid?: boolean;
  disabledAdd?: boolean;
  children?: React.ReactNode;
}) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [focusIndex, setFocusIndex] = useState<number | null>(null);
  const blank = () => Object.fromEntries(fields.map((f) => [f.key, '']));

  const add = () => {
    onChange([...items, blank()]);
    setOpenIndex(items.length);
    setFocusIndex(items.length);
  };
  const remove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
    setOpenIndex((o) => (o === null ? null : o === index ? null : o > index ? o - 1 : o));
    setFocusIndex(null);
  };
  const patch = (index: number, key: string, value: string) =>
    onChange(items.map((item, i) => (i === index ? { ...item, [key]: value } : item)));

  return (
    <Group
      id={id}
      title={title}
      count={items.length || undefined}
      invalid={invalid}
      action={
        <Tooltip label={`Add ${itemName}`} openDelay={400} withArrow>
          <ActionIcon className="bpp-add" variant="subtle" size="sm" aria-label={`Add ${itemName}`} disabled={disabledAdd} onClick={add}><PlusIcon /></ActionIcon>
        </Tooltip>
      }
    >
      {children}
      {items.length === 0 ? (
        <p className="bpp-empty">None configured</p>
      ) : (
        <ul className="bpp-list">
          {items.map((item, i) => {
            const open = openIndex === i;
            const itemInvalid = fields.some((f) => errorFor?.(i, f.key));
            return (
              <li key={i} className={`bpp-list-item${open ? ' is-open' : ''}${itemInvalid ? ' is-invalid' : ''}`}>
                <div className="bpp-list-item-header">
                  <button type="button" className="bpp-list-item-toggle" aria-expanded={open} onClick={() => setOpenIndex(open ? null : i)} title={summary(item)}>
                    <ChevronIcon className={open ? 'is-open' : ''} />
                    <span className="bpp-list-item-summary">{summary(item)}</span>
                  </button>
                  <Tooltip label={`Remove ${itemName}`} openDelay={400} withArrow>
                    <ActionIcon className="bpp-remove" variant="subtle" color="red" size="sm" aria-label={`Remove ${itemName} ${i + 1}`} onClick={() => remove(i)}><TrashIcon /></ActionIcon>
                  </Tooltip>
                </div>
                {open && (
                  <div className="bpp-list-item-body">
                    {fields.map((f) => (
                      <TextField
                        key={f.key}
                        label={f.label}
                        required={f.required}
                        placeholder={f.placeholder}
                        value={String(item[f.key] ?? '')}
                        autoFocus={focusIndex === i && f === fields[0]}
                        error={errorFor?.(i, f.key)}
                        mono
                        onChange={(v) => patch(i, f.key, v)}
                      />
                    ))}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Group>
  );
}
