import type { ToastLevel } from './useToast';
import type { Versioning } from '../workflow/versioning/useVersioning';

export function useVersionActions(
  versioning: Versioning,
  notify: (message: string, level?: ToastLevel) => void,
) {
  const editAsDraft = (versionId: string): boolean => {
    let result = versioning.editAsDraft(versionId);

    if (!result.ok && result.code === 'exists') {
      const version = versioning.versions.find((v) => v.id === versionId);
      const label = `v${version?.version}`;
      const confirmed = confirm(
        `${result.reason}\n\nRestoring ${label} as your draft replaces it, and those changes will be lost.\n` +
          `To keep working on your draft instead, choose “Back to draft”.\n\nReplace the draft with ${label}?`,
      );
      if (!confirmed) return false;
      result = versioning.editAsDraft(versionId, { replace: true });
    }

    if (!result.ok) {
      notify(result.reason, 'error');
      return false;
    }
    return true;
  };

  const backToDraft = () => {
    const result = versioning.openDraft();
    if (!result.ok) notify(result.reason, 'error');
  };

  return { editAsDraft, backToDraft };
}
