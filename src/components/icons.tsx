import { ReactNode } from 'react';

const make = (body: ReactNode) => ({ className = 'h-4 w-4' }: { className?: string }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
    {body}
  </svg>
);

export const UndoIcon = make(<><path d="M9 14 4 9l5-5" /><path d="M4 9h10a6 6 0 0 1 0 12h-3" /></>);
export const RedoIcon = make(<><path d="m15 14 5-5-5-5" /><path d="M20 9H10a6 6 0 0 0 0 12h3" /></>);
export const ZoomInIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M11 8v6M8 11h6" /></>);
export const ZoomOutIcon = make(<><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5M8 11h6" /></>);
export const FitIcon = make(<><path d="M4 9V5a1 1 0 0 1 1-1h4M15 4h4a1 1 0 0 1 1 1v4M20 15v4a1 1 0 0 1-1 1h-4M9 20H5a1 1 0 0 1-1-1v-4" /></>);
export const DownloadIcon = make(<><path d="M12 4v11m0 0-4-4m4 4 4-4" /><path d="M4 19h16" /></>);
export const UploadIcon = make(<><path d="M12 15V4m0 0L8 8m4-4 4 4" /><path d="M4 19h16" /></>);
export const CheckIcon = make(<path d="m5 12 5 5 9-10" />);
export const TrashIcon = make(<><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" /></>);
export const SparkIcon = make(<><path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8z" /><path d="M19 17v4M17 19h4" /></>);
export const AlertIcon = make(<><path d="M12 4 3 20h18z" /><path d="M12 10v4M12 17h.01" /></>);
export const CloseIcon = make(<path d="M6 6l12 12M18 6 6 18" />);
export const FlowIcon = make(
  <>
    <circle cx="5" cy="6" r="2.2" /><circle cx="19" cy="6" r="2.2" /><circle cx="12" cy="18" r="2.2" />
    <path d="M7 6h10M6.2 8l4.8 8M17.8 8l-4.8 8" />
  </>,
);

export const HistoryIcon = make(<><path d="M3 12a9 9 0 1 0 3-6.7L3 8" /><path d="M3 3v5h5" /><path d="M12 7v5l4 2" /></>);
export const RestoreIcon = make(<><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" /><path d="M3 3v5h5" /></>);
export const CompareIcon = make(<><circle cx="18" cy="18" r="3" /><circle cx="6" cy="6" r="3" /><path d="M13 6h3a2 2 0 0 1 2 2v7" /><path d="M11 18H8a2 2 0 0 1-2-2V9" /></>);
export const SaveIcon = make(<><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" /><path d="M17 21v-8H7v8" /><path d="M7 3v5h8" /></>);
export const LockIcon = make(<><rect width="18" height="11" x="3" y="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>);
export const PublishIcon = make(<><path d="M12 13v8" /><path d="m8 17 4-4 4 4" /><path d="M20 17.6A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.3" /></>);
export const PencilIcon = make(<><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" /><path d="m15 5 4 4" /></>);
export const EyeIcon = make(<><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" /></>);
