import type { AdminUserDto, Equipment, ExerciseDto } from '@shared/schemas';
import { type FormEvent, useState } from 'react';
import { Card } from '@/components/Card';
import { IconButton } from '@/components/IconButton';
import { TrashIcon } from '@/components/icons';
import { useAuth } from '@/features/auth/useAuth';
import { EQUIPMENT_LABELS, EQUIPMENT_OPTIONS } from '@/features/exercises/useExercises';
import { ApiError } from '@/lib/api';
import {
  useAdminExercises,
  useAdminUsers,
  useCreateAdminExercise,
  useDeleteAdminExercise,
  useUpdateAdminExercise,
  useUpdateUserRole,
} from './useAdmin';

const inputClass =
  'min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-2 text-sm text-text';
const primaryBtn =
  'shrink-0 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-fg transition-opacity hover:opacity-90 disabled:opacity-50';
const ghostBtn =
  'rounded-lg border border-border px-2 py-1 text-xs text-text-muted hover:text-text';
const errorText = 'text-xs text-negative';

function CreateGlobalExerciseForm() {
  const create = useCreateAdminExercise();
  const [name, setName] = useState('');
  const [muscleGroup, setMuscleGroup] = useState('');
  const [equipment, setEquipment] = useState<Equipment>('other');

  function submit(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '') return;
    const mg = muscleGroup.trim();
    create.mutate(
      { name: trimmed, equipment, muscleGroup: mg === '' ? undefined : mg },
      {
        onSuccess: () => {
          setName('');
          setMuscleGroup('');
        },
      },
    );
  }

  return (
    <form onSubmit={submit} className="space-y-2">
      <div className="flex flex-wrap gap-2">
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nome esercizio"
          aria-label="Nome esercizio"
          className={inputClass}
          maxLength={120}
        />
        <input
          type="text"
          value={muscleGroup}
          onChange={(e) => setMuscleGroup(e.target.value)}
          placeholder="Gruppo muscolare (opzionale)"
          aria-label="Gruppo muscolare"
          className={inputClass}
          maxLength={120}
        />
        <select
          value={equipment}
          onChange={(e) => setEquipment(e.target.value as Equipment)}
          aria-label="Attrezzatura"
          className="rounded-lg border border-border bg-surface px-2 py-2 text-sm text-text"
        >
          {EQUIPMENT_OPTIONS.map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={create.isPending || name.trim() === ''}
          className={primaryBtn}
        >
          Aggiungi
        </button>
      </div>
      {create.isError && <p className={errorText}>Creazione non riuscita. Riprova.</p>}
    </form>
  );
}

function GlobalExerciseRow({ exercise }: { exercise: ExerciseDto }) {
  const update = useUpdateAdminExercise();
  const del = useDeleteAdminExercise();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(exercise.name);

  function save(e: FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed === '' || trimmed === exercise.name) {
      setEditing(false);
      return;
    }
    update.mutate(
      { id: exercise.id, input: { name: trimmed } },
      { onSuccess: () => setEditing(false) },
    );
  }

  const deleteInUse = del.error instanceof ApiError && del.error.status === 409;

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <form onSubmit={save} className="flex min-w-0 flex-1 gap-2">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              aria-label={`Nuovo nome per ${exercise.name}`}
              className={inputClass}
              maxLength={120}
            />
            <button type="submit" disabled={update.isPending} className={ghostBtn}>
              Salva
            </button>
          </form>
        ) : (
          <div className="min-w-0 flex-1">
            <span className="truncate text-sm font-medium text-text">{exercise.name}</span>
            <p className="mt-0.5 text-xs text-text-muted">
              {EQUIPMENT_LABELS[exercise.equipment]}
              {exercise.muscleGroup ? ` · ${exercise.muscleGroup}` : ''}
            </p>
          </div>
        )}
        <div className="flex shrink-0 items-center gap-1">
          <button
            type="button"
            onClick={() => {
              setName(exercise.name);
              setEditing((v) => !v);
            }}
            className={ghostBtn}
          >
            {editing ? 'Annulla' : 'Rinomina'}
          </button>
          <IconButton label={`Elimina ${exercise.name}`} onClick={() => del.mutate(exercise.id)}>
            <TrashIcon className="h-4 w-4" />
          </IconButton>
        </div>
      </div>
      {update.isError && <p className={`mt-2 ${errorText}`}>Rinomina non riuscita.</p>}
      {del.isError && (
        <p className={`mt-2 ${errorText}`}>
          {deleteInUse
            ? 'Impossibile eliminare: esercizio in uso in una o più schede.'
            : 'Eliminazione non riuscita.'}
        </p>
      )}
    </Card>
  );
}

function UserRow({ user, isSelf }: { user: AdminUserDto; isSelf: boolean }) {
  const updateRole = useUpdateUserRole();
  const nextRole = user.role === 'admin' ? 'user' : 'admin';

  return (
    <Card className="p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <span className="truncate text-sm font-medium text-text">{user.email}</span>
          <p className="mt-0.5 text-xs text-text-muted">
            {user.name ?? '—'}
            <span className="ml-2 rounded-full bg-accent/15 px-2 py-0.5 text-[10px] font-medium uppercase text-accent">
              {user.role}
            </span>
          </p>
        </div>
        <button
          type="button"
          disabled={isSelf || updateRole.isPending}
          title={isSelf ? 'Non puoi cambiare il tuo ruolo' : undefined}
          onClick={() => updateRole.mutate({ id: user.id, role: nextRole })}
          className={`${ghostBtn} disabled:opacity-40`}
        >
          {nextRole === 'admin' ? 'Rendi admin' : 'Rendi utente'}
        </button>
      </div>
      {updateRole.isError && <p className={`mt-2 ${errorText}`}>Ruolo non aggiornato.</p>}
    </Card>
  );
}

/** Contenuto del pannello: monta le query admin — reso solo per gli admin. */
function AdminPanel({ currentUserId }: { currentUserId: string }) {
  const exercises = useAdminExercises();
  const users = useAdminUsers();

  return (
    <div className="space-y-8">
      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Catalogo globale</h2>
        <CreateGlobalExerciseForm />
        {exercises.isPending ? (
          <p className="text-sm text-text-muted">Caricamento…</p>
        ) : exercises.isError ? (
          <p className="text-sm text-negative">Impossibile caricare il catalogo.</p>
        ) : (exercises.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Nessun esercizio nel catalogo globale.</p>
        ) : (
          <ul aria-label="Catalogo globale" className="space-y-2">
            {exercises.data?.map((ex) => (
              <li key={ex.id}>
                <GlobalExerciseRow exercise={ex} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-base font-semibold text-text">Utenti</h2>
        {users.isPending ? (
          <p className="text-sm text-text-muted">Caricamento…</p>
        ) : users.isError ? (
          <p className="text-sm text-negative">Impossibile caricare gli utenti.</p>
        ) : (users.data ?? []).length === 0 ? (
          <p className="text-sm text-text-muted">Nessun utente.</p>
        ) : (
          <ul aria-label="Utenti" className="space-y-2">
            {users.data?.map((u) => (
              <li key={u.id}>
                <UserRow user={u} isSelf={u.id === currentUserId} />
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

export function AdminPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return <p className="text-sm text-text-muted">Caricamento…</p>;
  }
  // Gate lato client sul ruolo: le query admin (AdminPanel) non partono per i non-admin.
  if (user?.role !== 'admin') {
    return <p className="text-sm text-text-muted">Accesso riservato agli amministratori.</p>;
  }

  return <AdminPanel currentUserId={user.id} />;
}
