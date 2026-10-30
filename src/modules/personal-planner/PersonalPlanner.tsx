'use client';

import { useEffect, useMemo, useRef, useState, type FormEvent } from 'react';
import {
  CalendarDays, Check, ChevronLeft, ChevronRight, Clock3, Download,
  ListTodo, Plus, Sparkles, Target, Trash2,
} from 'lucide-react';
import { getSupabaseBrowserClient } from '@/services/supabase';
import { DailyReflection } from '@/modules/practice';
import { SelfDiscoveryCentre } from '@/modules/self-discovery/components/SelfDiscoveryCentre';
import type { WorldType } from '@/types/database';
import styles from './PersonalPlanner.module.css';

type PlannerPriority = 'low' | 'normal' | 'high';
type PlannerCategory = 'personal' | 'work' | 'health' | 'community';
type PlannerTask = {
  id: string;
  title: string;
  date: string;
  done: boolean;
  createdAt: string;
  dueTime?: string;
  priority?: PlannerPriority;
  category?: PlannerCategory;
};
type PlannerHabit = { id: string; title: string; checkedDates: string[]; createdAt: string };
type PlannerData = { version: 1; tasks: PlannerTask[]; notesByDate: Record<string, string>; habits: PlannerHabit[] };

const EMPTY_DATA: PlannerData = { version: 1, tasks: [], notesByDate: {}, habits: [] };
const MAX_TASK_LENGTH = 120;
const MAX_NOTE_LENGTH = 5000;
const MAX_HABIT_LENGTH = 80;
const CATEGORY_LABELS: Record<PlannerCategory, string> = {
  personal: 'Personal', work: 'Work', health: 'Health', community: 'Community',
};

