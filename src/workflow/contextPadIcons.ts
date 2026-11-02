const svg = (body: string) =>
  `<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#2f3640" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const ICONS = {
  endEvent: svg('<circle cx="12" cy="12" r="7.5" stroke-width="3.6"/>'),
  gateway: svg('<path d="M12 3 21 12 12 21 3 12Z"/>'),
  task: svg('<rect x="3" y="6" width="18" height="12" rx="3"/>'),
  intermediateEvent: svg('<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="6"/>'),
  textAnnotation: svg('<path d="M8 4H4v16h4"/><path d="M11 8h9M11 12h9M11 16h6"/>'),
  wrench: svg('<path d="M14.7 6.3a4 4 0 0 0-5.4 5.1L3 17.7 6.3 21l6.3-6.3a4 4 0 0 0 5.1-5.4l-2.6 2.6-2.4-.6-.6-2.4z"/>'),
  connect: svg('<path d="M4 20 19 5"/><path d="M10 5h9v9"/>'),
  trash: svg('<path d="M4 7h16"/><path d="M9 7V4h6v3"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v6M14 11v6"/>'),
  laneAbove: svg('<rect x="3" y="9" width="18" height="11" rx="1"/><path d="M12 2v5M9.5 4.5h5"/>'),
  laneBelow: svg('<rect x="3" y="4" width="18" height="11" rx="1"/><path d="M12 17v5M9.5 19.5h5"/>'),
  laneDivide2: svg('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 12h18"/>'),
  laneDivide3: svg('<rect x="3" y="4" width="18" height="16" rx="1"/><path d="M3 9.3h18M3 14.7h18"/>'),
};
