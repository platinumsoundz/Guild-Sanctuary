'use client';

import { useEffect, useMemo, useState, type FormEvent } from 'react';
import styles from './PersonalPlanner.module.css';

type PlannerTask = { id: string; title: string; date: string; done: boolean; createdAt: string };
type PlannerHabit = { id: string; title: string; checkedDates: string[]; createdAt: string };
type PlannerData = { version: 1; tasks: PlannerTask[]; notesByDate: Record<string, string>; habits: PlannerHabit[] };

const EMPTY_DATA: PlannerData = { version: 1, tasks: [], notesByDate: {}, habits: [] };
const MAX_HABIT_LENGTH = 80;
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
    const habits = Array.isArray(candidate.habits) ? candidate.habits.filter((habit): habit is PlannerHabit =>
      Boolean(habit && typeof habit === 'object' && typeof habit.id === 'string' &&
        typeof habit.title === 'string' && habit.title.trim().length > 0 && habit.title.length <= MAX_HABIT_LENGTH &&
        Array.isArray(habit.checkedDates) && habit.checkedDates.every((date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) &&
        typeof habit.createdAt === 'string'),
    ).map((habit) => ({ ...habit, checkedDates: [...new Set(habit.checkedDates)].slice(-366) })) : [];
    const notesByDate = Object.fromEntries(Object.entries(candidate.notesByDate)
      .filter(([date, note]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof note === 'string')
      .map(([date, note]) => [date, note.slice(0, MAX_NOTE_LENGTH)]));
    return { version: 1, tasks, notesByDate, habits };
  } catch {
    return EMPTY_DATA;
  }
}

