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
assert.match(notifications, /aria-label="Close notifications" onClick=\{\(\) => \{ setIsOpen\(false\); if \(compact\) bellButtonRef\.current\?\.focus\(\); \}\}/, 'Closing the compact overlay with its close button must return focus to the trigger');
assert.match(notificationStyles, /\.compact \.panel\s*\{[^}]*position:\s*absolute/s, 'Compact panel must overlay rather than replace the current page');
assert.match(notificationStyles, /\.compact \.panel\s*\{[^}]*right:\s*0/s, 'Compact panel must be anchored to the header control');
assert.match(notifications, /useRef<HTMLButtonElement>\(null\)/, 'Notification trigger must be available for focus restoration');
assert.match(notifications, /closeOnOutsidePointer[\s\S]*?document\.addEventListener\('pointerdown', closeOnOutsidePointer\)/, 'Compact panel must close when the user clicks outside it');
assert.match(notifications, /closeOnEscape[\s\S]*?event\.key !== 'Escape'[\s\S]*?bellButtonRef\.current\?\.focus\(\)/, 'Escape must close the panel and restore focus to the trigger');
assert.match(notifications, /ref=\{panelRef\}/, 'Outside-click handling must identify the notification panel');
assert.match(notifications, /const loadRequest = useRef\(0\)/, 'Notification loading must track the latest request');
assert.match(notifications, /if \(!isCurrentRequest\(\)\) return/, 'Stale notification requests must not overwrite current account state');
assert.match(notifications, /\[currentUser\?\.user\.id, isGuest, worldType\]/, 'Account or guest-mode changes must clear prior notification state');
assert.match(notifications, /if \(isCurrentRequest\(\)\) setIsLoading\(false\)/, 'Stale requests must not clear the current request loading indicator');


const phonePanelStyles = notificationStyles.slice(notificationStyles.lastIndexOf('@media (max-width: 480px)'));
assert.match(phonePanelStyles, /\.compact \.panel\s*\{[^}]*position:\s*fixed/s, 'On phones, the notification panel is positioned against the viewport to avoid clipping');
assert.match(phonePanelStyles, /left:\s*12px/s, 'The phone notification panel keeps a left viewport gutter');
assert.match(phonePanelStyles, /right:\s*12px/s, 'The phone notification panel keeps a right viewport gutter');
assert.match(phonePanelStyles, /max-height:\s*calc\(100dvh/s, 'The phone notification panel fits within the dynamic viewport');
assert.match(phonePanelStyles, /env\(safe-area-inset-top/s, 'The phone notification panel respects the device top safe area');
assert.doesNotMatch(phonePanelStyles, /right:\s*-\d+px/, 'The phone notification panel must not be shifted off-screen');

console.log('Header navigation and notification panel contract checks passed.');

assert.match(notifications, /const activeAccountId = useRef<string \| null>\(null\)/, 'Notification mutations must track the active account synchronously');
assert.match(notifications, /if \(!isSameSession\(\)\) return/, 'Late read mutations must not update a different account session');
assert.match(notifications, /if \(activeAccountId\.current !== accountId\) return/, 'Opening a stale notification must not navigate after an account switch');
assert.match(notifications, /canAccessSanctuaryPage\(destination, currentUser\.profile\.role\)/, 'Notification destinations must respect the current account role');
assert.match(notifications, /feature unavailable for your current account role\. It has not been marked as read/, 'Restricted notification destinations remain unread and explain why navigation was blocked');
assert.match(notifications, /if \(!canAccessSanctuaryPage\(destination, currentUser\.profile\.role\)\) \{[\s\S]*?return;[\s\S]*?\}\s*await markRead\(item\)/, 'Role access is checked before a notification is marked read');

