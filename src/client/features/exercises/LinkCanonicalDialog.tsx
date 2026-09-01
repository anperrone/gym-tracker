import type { ExerciseDto } from '@shared/schemas';
import { useEffect } from 'react';
import { IconButton } from '@/components/IconButton';
import { CloseIcon } from '@/components/icons';
import { ExercisePicker } from './ExercisePicker';
import { useUpdateExercise } from './useExercises';

type LinkCanonicalDialogProps = {
  /** L'esercizio custom da collegare a una voce canonica. */
  exercise: ExerciseDto;
  /** Nome della canonica attuale (già risolto dal chiamante), se presente. */
  canonicalName: string | null;
  onClose: () => void;
};

/**
 * Modale per collegare un esercizio custom a una voce del catalogo (canonica),
 * così da unificare la progressione. Consente anche lo scollegamento.
 */
export function LinkCanonicalDialog({
  exercise,
  canonicalName,
  onClose,
}: LinkCanonicalDialogProps) {
  const update = useUpdateExercise();
  const titleId = `link-canonical-${exercise.id}`;

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function link(canonicalExerciseId: string | null) {
    update.mutate({ id: exercise.id, canonicalExerciseId }, { onSuccess: onClose });
  }

  return (
    <div className="fixed inset-0 z-20 flex items-end justify-center p-0 sm:items-center sm:p-4">
      {/* Backdrop cliccabile (chiude la modale). */}
      <button
        type="button"
        aria-label="Chiudi"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-black/50"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative w-full max-w-md rounded-t-2xl border border-border bg-surface p-4 shadow-xl sm:rounded-2xl"
      >
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h2 id={titleId} className="truncate text-base font-semibold text-text">
              Collega a voce canonica
            </h2>
            <p className="truncate text-xs text-text-muted">{exercise.name}</p>
          </div>
          <IconButton label="Chiudi" onClick={onClose}>
            <CloseIcon className="h-4 w-4" />
          </IconButton>
        </div>

        {canonicalName ? (
          <div className="mb-3 flex items-center justify-between gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2">
            <span className="min-w-0 truncate text-sm text-text">
              Collegato a <b>{canonicalName}</b>
            </span>
            <button
              type="button"
              onClick={() => link(null)}
              disabled={update.isPending}
              className="shrink-0 text-xs font-medium text-accent hover:underline disabled:opacity-50"
            >
              Scollega
            </button>
          </div>
        ) : (
          <p className="mb-3 text-xs text-text-muted">
            Scegli una voce del catalogo per unificare la progressione.
          </p>
        )}

        <ExercisePicker
          listLabel="Voci canoniche"
          filter={(ex) => !ex.isCustom && ex.id !== exercise.id}
          onSelect={(ex) => link(ex.id)}
        />

        {update.isError && <p className="mt-2 text-xs text-negative">Errore nel collegamento.</p>}
      </div>
    </div>
  );
}
