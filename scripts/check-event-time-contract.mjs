import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync(new URL('../src/modules/events/components/MeetupCalendarPlaceholder.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/modules/events/components/MeetupCalendarPlaceholder.module.css', import.meta.url), 'utf8');

assert.ok(component.includes('Event date (your local time)'), 'event date input must disclose local-time interpretation');
assert.ok(component.includes('Start time (your local time)'), 'event time input must disclose local-time interpretation');
assert.ok(component.includes('Dates use your device’s local timezone'), 'event form must explain local input timezone');
assert.ok(component.includes('preview the pin on a real map'), 'event form must explain how to verify a location pin');
assert.ok(component.includes('<iframe') && component.includes('OpenStreetMap'), 'event discovery must render a real map');
assert.ok(component.includes('aria-label="Choose an event map pin"'), 'event map pins must have an accessible selector');
assert.ok(component.includes('aria-pressed={selectedMapEvent?.id === event.id}'), 'map pin selection state must be exposed to assistive technology');
assert.ok(component.includes('Show on map'), 'event cards must let users focus the map on a specific event');
assert.ok(component.includes('Open full map'), 'users must be able to open the selected map location');
assert.ok(component.includes('Map data © OpenStreetMap contributors'), 'map attribution must be visible');
assert.ok(component.includes('timeZoneName: \'short\''), 'event cards must display a timezone abbreviation');
assert.ok(component.includes('formatEventDateTime(event.startsAt)'), 'event cards must use the timezone-aware formatter');
assert.ok(!component.includes("event.startsAt.replace('T', ' ').slice(0, 16)} UTC"), 'event cards must not label raw ISO timestamps as UTC without conversion');
assert.ok(component.includes('latitude < -90') && component.includes('longitude > 180'), 'invalid map coordinates must not be embedded');
assert.ok(component.includes('const selectedMapLinks = selectedMapEvent'), 'selected event map links must be validated once before rendering');
assert.ok(component.includes('src={selectedMapLinks.embed}'), 'map iframe must only receive a validated URL');
assert.ok(component.includes('This event has missing or invalid coordinates'), 'invalid event coordinates must produce a readable map fallback');
assert.ok(component.includes('Location unavailable · coordinates are missing or invalid'), 'invalid coordinates must not be presented as a usable map pin');
assert.ok(component.includes('Happening within 10 km'), 'selected map areas must show nearby event discovery');
assert.ok(component.includes('getDistanceKm(') && component.includes('formatDistance(distanceKm)'), 'nearby events must be distance-ranked and show readable distance');
assert.ok(component.includes('No other events with valid locations are within 10 km'), 'nearby discovery must have a clear empty state');
assert.ok(styles.includes('.mapExplorer') && styles.includes('.mapFrame'), 'map explorer must have dedicated layout styles');
assert.ok(styles.includes('.mapUnavailable'), 'invalid event locations must have a styled fallback state');
assert.ok(styles.includes('.nearbyPanel') && styles.includes('.nearbyEventActive'), 'nearby event discovery must have responsive selectable styles');
assert.ok(styles.includes('@media (max-width: 760px)'), 'map and event controls must adapt to smaller screens');
assert.ok(styles.includes(':focus-visible'), 'interactive map controls must have visible keyboard focus');
assert.ok(styles.includes('prefers-reduced-motion: reduce'), 'motion must respect reduced-motion preferences');

console.log('Event map discovery, location disclosure, and accessibility contract checks passed.');

const eventsHook = readFileSync(new URL('../src/modules/events/useEvents.ts', import.meta.url), 'utf8');
assert.ok(eventsHook.includes('const sessionReady = eventsUserId === userId'), 'event state must be tagged to the current account');
assert.ok(eventsHook.includes('const visibleEvents = sessionReady ? events : []'), 'prior-account events must be hidden synchronously during account changes');
assert.ok(eventsHook.includes('requestId !== requestGeneration.current'), 'stale event loads must not overwrite the active account state');
assert.ok(eventsHook.includes('if (generation !== requestGeneration.current) return;'), 'stale event mutations must not overwrite the active account state');
assert.ok(eventsHook.includes('isLoading: !sessionReady || isLoading'), 'account transitions must show a loading state instead of stale event data');
console.log('Event account-isolation contract checks passed.');
