export const focus = 'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40';

const base = `inline-flex h-9 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-md px-3.5 text-[13px] font-medium [font-family:inherit] transition disabled:cursor-not-allowed disabled:opacity-45 ${focus}`;

export const btn = `${base} border border-slate-300 bg-white text-slate-700 shadow-sm hover:border-slate-400 hover:bg-slate-50 disabled:shadow-none`;
export const btnPrimary = `${base} border border-accent bg-accent text-white shadow-sm hover:border-[#2753ad] hover:bg-[#2753ad] disabled:shadow-none`;
export const btnGhost = `${base} border border-transparent bg-transparent px-2.5 text-slate-600 hover:bg-slate-100 hover:text-slate-900`;
export const btnDanger = `${btnGhost} ml-auto hover:!bg-red-50 hover:!text-red-700`;

export const field =
  'h-9 w-full rounded-md border border-slate-300 bg-white px-3 text-[13px] text-slate-800 shadow-sm outline-none [font-family:inherit] placeholder:text-slate-400 focus:border-accent focus:ring-2 focus:ring-accent/25';

export const card = 'overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm';
export const cardTitle = 'm-0 text-[13px] font-semibold text-slate-900';
export const chip =
  'inline-flex items-center rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600';
export const emptyState = 'px-6 py-10 text-center text-[13px] text-slate-400';

export const tabClass = (active: boolean) =>
  `relative flex h-full cursor-pointer items-center gap-2 border-0 bg-transparent px-4 text-[13px] [font-family:inherit] transition ${focus} ${
    active
      ? 'font-semibold text-slate-900 shadow-[inset_0_-2px_0_#3061c4]'
      : 'font-medium text-slate-500 hover:bg-slate-50 hover:text-slate-800'
  }`;