function localDateKey(date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function dateFromKey(key: string): Date {
  return new Date(`${key}T12:00:00`);
}

function shiftDate(key: string, amount: number): string {
  const date = dateFromKey(key);
  date.setDate(date.getDate() + amount);
  return localDateKey(date);
}

function parseData(value: unknown): PlannerData {
  if (!value || typeof value !== 'object') return EMPTY_DATA;
  const candidate = value as Partial<PlannerData>;
  if (candidate.version !== 1 || !Array.isArray(candidate.tasks) ||
      !candidate.notesByDate || typeof candidate.notesByDate !== 'object') return EMPTY_DATA;
  const tasks = candidate.tasks.filter((task): task is PlannerTask =>
    Boolean(task && typeof task === 'object' && typeof task.id === 'string' &&
      typeof task.title === 'string' && task.title.trim().length > 0 &&
      task.title.length <= MAX_TASK_LENGTH && typeof task.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(task.date) && typeof task.done === 'boolean' &&
      typeof task.createdAt === 'string'),
  ).map((task) => ({
    ...task,
    priority: task.priority === 'high' || task.priority === 'low' ? task.priority : 'normal',
    category: task.category && task.category in CATEGORY_LABELS ? task.category : 'personal',
    dueTime: typeof task.dueTime === 'string' && /^([01]\d|2[0-3]):[0-5]\d$/.test(task.dueTime) ? task.dueTime : undefined,
  }));
  const habits = Array.isArray(candidate.habits) ? candidate.habits.filter((habit): habit is PlannerHabit =>
    Boolean(habit && typeof habit === 'object' && typeof habit.id === 'string' &&
      typeof habit.title === 'string' && habit.title.trim().length > 0 &&
      habit.title.length <= MAX_HABIT_LENGTH && Array.isArray(habit.checkedDates) &&
      habit.checkedDates.every((date) => typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) &&
      typeof habit.createdAt === 'string'),
  ).map((habit) => ({ ...habit, checkedDates: [...new Set(habit.checkedDates)].slice(-366) })) : [];
  const notesByDate = Object.fromEntries(Object.entries(candidate.notesByDate)
    .filter(([date, note]) => /^\d{4}-\d{2}-\d{2}$/.test(date) && typeof note === 'string')
    .map(([date, note]) => [date, note.slice(0, MAX_NOTE_LENGTH)]));
  return { version: 1, tasks, habits, notesByDate };
}

export function PersonalPlanner({ userId, worldType = 'sanctuary' }: { userId: string; worldType?: WorldType }) {
  const storageKey = `${worldType}-private-planner:v1:${userId}`;
  const [data, setData] = useState<PlannerData>(EMPTY_DATA);
  const [ready, setReady] = useState(false);
  const [loadedKey, setLoadedKey] = useState<string | null>(null);
  const [databaseReadyKey, setDatabaseReadyKey] = useState<string | null>(null);
  const [storageError, setStorageError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [selectedDate, setSelectedDate] = useState(localDateKey);
  const [newTask, setNewTask] = useState('');
  const [newTime, setNewTime] = useState('');
  const [newPriority, setNewPriority] = useState<PlannerPriority>('normal');
  const [newCategory, setNewCategory] = useState<PlannerCategory>('personal');
  const [newHabit, setNewHabit] = useState('');
  const [status, setStatus] = useState('');
  const saveQueue = useRef<Promise<void>>(Promise.resolve());
  const saveGeneration = useRef(0);
  const sessionReady = ready && loadedKey === storageKey && databaseReadyKey === storageKey;
  const visibleData = sessionReady ? data : EMPTY_DATA;
  const today = localDateKey();

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setLoadedKey(null);
    setDatabaseReadyKey(null);
    setStorageError(null);
    setSaveState('saved');
    setStatus('');
    setNewTask('');
    setNewHabit('');

    const load = async () => {
      try {
        const client = getSupabaseBrowserClient();
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError) throw new Error(`Your sign-in could not be verified: ${authError.message}`);
        if (!authData.user || authData.user.id !== userId) {
          throw new Error('Sign in with the same account to open your private planner.');
        }
        const { data: saved, error } = await client.from('personal_planner_data')
          .select('planner_data')
          .eq('user_id', userId)
          .eq('world_type', worldType)
          .maybeSingle();
        if (error) throw new Error(`Your planner could not be loaded: ${error.message}`);

        let loaded = saved?.planner_data ? parseData(saved.planner_data) : null;
        if (!saved) {
          let legacy: string | null;
          try { legacy = window.localStorage.getItem(storageKey); }
          catch { throw new Error('Your previous browser planner could not be read. Nothing has been deleted; allow browser storage and reload to transfer it.'); }
          if (legacy) {
            try { loaded = parseData(JSON.parse(legacy)); }
            catch { loaded = EMPTY_DATA; }
            const hasContent = loaded.tasks.length > 0 || loaded.habits.length > 0 ||
              Object.values(loaded.notesByDate).some((note) => note.trim().length > 0);
            if (hasContent) {
              const { error: importError } = await client.from('personal_planner_data')
                .upsert({ user_id: userId, world_type: worldType, planner_data: loaded }, { onConflict: 'user_id,world_type' });
              if (importError) throw new Error(`Your existing planner could not be transferred: ${importError.message}`);
              try {
                window.localStorage.removeItem(storageKey);
                setStatus('Your previous planner has been safely transferred to your account.');
              } catch {
                setStatus('Your planner is saved to your account. The old browser copy could not be removed.');
              }
            }
          }
        }
        if (cancelled) return;
        setData(loaded ?? EMPTY_DATA);
        setDatabaseReadyKey(storageKey);
      } catch (error) {
        if (cancelled) return;
        setData(EMPTY_DATA);
        setDatabaseReadyKey(null);
        setStorageError(error instanceof Error ? error.message : 'The planner database could not be reached.');
      } finally {
        if (!cancelled) { setLoadedKey(storageKey); setReady(true); }
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [storageKey, userId, worldType]);

  useEffect(() => {
    if (!sessionReady) return;
    const generation = ++saveGeneration.current;
    setSaveState('saving');
    const timeout = window.setTimeout(() => {
      const snapshot = JSON.parse(JSON.stringify(data)) as PlannerData;
      saveQueue.current = saveQueue.current.catch(() => undefined).then(async () => {
        if (generation !== saveGeneration.current) return;
        const client = getSupabaseBrowserClient();
        const { data: authData, error: authError } = await client.auth.getUser();
        if (authError || !authData.user || authData.user.id !== userId) {
          throw new Error('Your active account changed. Sign in again before saving planner changes.');
        }
        const { error } = await client.from('personal_planner_data')
          .upsert({ user_id: userId, world_type: worldType, planner_data: snapshot }, { onConflict: 'user_id,world_type' });
        if (error) throw new Error(error.message);
      }).then(() => {
        if (generation === saveGeneration.current) { setSaveState('saved'); setStorageError(null); }
      }).catch((error: unknown) => {
        if (generation === saveGeneration.current) {
          setSaveState('error');
          setStorageError(error instanceof Error ? error.message : 'Planner changes could not be saved.');
        }
      });
    }, 400);
    return () => window.clearTimeout(timeout);
  }, [data, sessionReady, storageKey, userId, worldType]);

  const weekDays = useMemo(() => {
    const date = dateFromKey(selectedDate);
    const mondayOffset = (date.getDay() + 6) % 7;
    const monday = shiftDate(selectedDate, -mondayOffset);
    return Array.from({ length: 7 }, (_, index) => shiftDate(monday, index));
  }, [selectedDate]);
  const dayTasks = useMemo(() => visibleData.tasks
    .filter((task) => task.date === selectedDate)
    .sort((a, b) => Number(a.done) - Number(b.done) ||
      ({ high: 0, normal: 1, low: 2 }[a.priority ?? 'normal'] - { high: 0, normal: 1, low: 2 }[b.priority ?? 'normal']) ||
      (a.dueTime ?? '99:99').localeCompare(b.dueTime ?? '99:99')), [visibleData.tasks, selectedDate]);
  const openCount = dayTasks.filter((task) => !task.done).length;
  const completedCount = dayTasks.length - openCount;
  const habitsChecked = visibleData.habits.filter((habit) => habit.checkedDates.includes(selectedDate)).length;
  const weekTasks = visibleData.tasks.filter((task) => weekDays.includes(task.date));
  const weekCompleted = weekTasks.filter((task) => task.done).length;
  const weekNotes = weekDays.filter((day) => Boolean(visibleData.notesByDate[day]?.trim())).length;
  const weekHabits = visibleData.habits.reduce((total, habit) => total + habit.checkedDates.filter((day) => weekDays.includes(day)).length, 0);
  const completion = weekTasks.length ? Math.round((weekCompleted / weekTasks.length) * 100) : 0;
  const note = visibleData.notesByDate[selectedDate] ?? '';

  const addTask = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newTask.trim();
    if (!title || title.length > MAX_TASK_LENGTH || !sessionReady) return;
    const task: PlannerTask = {
      id: crypto.randomUUID(), title, date: selectedDate, done: false,
      createdAt: new Date().toISOString(), dueTime: newTime || undefined,
      priority: newPriority, category: newCategory,
    };
    setData((current) => ({ ...current, tasks: [...current.tasks, task] }));
    setNewTask('');
    setNewTime('');
    setNewPriority('normal');
    setNewCategory('personal');
    setStatus('Task added to your day.');
  };

  const toggleTask = (id: string, done: boolean) => setData((current) => ({
    ...current, tasks: current.tasks.map((task) => task.id === id ? { ...task, done } : task),
  }));
  const deleteTask = (id: string) => setData((current) => ({ ...current, tasks: current.tasks.filter((task) => task.id !== id) }));
  const toggleHabit = (id: string, checked: boolean) => setData((current) => ({
    ...current, habits: current.habits.map((habit) => habit.id !== id ? habit : {
      ...habit, checkedDates: checked
        ? [...new Set([...habit.checkedDates, selectedDate])].slice(-366)
        : habit.checkedDates.filter((day) => day !== selectedDate),
    }),
  }));
  const addHabit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const title = newHabit.trim();
    if (!title || title.length > MAX_HABIT_LENGTH || visibleData.habits.length >= 20 || !sessionReady) return;
    setData((current) => ({ ...current, habits: [...current.habits, { id: crypto.randomUUID(), title, checkedDates: [], createdAt: new Date().toISOString() }] }));
    setNewHabit('');
  };
  const updateNote = (value: string) => setData((current) => ({
    ...current, notesByDate: { ...current.notesByDate, [selectedDate]: value.slice(0, MAX_NOTE_LENGTH) },
  }));
  const exportData = () => {
    const payload = { exportedAt: new Date().toISOString(), format: `${worldType}-private-planner-v1`, ...visibleData };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${worldType}-planner-${today}.json`;
    anchor.click();
    URL.revokeObjectURL(url);
    setStatus('Your planner export is ready.');
  };
  const clearData = () => {
    if (!window.confirm('Clear all tasks, habits, check-ins and notes in this planner for this world? This cannot be undone.')) return;
    setData(EMPTY_DATA);
    setStatus('This planner has been cleared.');
  };

  return (
    <main className={styles.planner}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}><Sparkles size={14} /> YOUR PERSONAL SPACE</p>
          <h1>Make today <span>count.</span></h1>
          <p className={styles.intro}>A calmer place to organise your time, keep promises to yourself and see the progress you make—one day at a time.</p>
          <div className={styles.savePill} data-state={saveState} role="status">
            <span className={styles.saveDot} />
            {!sessionReady ? 'Connecting your planner…' : saveState === 'saving' ? 'Saving to your account' : saveState === 'error' ? 'Not saved yet' : 'Synced to your account'}
          </div>
        </div>
        <div className={styles.heroMark} aria-hidden="true"><CalendarDays size={74} strokeWidth={1.1} /><span>{dateFromKey(today).getDate()}</span></div>
      </header>

      {storageError && <div className={styles.errorBanner} role="alert"><strong>Planner needs attention</strong><span>{storageError}</span>{saveState === 'error' && <button type="button" onClick={() => setData((current) => ({ ...current }))}>Retry save</button>}</div>}

      <section className={styles.statsGrid} aria-label="Planner overview">
        <article className={styles.statCard}><span className={styles.statIcon}><ListTodo size={18} /></span><strong>{openCount}</strong><span>Open today</span></article>
        <article className={styles.statCard}><span className={styles.statIcon}><Check size={18} /></span><strong>{completedCount}</strong><span>Completed today</span></article>
        <article className={styles.statCard}><span className={styles.statIcon}><Target size={18} /></span><strong>{habitsChecked}/{visibleData.habits.length}</strong><span>Habits checked</span></article>
        <article className={styles.statCard}><span className={styles.statIcon}><Sparkles size={18} /></span><strong>{completion}%</strong><span>This week completed</span></article>
      </section>

      <section className={styles.calendarPanel} aria-label="Choose a day">
        <div className={styles.calendarTop}>
          <div><p className={styles.sectionKicker}>YOUR WEEK</p><h2>{dateFromKey(weekDays[0]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} – {dateFromKey(weekDays[6]).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}</h2></div>
          <div className={styles.calendarActions}>
            <button type="button" className={styles.iconButton} aria-label="Previous week" onClick={() => setSelectedDate((date) => shiftDate(date, -7))}><ChevronLeft size={18} /></button>
            <button type="button" className={styles.todayButton} onClick={() => setSelectedDate(today)}>Today</button>
            <button type="button" className={styles.iconButton} aria-label="Next week" onClick={() => setSelectedDate((date) => shiftDate(date, 7))}><ChevronRight size={18} /></button>
          </div>
        </div>
        <div className={styles.weekStrip}>
          {weekDays.map((day) => {
            const dayTasksCount = visibleData.tasks.filter((task) => task.date === day).length;
            const isSelected = day === selectedDate;
            return <button key={day} type="button" className={isSelected ? styles.daySelected : styles.dayButton} aria-pressed={isSelected} onClick={() => setSelectedDate(day)}>
              <span>{dateFromKey(day).toLocaleDateString(undefined, { weekday: 'short' })}</span><strong>{dateFromKey(day).getDate()}</strong><i>{dayTasksCount ? dayTasksCount : '·'}</i>
            </button>;
          })}
        </div>
      </section>

      <div className={styles.mainGrid}>
        <section className={styles.agendaPanel} aria-labelledby="agenda-heading">
          <div className={styles.panelHeading}>
            <div><p className={styles.sectionKicker}>YOUR AGENDA</p><h2 id="agenda-heading">{selectedDate === today ? 'Today’s focus' : dateFromKey(selectedDate).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric' })}</h2><p>{openCount ? `You have ${openCount} things to focus on.` : 'Make space for what matters.'}</p></div>
            <span className={styles.taskCount}>{completedCount}/{dayTasks.length}</span>
          </div>
          <form className={styles.quickAdd} onSubmit={addTask}>
            <label className={styles.visuallyHidden} htmlFor="planner-new-task">Add a task</label>
            <input id="planner-new-task" value={newTask} onChange={(event) => setNewTask(event.currentTarget.value)} maxLength={MAX_TASK_LENGTH} placeholder="Add a task or something to remember…" />
            <button type="submit" disabled={!sessionReady || !newTask.trim()}><Plus size={17} /> Add</button>
            <div className={styles.taskOptions}>
              <label><span>Time</span><input type="time" value={newTime} onChange={(event) => setNewTime(event.currentTarget.value)} aria-label="Task time" /></label>
              <label><span>Category</span><select value={newCategory} onChange={(event) => setNewCategory(event.currentTarget.value as PlannerCategory)} aria-label="Task category">{Object.entries(CATEGORY_LABELS).map(([key, label]) => <option key={key} value={key}>{label}</option>)}</select></label>
              <label><span>Priority</span><select value={newPriority} onChange={(event) => setNewPriority(event.currentTarget.value as PlannerPriority)} aria-label="Task priority"><option value="low">Low</option><option value="normal">Normal</option><option value="high">High</option></select></label>
            </div>
          </form>
          {dayTasks.length ? <ul className={styles.agendaList}>{dayTasks.map((task) => <li key={task.id} className={task.done ? styles.taskDone : undefined}>
            <label className={styles.taskCheck}><input type="checkbox" checked={task.done} disabled={!sessionReady} onChange={(event) => toggleTask(task.id, event.currentTarget.checked)} /><span className={styles.customCheck}><Check size={13} /></span></label>
            <div className={styles.taskBody}><strong>{task.title}</strong><div className={styles.taskMeta}>{task.dueTime && <span><Clock3 size={12} />{task.dueTime}</span>}<span className={styles.categoryTag} data-category={task.category ?? 'personal'}>{CATEGORY_LABELS[task.category ?? 'personal']}</span><span className={styles.priorityTag} data-priority={task.priority ?? 'normal'}>{task.priority ?? 'normal'} priority</span></div></div>
            <button type="button" className={styles.deleteButton} disabled={!sessionReady} aria-label={`Delete ${task.title}`} onClick={() => deleteTask(task.id)}><Trash2 size={15} /></button>
          </li>)}</ul> : <div className={styles.emptyAgenda}><span><CalendarDays size={24} /></span><strong>Your day is open</strong><p>Add a task above when you’re ready. You don’t need to fill every space.</p></div>}
        </section>

        <aside className={styles.sideColumn}>
          <section className={styles.sidePanel} aria-labelledby="habits-heading">
            <div className={styles.panelHeadingCompact}><div><p className={styles.sectionKicker}>SMALL ROUTINES</p><h2 id="habits-heading">Your habits</h2></div><span className={styles.miniCount}>{habitsChecked}/{visibleData.habits.length}</span></div>
            <form className={styles.habitAdd} onSubmit={addHabit}><label className={styles.visuallyHidden} htmlFor="planner-new-habit">New habit</label><input id="planner-new-habit" value={newHabit} onChange={(event) => setNewHabit(event.currentTarget.value)} maxLength={MAX_HABIT_LENGTH} placeholder="Add a small habit…" /><button type="submit" disabled={!sessionReady || !newHabit.trim() || visibleData.habits.length >= 20} aria-label="Add habit"><Plus size={17} /></button></form>
            {visibleData.habits.length ? <ul className={styles.habitList}>{visibleData.habits.map((habit) => <li key={habit.id}><label><input type="checkbox" checked={habit.checkedDates.includes(selectedDate)} disabled={!sessionReady} onChange={(event) => toggleHabit(habit.id, event.currentTarget.checked)} /><span className={styles.customCheck}><Check size={12} /></span><span>{habit.title}</span></label></li>)}</ul> : <p className={styles.smallEmpty}>Build a routine gently. No streaks, pressure or penalties.</p>}
          </section>

          <section className={styles.sidePanel} aria-labelledby="note-heading">
            <div className={styles.panelHeadingCompact}><div><p className={styles.sectionKicker}>A MOMENT TO REFLECT</p><h2 id="note-heading">Daily note</h2></div><span className={styles.privateLabel}>Private</span></div>
            <textarea aria-label="Daily note" disabled={!sessionReady} rows={5} maxLength={MAX_NOTE_LENGTH} value={note} onChange={(event) => updateNote(event.currentTarget.value)} placeholder="What’s on your mind today? Capture a thought, a win or a reminder…" />
            <div className={styles.noteFooter}><span>{note.length}/{MAX_NOTE_LENGTH}</span><span>Saved with your planner</span></div>
          </section>
        </aside>
      </div>

      <section className={styles.weekReview} aria-labelledby="week-review-heading">
        <div className={styles.reviewIntro}><p className={styles.sectionKicker}>A LOOK BACK</p><h2 id="week-review-heading">Your week, at a glance</h2><p>Progress is information, not a judgement. Notice what worked and adjust what didn’t.</p></div>
        <div className={styles.progressWrap}><div className={styles.progressLabel}><span>Tasks completed</span><strong>{weekCompleted} / {weekTasks.length}</strong></div><div className={styles.progressTrack}><span style={{ width: `${completion}%` }} /></div></div>
        <div className={styles.reviewNumbers}><div><strong>{weekNotes}</strong><span>Days with notes</span></div><div><strong>{weekHabits}</strong><span>Habit check-ins</span></div><div><strong>{weekTasks.length}</strong><span>Tasks planned</span></div></div>
      </section>

      <section className={styles.growthSection}>
        <details><summary><Sparkles size={17} /> Reflection and self-discovery <span>Personal growth tools</span></summary><div className={styles.growthContent}><DailyReflection userId={userId} isGuest={false} worldType={worldType} /><SelfDiscoveryCentre key={userId} worldType={worldType} /></div></details>
      </section>

      <footer className={styles.plannerFooter}>
        <div><span className={styles.saveDot} data-state={saveState} /><span>{!sessionReady ? 'Connecting securely…' : saveState === 'saving' ? 'Saving changes…' : saveState === 'error' ? 'Changes need saving' : 'All changes saved to your account'}</span></div>
        <div className={styles.footerActions}><button type="button" onClick={exportData} disabled={!sessionReady}><Download size={15} /> Export</button><button type="button" className={styles.clearButton} onClick={clearData} disabled={!sessionReady}>Clear planner</button></div>
      </footer>
      <p className={styles.liveStatus} role="status" aria-live="polite">{status}</p>
    </main>
  );
}
