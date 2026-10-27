import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const navigation = readFileSync(new URL('../src/components/Navigation.tsx', import.meta.url), 'utf8');
const notifications = readFileSync(new URL('../src/components/NotificationBar.tsx', import.meta.url), 'utf8');
const notificationStyles = readFileSync(new URL('../src/components/NotificationBar.module.css', import.meta.url), 'utf8');

assert.match(navigation, /<NotificationBar compact\s*\/>/, 'The header must use the compact notification control');
assert.match(navigation, /aria-label="Open main navigation"/, 'Main navigation control must remain available in the header');
assert.match(navigation, /headerIdentity[\s\S]*?menuButton/, 'The navigation control must remain at the far left of the compact header');
assert.doesNotMatch(navigation, /styles\.brand|brandMark|brandName/, 'The oversized Sanctuary brand block must not occupy the header');
assert.match(notifications, /!fullPage && !compact && <span className=\{styles\.label\}>COMMUNITY ACTIVITY<\/span>/, 'The community-activity label must be omitted from the compact header');
assert.doesNotMatch(navigation, /aria-label="Open Token Shop"/, 'Token Shop must not occupy a header quick-action button');
assert.doesNotMatch(navigation, /aria-label="Open Admin & Moderation"/, 'Admin must not occupy a header quick-action button');

assert.match(notifications, /compact\?: boolean/, 'NotificationBar must support compact header mode');
assert.match(notifications, /Open full notifications/, 'Compact panel must link to the full notifications page');
assert.match(notifications, /setActiveNavigation\('notifications'\)/, 'Full notifications action must navigate to the notifications page');
assert.match(notifications, /aria-label="Close notifications"/, 'The notification panel must have a close control');
assert.match(notificationStyles, /\.compact \.panel\s*\{[^}]*position:\s*absolute/s, 'Compact panel must overlay rather than replace the current page');
assert.match(notificationStyles, /\.compact \.panel\s*\{[^}]*right:\s*0/s, 'Compact panel must be anchored to the header control');

console.log('Header navigation and notification panel contract checks passed.');
