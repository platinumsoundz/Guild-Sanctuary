import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const component = readFileSync(new URL('../src/modules/events/components/MeetupCalendarPlaceholder.tsx', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../src/modules/events/components/MeetupCalendarPlaceholder.module.css', import.meta.url), 'utf8');

assert.ok(component.includes('Event date (your local time)'), 'event date input must disclose local-time interpretation');
assert.ok(component.includes('Start time (your local time)'), 'event time input must disclose local-time interpretation');
assert.ok(component.includes('device’s local timezone'), 'event form must explain local input timezone');
assert.ok(component.includes('address search is not available yet'), 'event form must not imply address geocoding exists');
assert.ok(component.includes('Latitude (venue map pin)') && component.includes('Longitude (venue map pin)'), 'required coordinates must be explained as map-pin coordinates');
assert.ok(component.includes('timeZoneName: \'short\''), 'event cards must display a local timezone abbreviation');
assert.ok(component.includes('formatEventDateTime(event.startsAt)'), 'event cards must use the timezone-aware formatter');
assert.ok(!component.includes("event.startsAt.replace('T', ' ').slice(0, 16)} UTC"), 'event cards must not label raw ISO timestamps as UTC without conversion');
assert.ok(styles.includes('.formNote'), 'timezone and venue guidance must be readable in the form');

console.log('Event time and location disclosure contract checks passed.');
