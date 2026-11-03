import { ReactNode, useId, useState } from 'react';
import { Collapse, UnstyledButton } from '@mantine/core';

const groupState = new Map<string, boolean>();

export const ChevronIcon = ({ className = '' }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="m9 6 6 6-6 6" />
  </svg>
);

interface GroupProps {
  id: string;
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;

  count?: number;

  dirty?: boolean;

  invalid?: boolean;

  action?: ReactNode;
}

export function Group({
  id,
  title,
  children,
  defaultOpen = false,
  count,
  dirty,
  invalid,
  action,
}: GroupProps) {
  const [open, setOpen] = useState(() => groupState.get(id) ?? defaultOpen);
  const bodyId = useId();
  const toggle = () => {
    const next = !open;
    groupState.set(id, next);
    setOpen(next);
  };
  return (
    <section className={`bpp-group${open ? ' is-open' : ''}${invalid ? ' is-invalid' : ''}`} data-group={id}>
      <div className="bpp-group-header">
        <UnstyledButton
          className="bpp-group-toggle"
          onClick={toggle}
          aria-expanded={open}
          aria-controls={bodyId}
          title={title}
        >
          <span className="bpp-group-title">{title}</span>
          {invalid ? (
            <span className="bpp-marker bpp-marker-error" title="Has validation errors" />
          ) : dirty ? (
            <span className="bpp-marker bpp-marker-dirty" title="Has values" />
          ) : null}
          {count ? <span className="bpp-count">{count}</span> : null}
        </UnstyledButton>
        {action}
        <UnstyledButton className="bpp-group-chevron" onClick={toggle} tabIndex={-1} aria-hidden="true">
          <ChevronIcon className={open ? 'is-open' : ''} />
        </UnstyledButton>
      </div>
      <Collapse expanded={open} transitionDuration={120} id={bodyId}>
        <div className="bpp-group-body">{children}</div>
      </Collapse>
    </section>
  );
}
