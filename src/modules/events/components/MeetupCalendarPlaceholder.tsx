'use client';

import { useEffect, useState, type FormEvent } from 'react';
import { ExternalLink, MapPin, MapPinned } from 'lucide-react';
import { useAppContext } from '@/context/AppContext';
import { useEvents, type EventView } from '@/modules/events';
import { fetchPublicProfileById } from '@/modules/profiles';
import type { PublicProfile } from '@/types/database';
import { EventEngagement } from './EventEngagement';
import { ReportContentButton } from '@/modules/moderation';
import styles from './MeetupCalendarPlaceholder.module.css';

export function MeetupCalendarPlaceholder() {
  const { currentUser, isGuest } = useAppContext();
  const userId = currentUser && !isGuest ? currentUser.user.id : '';
  const { events, isLoading, error, addEvent, editEvent, removeEvent, rsvp } = useEvents(userId);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [startTime, setStartTime] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [editingEvent, setEditingEvent] = useState<EventView | null>(null);
  const [selectedMapEventId, setSelectedMapEventId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [creatorProfiles, setCreatorProfiles] = useState<Record<string, PublicProfile>>({});

  useEffect(() => {
    let cancelled = false;
    const creatorIds = [...new Set(events.map((event) => event.creatorId))];
    void Promise.all(creatorIds.map(async (creatorId) => {
      try {
        const profile = await fetchPublicProfileById(creatorId);
        return profile ? [creatorId, profile] as const : null;
      } catch {
        return null;
      }
    })).then((profiles) => {
      if (!cancelled) setCreatorProfiles(Object.fromEntries(profiles.filter((profile): profile is NonNullable<typeof profile> => profile !== null)));
    });
    return () => { cancelled = true; };
  }, [events]);

  const selectedMapEvent = events.find((event) => event.id === selectedMapEventId) ?? events[0] ?? null;
  const selectedMapLinks = selectedMapEvent
    ? getMapLinks(String(selectedMapEvent.locationCoords.latitude), String(selectedMapEvent.locationCoords.longitude))
    : null;
  const coordinatePreview = getMapLinks(latitude, longitude);
  const nearbyEvents = selectedMapLinks && selectedMapEvent
    ? events
        .map((event) => ({ event, distanceKm: getDistanceKm(
          selectedMapEvent.locationCoords.latitude,
          selectedMapEvent.locationCoords.longitude,
          event.locationCoords.latitude,
          event.locationCoords.longitude,
        ) }))
        .filter(({ event, distanceKm }) =>
          distanceKm <= 10 && Boolean(getMapLinks(String(event.locationCoords.latitude), String(event.locationCoords.longitude))),
        )
        .sort((a, b) => a.distanceKm - b.distanceKm)
    : [];

  const clearForm = () => {
    setTitle('');
    setDescription('');
    setStartDate('');
    setStartTime('');
    setLatitude('');
    setLongitude('');
    setEditingEvent(null);
  };

  const handleSubmit = async (formEvent: FormEvent<HTMLFormElement>) => {
    formEvent.preventDefault();
    setFormError(null);

    try {
      const startsAt = toIsoDateTime(startDate, startTime);
      if (editingEvent) {
        await editEvent(editingEvent.id, { title, description, startsAt, locationCoords: { latitude: Number(latitude), longitude: Number(longitude) } });
      } else {
        await addEvent({
          creatorId: userId,
          title,
          description,
          startsAt,
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
    const localDateTime = toLocalDateTime(event.startsAt);
    setStartDate(localDateTime.slice(0, 10));
    setStartTime(localDateTime.slice(11, 16));
    setLatitude(String(event.locationCoords.latitude));
    setLongitude(String(event.locationCoords.longitude));
  };

  const handleDelete = async (eventId: string) => {
    setFormError(null);
    try {
      await removeEvent(eventId);
      if (selectedMapEventId === eventId) setSelectedMapEventId(null);
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
          <p className={styles.eyebrow}>GATHER WITH CARE</p>
          <h1>Community events</h1>
          <p className={styles.intro}>Find what is happening around you, explore event locations, and choose where to join in.</p>
        </div>
        <span className={styles.worldTag}>THE SANCTUARY</span>
      </header>

      {userId && <section className={styles.createPanel} aria-labelledby="event-form-title">
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
          <p className={styles.formNote}>Dates use your device’s local timezone. Add the venue coordinates below, then preview the pin on a real map before publishing. A venue name or address is not stored in this version, so the event will show its map pin instead.</p>
          <div className={styles.formRow}>
            <label className={styles.field}>
              <span>Event date (your local time)</span>
              <input type="date" value={startDate} onChange={(event) => setStartDate(event.currentTarget.value)} required />
            </label>
            <label className={styles.field}>
              <span>Start time (your local time)</span>
              <input type="time" step="60" value={startTime} onChange={(event) => setStartTime(event.currentTarget.value)} required />
            </label>
            <label className={styles.field}>
              <span>Latitude</span>
              <input type="number" min="-90" max="90" step="any" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.currentTarget.value)} required />
            </label>
            <label className={styles.field}>
              <span>Longitude</span>
              <input type="number" min="-180" max="180" step="any" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.currentTarget.value)} required />
            </label>
          </div>
          {coordinatePreview && (
            <div className={styles.coordinatePreview}>
              <MapPin size={17} aria-hidden="true" />
              <span>Location pin preview is ready.</span>
              <a href={coordinatePreview.open} target="_blank" rel="noreferrer">Check pin on OpenStreetMap <ExternalLink size={13} aria-hidden="true" /></a>
            </div>
          )}
          {formError && <p className={styles.error} role="alert">{formError}</p>}
          <div className={styles.formActions}>
            {editingEvent && <button className={styles.textButton} type="button" onClick={clearForm}>Cancel edit</button>}
            <button className={styles.primaryButton} type="submit">{editingEvent ? 'Save changes' : 'Publish event'}</button>
          </div>
        </form>
      </section>}

      <section className={styles.eventsSection} aria-labelledby="upcoming-events-title">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>EXPLORE THE AREA</p>
            <h2 id="upcoming-events-title">Upcoming events</h2>
          </div>
          <span>{events.length} {events.length === 1 ? 'event' : 'events'}</span>
        </div>

        {isLoading ? <p className={styles.emptyState}>Loading events and map pins…</p> : error ? (
          <p className={styles.error} role="alert">{error}</p>
        ) : events.length === 0 ? (
          <div className={styles.emptyState}>
            <MapPinned size={25} aria-hidden="true" />
            <p>No events to map yet. When your community creates an event, its location pin will appear here.</p>
          </div>
        ) : (
          <>
            <section className={styles.mapExplorer} aria-labelledby="map-explorer-title">
              <div className={styles.mapHeading}>
                <div>
                  <p className={styles.eyebrow}>MAP EXPLORER</p>
                  <h3 id="map-explorer-title">{selectedMapEvent ? selectedMapEvent.title : 'Choose an event pin'}</h3>
                  <p>Select an event below to focus the map on its location and inspect the event details.</p>
                </div>
                {selectedMapLinks && (
                  <a className={styles.mapExternalLink} href={selectedMapLinks.open} target="_blank" rel="noreferrer">
                    Open full map <ExternalLink size={14} aria-hidden="true" />
                  </a>
                )}
              </div>
              {selectedMapEvent && selectedMapLinks ? (
                <div className={styles.mapFrameWrap} aria-label="Map showing the selected event location">
                  <iframe
                    className={styles.mapFrame}
                    title={`OpenStreetMap location for ${selectedMapEvent.title}`}
                    src={selectedMapLinks.embed}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                  />
                  <p className={styles.mapAttribution}>Map data © OpenStreetMap contributors. Map opens on OpenStreetMap in a new tab.</p>
                </div>
              ) : selectedMapEvent ? (
                <div className={styles.mapUnavailable} role="status">
                  This event has missing or invalid coordinates, so its map cannot be shown. The event details are still available below.
                </div>
              ) : null}
              {selectedMapLinks && (
                <section className={styles.nearbyPanel} aria-labelledby="nearby-events-title">
                  <div className={styles.nearbyHeading}>
                    <h4 id="nearby-events-title">Happening within 10 km</h4>
                    <span>{nearbyEvents.length} {nearbyEvents.length === 1 ? 'event' : 'events'}</span>
                  </div>
                  {nearbyEvents.length > 0 ? (
                    <div className={styles.nearbyList} aria-label="Events near selected map location">
                      {nearbyEvents.map(({ event, distanceKm }) => (
                        <button
                          key={event.id}
                          type="button"
                          className={selectedMapEvent?.id === event.id ? styles.nearbyEventActive : styles.nearbyEvent}
                          aria-pressed={selectedMapEvent?.id === event.id}
                          onClick={() => setSelectedMapEventId(event.id)}
                        >
                          <span><strong>{event.title}</strong><small>{formatShortDate(event.startsAt)}</small></span>
                          <small>{formatDistance(distanceKm)}</small>
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.nearbyEmpty}>No other events with valid locations are within 10 km of this pin.</p>
                  )}
                </section>
              )}
              <div className={styles.pinList} role="group" aria-label="Choose an event map pin">
                {events.map((event, index) => (
                  <button
                    className={selectedMapEvent?.id === event.id ? styles.activePin : styles.mapPin}
                    key={event.id}
                    type="button"
                    aria-pressed={selectedMapEvent?.id === event.id}
                    onClick={() => setSelectedMapEventId(event.id)}
                  >
                    <span className={styles.pinNumber}><MapPin size={13} aria-hidden="true" /> {index + 1}</span>
                    <span className={styles.pinText}><strong>{event.title}</strong><small>{formatShortDate(event.startsAt)}</small></span>
                  </button>
                ))}
              </div>
            </section>

            <div className={styles.eventList} aria-label="Upcoming event details">
              {events.map((event) => (
                <article className={selectedMapEvent?.id === event.id ? styles.eventCardActive : styles.eventCard} key={event.id}>
                  <div className={styles.eventMain}>
                    <time className={styles.eventDate} dateTime={event.startsAt}>{formatEventDateTime(event.startsAt)}</time>
                    <h3>{event.title}</h3>
                    <p className={styles.organizerName}>Hosted by {event.creatorId === userId && currentUser ? `${currentUser.profile.displayName} (@${currentUser.profile.username})` : creatorProfiles[event.creatorId] ? `${creatorProfiles[event.creatorId].displayName} (@${creatorProfiles[event.creatorId].username})` : 'Community member'}</p>
                    <p>{event.description || 'No description provided.'}</p>
                    <span className={styles.locationText}>
                      <MapPin size={13} aria-hidden="true" />
                      {getMapLinks(String(event.locationCoords.latitude), String(event.locationCoords.longitude))
                        ? `Map pin available · ${event.locationCoords.latitude.toFixed(3)}, ${event.locationCoords.longitude.toFixed(3)}`
                        : 'Location unavailable · coordinates are missing or invalid'}
                    </span>
                    <span className={styles.attendeeCount}>{event.rsvpCount} going</span>
                    {userId && <EventEngagement eventId={event.id} userId={userId} />}
                    {userId && <ReportContentButton targetType="event" targetId={event.id} />}
                  </div>
                  <div className={styles.eventActions}>
                    <button className={styles.secondaryButton} type="button" onClick={() => setSelectedMapEventId(event.id)} aria-pressed={selectedMapEvent?.id === event.id}>
                      <MapPin size={14} aria-hidden="true" /> {selectedMapEvent?.id === event.id ? 'On map' : 'Show on map'}
                    </button>
                    {userId && <>
                      <button className={event.viewerStatus === 'going' ? styles.selectedButton : styles.secondaryButton} type="button" onClick={() => void handleRsvp(event.id, event.viewerStatus === 'going' ? 'cancelled' : 'going')}>
                        {event.viewerStatus === 'going' ? 'Going' : 'RSVP'}
                      </button>
                      <button className={event.viewerStatus === 'interested' ? styles.selectedButton : styles.textButton} type="button" onClick={() => void handleRsvp(event.id, 'interested')}>Interested</button>
                      {event.creatorId === userId && <>
                        <button className={styles.textButton} type="button" onClick={() => beginEdit(event)}>Edit</button>
                        <button className={styles.textButton} type="button" onClick={() => void handleDelete(event.id)}>Delete</button>
                      </>}
                    </>}
                  </div>
                </article>
              ))}
            </div>
          </>
        )}
      </section>
    </main>
  );
}

function getMapLinks(latitudeValue: string, longitudeValue: string): { embed: string; open: string } | null {
  if (!latitudeValue.trim() || !longitudeValue.trim()) return null;
  const latitude = Number(latitudeValue);
  const longitude = Number(longitudeValue);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180) {
    return null;
  }
  const delta = 0.012;
  const bounds = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join('%2C');
  return {
    embed: `https://www.openstreetmap.org/export/embed.html?bbox=${bounds}&layer=mapnik&marker=${latitude}%2C${longitude}`,
    open: `https://www.openstreetmap.org/?mlat=${latitude}&mlon=${longitude}#map=16/${latitude}/${longitude}`,
  };
}

function getDistanceKm(latitudeA: number, longitudeA: number, latitudeB: number, longitudeB: number): number {
  const radians = (degrees: number) => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(latitudeB - latitudeA);
  const longitudeDelta = radians(longitudeB - longitudeA);
  const haversine = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos(radians(latitudeA)) * Math.cos(radians(latitudeB)) * Math.sin(longitudeDelta / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(Math.min(1, Math.max(0, haversine))));
}

function formatDistance(distanceKm: number): string {
  if (distanceKm < 1) return `${Math.round(distanceKm * 1000)} m away`;
  return `${distanceKm.toFixed(distanceKm < 10 ? 1 : 0)} km away`;
}

function toIsoDateTime(dateValue: string, timeValue: string): string {
  if (!dateValue || !timeValue) {
    throw new Error('Choose both an event date and a start time.');
  }
  const date = new Date(`${dateValue}T${timeValue}`);
  if (!Number.isFinite(date.getTime())) {
    throw new Error('Choose a valid event date and time.');
  }
  return date.toISOString();
}

function toLocalDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
}

function formatEventDateTime(isoDate: string): string {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) return 'Time to be confirmed';
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short', year: 'numeric', month: 'short', day: 'numeric',
    hour: 'numeric', minute: '2-digit', timeZoneName: 'short',
  }).format(date);
}

function formatShortDate(isoDate: string): string {
  const date = new Date(isoDate);
  if (!Number.isFinite(date.getTime())) return 'Time to be confirmed';
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}
