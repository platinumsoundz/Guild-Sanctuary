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
assert.ok(component.includes("const [eventView, setEventView] = useState<'list' | 'map'>('list')"), 'event discovery must default to a readable list');
assert.ok(component.includes('Search events'), 'event discovery must expose a search control');
assert.ok(component.includes("eventView === 'map' && <section"), 'map explorer must be optional rather than forced into the default list view');
assert.ok(component.includes("setEventView('map')"), 'event-card map actions must switch to the map view');
assert.ok(component.includes('Open full map'), 'users must be able to open the selected map location');
assert.ok(component.includes('Map data © OpenStreetMap contributors'), 'map attribution must be visible');
assert.ok(component.includes('timeZoneName: \'short\''), 'event cards must display a timezone abbreviation');
assert.ok(component.includes('formatEventDateTime(event.startsAt)'), 'event cards must use the timezone-aware formatter');
assert.ok(!component.includes("event.startsAt.replace('T', ' ').slice(0, 16)} UTC"), 'event cards must not label raw ISO timestamps as UTC without conversion');
assert.ok(component.includes('latitude < -90') && component.includes('longitude > 180'), 'invalid map coordinates must not be embedded');
assert.ok(component.includes('Math.max(-180, longitude - delta)') && component.includes('Math.min(180, longitude + delta)'), 'map bounds must stay valid near the date line');
assert.ok(component.includes('Math.max(-90, latitude - delta)') && component.includes('Math.min(90, latitude + delta)'), 'map bounds must stay valid near the poles');
assert.ok(component.includes('const selectedMapLinks = selectedMapEvent'), 'selected event map links must be validated once before rendering');
assert.ok(component.includes('src={selectedMapLinks.embed}'), 'map iframe must only receive a validated URL');
assert.ok(component.includes('This event has missing or invalid coordinates'), 'invalid event coordinates must produce a readable map fallback');
assert.ok(component.includes('Location unavailable · coordinates are missing or invalid'), 'invalid coordinates must not be presented as a usable map pin');
assert.ok(component.includes('Happening within {nearbyRadiusKm} km'), 'selected map areas must show nearby event discovery');
assert.ok(component.includes('Nearby event search radius') && component.includes('setNearbyRadiusKm(Number(event.currentTarget.value))'), 'people must be able to adjust nearby discovery radius');
assert.ok(component.includes('distanceKm <= nearbyRadiusKm'), 'nearby event results must respect the selected radius');
assert.ok(component.includes('getDistanceKm(') && component.includes('formatDistance(distanceKm)'), 'nearby events must be distance-ranked and show readable distance');
assert.ok(component.includes('No other events with valid locations are within {nearbyRadiusKm} km'), 'nearby discovery must have a radius-aware empty state');
assert.ok(component.includes("event.id !== selectedMapEvent.id"), 'nearby results must exclude the currently selected event');
assert.ok(component.includes("locationCoords: { latitude: Number(latitude), longitude: Number(longitude) }"), 'editing an event must persist coordinate changes');
assert.ok(styles.includes('.mapExplorer') && styles.includes('.mapFrame'), 'map explorer must have dedicated layout styles');
assert.ok(styles.includes('.mapUnavailable'), 'invalid event locations must have a styled fallback state');
assert.ok(styles.includes('.nearbyPanel') && styles.includes('.nearbyEventActive'), 'nearby event discovery must have responsive selectable styles');
assert.ok(styles.includes('.nearbyRadiusLabel select:focus-visible'), 'radius control must have visible keyboard focus');
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


const eventService = readFileSync(new URL('../src/modules/events/service.ts', import.meta.url), 'utf8');
assert.ok(component.includes("locationCoords: { latitude: Number(latitude), longitude: Number(longitude) }"), 'editing an event must submit the updated coordinates');
assert.ok(eventService.includes("validateCoordinates(input.locationCoords);"), 'event updates must validate coordinate bounds');
assert.ok(eventService.includes("latitude: input.locationCoords.latitude") && eventService.includes("longitude: input.locationCoords.longitude"), 'event updates must persist both coordinate values');
console.log('Event location editing contract checks passed.');

assert.ok(component.includes('const [includePastEvents, setIncludePastEvents] = useState(false)'), 'past-event browsing must be opt-in by default');
assert.ok(component.includes('const matchesDate = includePastEvents || new Date(event.startsAt).getTime() >= Date.now()'), 'the default event view must not label past events as upcoming');
assert.ok(component.includes('const matchesSearch = !query ||'), 'event search must filter the currently selected date range');
assert.ok(component.includes('Include past events') && component.includes('checked={includePastEvents}'), 'people must be able to include past events with an accessible toggle');
assert.ok(component.includes('No events match those filters'), 'empty search/date results must explain how to broaden the filter');
assert.ok(component.includes('visibleEvents.map((event, index)'), 'map pin selection must follow the active upcoming/past filter');
assert.ok(component.includes('visibleEvents.map((event) => ('), 'event cards must follow the active upcoming/past filter');
assert.ok(styles.includes('.pastEventsToggle input:focus-visible'), 'past-event filter must have visible keyboard focus');
console.log('Upcoming/past event filter contract checks passed.');

assert.ok(component.includes('value={searchTerm}') && component.includes('setSearchTerm(event.currentTarget.value)'), 'event search must be a controlled, working input');
assert.ok(component.includes("aria-pressed={eventView === 'list'}") && component.includes("aria-pressed={eventView === 'map'}"), 'list/map selection must be exposed accessibly');
console.log('List-first event discovery and search contract checks passed.');
