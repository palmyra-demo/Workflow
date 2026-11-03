import { btn, btnPrimary, field } from './styles';

interface PublishFormProps {
  tag: string;
  comment: string;
  canPublish: boolean;
  onTagChange: (value: string) => void;
  onCommentChange: (value: string) => void;
  onSubmit: () => void;
  onCancel: () => void;
}

const OptionalLabel = ({ htmlFor, children }: { htmlFor: string; children: string }) => (
  <label htmlFor={htmlFor} className="mb-1.5 block text-[12px] font-medium text-slate-600">
    {children} <span className="font-normal text-slate-400">(optional)</span>
  </label>
);

export function PublishForm({
  tag,
  comment,
  canPublish,
  onTagChange,
  onCommentChange,
  onSubmit,
  onCancel,
}: PublishFormProps) {
  return (
    <section className="shrink-0 border-b border-slate-200 bg-white px-5 py-4 shadow-sm">
      <div className="mx-auto flex max-w-[1280px] flex-wrap items-end gap-3">
        <div className="w-[200px]">
          <OptionalLabel htmlFor="ver-tag">Version tag</OptionalLabel>
          <input
            id="ver-tag"
            value={tag}
            onChange={(e) => onTagChange(e.target.value)}
            placeholder="e.g. 1.2.0"
            className={field}
          />
        </div>
        <div className="min-w-[260px] flex-1">
          <OptionalLabel htmlFor="ver-notes">Release notes</OptionalLabel>
          <input
            id="ver-notes"
            autoFocus
            value={comment}
            onChange={(e) => onCommentChange(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && canPublish) onSubmit();
            }}
            placeholder="Describe what changed in this version"
            className={field}
          />
        </div>
        <button type="button" className={btnPrimary} onClick={onSubmit} disabled={!canPublish}>
          Create version
        </button>
        <button type="button" className={btn} onClick={onCancel}>
          Cancel
        </button>
      </div>
    </section>
  );
}