export function PersonalPlanner({ userId }: { userId: string }) {
  const storageKey = `sanctuary-private-planner:v1:${userId}`;
  const [data, setData] = useState<PlannerData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [loadedStorageKey, setLoadedStorageKey] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(localDateKey);
  const [newTask, setNewTask] = useState('');
  const [newHabit, setNewHabit] = useState('');
  const [status, setStatus] = useState('');
  const [storageWarning, setStorageWarning] = useState(false);

  useEffect(() => {
    try {
      setData(parseData(window.localStorage.getItem(storageKey)));
    } catch {
      setStorageWarning(true);
    } finally {
      setLoadedStorageKey(storageKey);
      setReady(true);
    }
  }, [storageKey]);

  useEffect(() => {
    if (!ready || loadedStorageKey !== storageKey) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(data));
      setStorageWarning(false);
    } catch {
      setStorageWarning(true);
    }
  }, [data, loadedStorageKey, ready, storageKey]);

  const tasks = useMemo(() => data.tasks.filter((task) => task.date === selectedDate), [data.tasks, selectedDate]);
  const completedCount = tasks.filter((task) => task.done).length;
  const habitsCheckedToday = data.habits.filter((habit) => habit.checkedDates.includes(selectedDate)).length;
  const reviewDays = useMemo(() => Array.from({ length: 7 }, (_, index) => {
    const date = new Date(`${selectedDate}T12:00:00`);
    date.setDate(date.getDate() - (6 - index));
    return localDateKey(date);
  }), [selectedDate]);
  const reviewTasks = useMemo(() => data.tasks.filter((task) => reviewDays.includes(task.date)), [data.tasks, reviewDays]);
  const reviewCompleted = reviewTasks.filter((task) => task.done).length;
  const reviewNoteDays = reviewDays.filter((date) => Boolean(data.notesByDate[date]?.trim())).length;
  const reviewHabitCheckins = data.habits.reduce((count, habit) => count + habit.checkedDates.filter((date) => reviewDays.includes(date)).length, 0);

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTask.trim();
    if (!title || title.length > MAX_TASK_LENGTH) return;
    const task: PlannerTask = { id: crypto.randomUUID(), title, date: selectedDate, done: false, createdAt: new Date().toISOString() };
    setData((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setNewTask('');
    setStatus('Task added to this day.');
  };

  const addHabit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newHabit.trim();
    if (!title || title.length > MAX_HABIT_LENGTH || data.habits.length >= 20) return;
    const habit: PlannerHabit = { id: crypto.randomUUID(), title, checkedDates: [], createdAt: new Date().toISOString() };
    setData((current) => ({ ...current, habits: [...current.habits, habit] }));
    setNewHabit('');
    setStatus('Habit added. Check it on any day that feels right.');
  };

  const toggleHabit = (habitId: string, checked: boolean) => {
    setData((current) => ({ ...current, habits: current.habits.map((habit) => {
      if (habit.id !== habitId) return habit;
      const dates = checked ? [...habit.checkedDates.filter((date) => date !== selectedDate), selectedDate] : habit.checkedDates.filter((date) => date !== selectedDate);
      return { ...habit, checkedDates: dates };
    }) }));
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
    if (!window.confirm('Delete all planner tasks, habits, check-ins, and daily notes saved in this browser for this account? This cannot be undone.')) return;
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
                  <input type="checkbox" checked={task.done} onChange={(event) => { const done = event.currentTarget.checked; setData((current) => ({ ...current, tasks: current.tasks.map((item) => item.id === task.id ? { ...item, done } : item) })); }} />
                  <span className={task.done ? styles.completed : undefined}>{task.title}</span>
                </label>
                <button type="button" className={styles.removeButton} aria-label={`Delete task: ${task.title}`} onClick={() => setData((current) => ({ ...current, tasks: current.tasks.filter((item) => item.id !== task.id) }))}>Delete</button>
              </li>
            ))}
          </ul>
        )}
      </section>
      <section className={styles.panel} aria-labelledby="review-heading">
        <div className={styles.sectionHeading}>
          <h2 id="review-heading">Your seven-day review</h2>
          <span>Ending {selectedDate}</span>
        </div>
        <p className={styles.reviewCopy}>A simple view of what you chose to record—not a score or a judgement.</p>
        <div className={styles.reviewStats}>
          <div><strong>{reviewTasks.length}</strong><span>tasks planned</span></div>
          <div><strong>{reviewCompleted}</strong><span>tasks completed</span></div>
          <div><strong>{reviewNoteDays}</strong><span>days with notes</span></div>
          <div><strong>{reviewHabitCheckins}</strong><span>habit check-ins</span></div>
        </div>
      </section>
      <section className={styles.panel} aria-labelledby="habits-heading">
        <div className={styles.sectionHeading}>
          <h2 id="habits-heading">Gentle habits</h2>
          <span>{habitsCheckedToday} of {data.habits.length} checked today</span>
        </div>
        <p className={styles.reviewCopy}>Choose routines that support you. Missed days are just days; there are no streaks or penalties.</p>
        <form className={styles.addForm} onSubmit={addHabit}>
          <label className={styles.visuallyHidden} htmlFor="planner-new-habit">New habit</label>
          <input id="planner-new-habit" value={newHabit} onChange={(event) => setNewHabit(event.currentTarget.value)} maxLength={MAX_HABIT_LENGTH} placeholder="e.g. Take a short walk" />
          <button type="submit" disabled={!ready || !newHabit.trim() || data.habits.length >= 20}>Add habit</button>
        </form>
        {data.habits.length === 0 ? <p className={styles.empty}>Add a routine you would like to make room for.</p> : (
          <ul className={styles.taskList}>
            {data.habits.map((habit) => (
              <li key={habit.id}>
                <label>
                  <input type="checkbox" checked={habit.checkedDates.includes(selectedDate)} onChange={(event) => toggleHabit(habit.id, event.currentTarget.checked)} />
                  <span>{habit.title}</span>
                </label>
                <button type="button" className={styles.removeButton} aria-label={\`Delete habit: \${habit.title}\`} onClick={() => setData((current) => ({ ...current, habits: current.habits.filter((item) => item.id !== habit.id) }))}>Delete</button>
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
