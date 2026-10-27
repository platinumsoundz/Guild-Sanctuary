'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import styles from './PersonalPlanner.module.css';

type PlannerTask = { id: string; title: string; date: string; done: boolean; createdAt: string };
type PlannerData = { version: 1; tasks: PlannerTask[]; notesByDate: Record<string, string> };

const EMPTY_DATA: PlannerData = { version: 1, tasks: [], notesByDate: {} };
const MAX_TASK_LENGTH = 120;
const MAX_NOTE_LENGTH = 5000;

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function parseData(raw: string | null): PlannerData {
  if (!raw) return EMPTY_DATA;
  try {
    const value: unknown = JSON.parse(raw);
    if (!value || typeof value !== 'object') return EMPTY_DATA;
    const candidate = value as Partial<PlannerData>;
    if (candidate.version !== 1 || !Array.isArray(candidate.tasks) || !candidate.notesByDate || typeof candidate.notesByDate !== 'object') return EMPTY_DATA;
    const tasks = candidate.tasks.filter((task): task is PlannerTask =>
      Boolean(task && typeof task === 'object' &&
        typeof task.id === 'string' && typeof task.title === 'string' &&
        task.title.length <= MAX_TASK_LENGTH && typeof task.date === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(task.date) && typeof task.done === 'boolean' &&
        typeof task.createdAt === 'string'),
    );
    const notesByDate = Object.fromEntries(Object.entries(candidate.notesByDate)
      .filter(([date, note]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof note === 'string')
      .map(([date, note]) => [date, note.slice(0, MAX_NOTE_LENGTH)]));
    return { version: 1, tasks, notesByDate };
  } catch {
    return EMPTY_DATA;
  }
}

export function PersonalPlanner({ userId }: { userId: string }) {
  const storageKey = `sanctuary-private-planner:v1:${userId}`;
  const [data, setData] = useState<PlannerData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [selectedDate, setSelectedDate] = useState(localDateKey);
  const [newTask, setNewTask] = useState('');
  const [status, setStatus] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    try {
      setData(parseData(window.localStorage.getItem(storageKey)));
    } catch {
      setStorageWarning(true);
    } finally {
      setReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!ready) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [data, ready, storageKey]);

  const tasks = useMemo(() => data.tasks.filter((task) => task.date === selectedDate), [data.tasks, selectedDate]);
  const completedCount = tasks.filter((task) => task.done).length;

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTask.trim();
    if (!title || title.length > MAX_TASK_LENGTH) return;
    const task: PlannerTask = { id: crypto.randomUUID(), title, date: selectedDate, done: false, createdAt: new Date().toISOString() };
    setData((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setNewTask('');
    setStatus('Task added to this day.');
  };

  const updateNote = (note: string) => {
    setData((current) => ({ ...current, notesByDate: { ...current.notesByDate, [selectedDate]: note.slice(0, MAX_NOTE_LENGTH) } }));
  };

  const exportData = () => {
    const payload = { exportedAt: new Date().toISOString(), format: 'sanctuary-private-planner-v1', ...data };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `sanctuary-planner-${localDateKey()}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('A planner export was prepared on this device.');
  };

  const clearData = () => {
    if (!window.confirm('Delete all planner tasks and daily notes saved in this browser for this account? This cannot be undone.')) return;
    setData(EMPTY_DATA);
    setStatus('All local planner data was cleared.');
  };

  return (
    <main className={styles.planner}>
      <p className={styles.eyebrow}>YOUR PRIVATE SPACE</p>
      <h1>Daily planner</h1>
      <p className={styles.intro}>A gentle place to choose a next step and leave yourself a note. There are no streaks or scores.</p>
      <div className={styles.privacy} role="note">
        <strong>Stored on this device only</strong>
        <span>This first version saves to this browser's local storage, scoped to your account ID. It is not synced across devices. Anyone with access to this browser profile may be able to access it. Export anything you want to keep before clearing browser data.</span>
      </div>
      {storageWarning && <p className={styles.warning} role="alert">Browser storage is unavailable or full. Changes may not survive a refresh; export or copy important notes before leaving.</p>}
      <label className={styles.dateLabel}>Day
        <input type="date" value={selectedDate} onChange={(event) => setSelectedDate(event.currentTarget.value)} />
      </label>
      <section className={styles.panel} aria-labelledby="tasks-heading">
        <div className={styles.sectionHeading}>
          <h2 id="tasks-heading">Small next steps</h2>
          <span>{completedCount} of {tasks.length} complete</span>
        </div>
        <form className={styles.addForm} onSubmit={addTask}>
          <label className={styles.visuallyHidden} htmlFor="planner-new-task">New task</label>
          <input id="planner-new-task" value={newTask} onChange={(event) => setNewTask(event.currentTarget.value)} maxLength={MAX_TASK_LENGTH} placeholder="What would help today?" />
          <button type="submit" disabled={!ready || !newTask.trim()}>Add task</button>
        </form>
        {tasks.length === 0 ? <p className={styles.empty}>Nothing planned yet. Add one small step if that would help.</p> : (
          <ul className={styles.taskList}>
            {tasks.map((task) => (
              <li key={task.id}>
                <label>
                  <input type="checkbox" checked={task.done} onChange={(event) => setData((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, done: event.currentTarget.checked } : item) }))} />
                  <span className={task.done ? styles.completed : undefined}>{task.title}</span>
                </label>
                <button type="button" className={styles.removeButton} aria-label={`Delete task: ${task.title}`} onClick={() => setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="notes-heading">
        <div className={styles.sectionHeading}>
          <h2 id="notes-heading">Daily note</h2>
          <span>Optional · private</span>
        </div>
        <label className={styles.noteLabel} htmlFor="planner-daily-note">What would you like to remember about this day?</label>
        <textarea id="planner-daily-note" rows={6} maxLength={MAX_NOTE_LENGTH} value={data.notesByDate[selectedDate] ?? ''} onChange={(event) => updateNote(event.currentTarget.value)} placeholder="A win, a challenge, a feeling, or anything worth noting…" />
        <p className={styles.characterCount}>{(data.notesByDate[selectedDate] ?? '').length} / {MAX_NOTE_LENGTH}</p>
      </section>
      <div className={styles.actions}>
        <button type="button" onClick={exportData} disabled={!ready}>Export my planner</button>
        <button type="button" className={styles.dangerButton} onClick={clearData} disabled={!ready}>Delete all local planner data</button>
      </div>
      <p className={styles.status} role="status" aria-live="polite">{status}</p>
    </main>
  );
}
