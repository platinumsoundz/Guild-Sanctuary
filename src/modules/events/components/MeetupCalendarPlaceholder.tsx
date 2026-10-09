'use client';

import { useState, type FormEvent } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useEvents, type EventView } from '@/modules/events';
import { EventEngagement } from './EventEngagement';
import { ReportContentButton } from '@/modules/moderation';
import styles from './MeetupCalendarPlaceholder.module.css';

export function MeetupCalendarPlaceholder() {
  const { activeWorld, currentUser } = useAppContext();
  const userId = currentUser?.user.id ?? '';
  const { events, isLoading, error, addEvent, editEvent, removeEvent, rsvp } = useEvents(activeWorld, userId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startsAt, setStartsAt] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [editingEvent, setEditingEvent] = useState<EventView | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setStartsAt('');
    setLatitude('');
    setLongitude('');
    setEditingEvent(null);
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setFormError(null);

    try {
      if (editingEvent) {
        await editEvent(editingEvent.id, { title, description, startsAt: new Date(startsAt).toISOString() });
      } else {
        await addEvent({
          creatorId: userId,
          title,
          description,
          startsAt: new Date(startsAt).toISOString(),
          locationCoords: { latitude: Number(latitude), longitude: Number(longitude) },
        });
      }
      clearForm();
    } catch (submitError) {
      setFormError(submitError instanceof Error ? submitError.message : 'The event could not be saved.');
    }
  };

  const beginEdit = (event: EventView) => {
    setEditingEvent(event);
    setTitle(event.title);
    setDescription(event.description);
    setStartsAt(toLocalDateTime(event.startsAt));
    setLatitude(String(event.locationCoords.latitude));
    setLongitude(String(event.locationCoords.longitude));
  };

  const handleDelete = async (eventId: string) => {
    setFormError(null);
    try {
      await removeEvent(eventId);
    } catch (deleteError) {
      setFormError(deleteError instanceof Error ? deleteError.message : 'The event could not be deleted.');
    }
  };

  const handleRsvp = async (eventId: string, status: 'going' | 'interested' | 'cancelled') => {
    setFormError(null);
    try {
      await rsvp(eventId, status);
    } catch (rsvpError) {
      setFormError(rsvpError instanceof Error ? rsvpError.message : 'Your RSVP could not be saved.');
    }
  };

  return (
    <main className={styles.calendar}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>{activeWorld === 'sanctuary' ? 'GATHER WITH CARE' : 'FIND YOUR PARTY'}</p>
          <h1>Community events</h1>
        </div>
        <span className={styles.worldTag}>{activeWorld === 'sanctuary' ? 'THE SANCTUARY' : 'THE GUILD HALL'}</span>
      </header>

      <section className={styles.createPanel} aria-labelledby="event-form-title">
        <h2 id="event-form-title">{editingEvent ? 'Edit event' : 'Create an event'}</h2>
        <form className={styles.eventForm} onSubmit={handleSubmit}>
          <label className={styles.field}>
            <span>Event title</span>
            <input value={title} onChange={(event) => setTitle(event.currentTarget.value)} minLength={3} maxLength={100} required />
          </label>
          <label className={styles.field}>
            <span>Description</span>
            <textarea value={description} onChange={(event) => setDescription(event.currentTarget.value)} maxLength={2000} rows={3} />
          </label>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span>Date and time</span>
              <input type="datetime-local" value={startsAt} onChange={(event) => setStartsAt(event.currentTarget.value)} required />
            </label>
            <label className={styles.field}>
              <span>Latitude</span>
              <input type="number" min="-90" max="90" step="any" value={latitude} onChange={(event) => setLatitude(event.currentTarget.value)} required />
            </label>
            <label className={styles.field}>
              <span>Longitude</span>
              <input type="number" min="-180" max="180" step="any" value={longitude} onChange={(event) => setLongitude(event.currentTarget.value)} required />
            </label>
          </div>
          {formError && <p className={styles.error} role="alert">{formError}</p>}
          <div className={styles.formActions}>
            {editingEvent && <button className={styles.textButton} type="button" onClick={clearForm}>Cancel edit</button>}
            <button className={styles.primaryButton} type="submit">{editingEvent ? 'Save changes' : 'Publish event'}</button>
          </div>
        </form>
      </section>

      <section className={styles.eventsSection} aria-labelledby="upcoming-events-title">
        <div className={styles.sectionHeading}>
          <h2 id="upcoming-events-title">Upcoming</h2>
          <span>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
        </div>
        {isLoading ? <p className={styles.emptyState}>Loading events...</p> : error ? (
          <p className={styles.error} role="alert">{error}</p>
        ) : events.length === 0 ? (
          <p className={styles.emptyState}>No events in this world yet. Start one for your community.</p>
        ) : (
          <div className={styles.eventList}>
            {events.map((event) => (
              <article className={styles.eventCard} key={event.id}>
                <div className={styles.eventMain}>
                  <time className={styles.eventDate} dateTime={event.startsAt}>{event.startsAt.replace('T', ' ').slice(0, 16)} UTC</time>
                  <h3>{event.title}</h3>
                  <p>{event.description || 'No description provided.'}</p>
                  <span className={styles.locationText}>Location: {event.locationCoords.latitude.toFixed(3)}, {event.locationCoords.longitude.toFixed(3)}</span>
                  <span className={styles.attendeeCount}>{event.rsvpCount} going</span>
                  <EventEngagement eventId={event.id} userId={userId} />
                  <ReportContentButton targetType="event" targetId={event.id} />
                </div>
                <div className={styles.eventActions}>
                  <button className={event.viewerStatus === 'going' ? styles.selectedButton : styles.secondaryButton} type="button" onClick={() => void handleRsvp(event.id, event.viewerStatus === 'going' ? 'cancelled' : 'going')}>
                    {event.viewerStatus === 'going' ? 'Going' : 'RSVP'}
                  </button>
                  <button className={event.viewerStatus === 'interested' ? styles.selectedButton : styles.textButton} type="button" onClick={() => void handleRsvp(event.id, 'interested')}>Interested</button>
                  {event.creatorId === userId && (
                    <>
                      <button className={styles.textButton} type="button" onClick={() => beginEdit(event)}>Edit</button>
                      <button className={styles.textButton} type="button" onClick={() => void handleDelete(event.id)}>Delete</button>
                    </>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function toLocalDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}