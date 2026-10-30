import { readFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const migration = read('../supabase/migrations/20261030150000_restore_guild_community_scope.sql');
const app = read('../src/components/AppWorkspace.tsx');
const posts = read('../src/modules/feeds/service.ts');
const feedHook = read('../src/modules/feeds/useFeed.ts');
const feedUi = read('../src/modules/feeds/components/FeedContent.tsx');
const shorts = read('../src/modules/shorts/service.ts');
const shortsUi = read('../src/modules/shorts/components/ShortsFeed.tsx');
const events = read('../src/modules/events/service.ts');
const messages = read('../src/modules/messages/service.ts');
const messageRepo = read('../src/modules/messages/supabaseRepository.ts');
const notifications = read('../src/components/NotificationBar.tsx');
const moderation = read('../src/modules/moderation/service.ts');
const generatedTypes = read('../src/services/supabase/database.types.ts');

assert.match(migration, /add column if not exists world_type public\.world_type/, 'Notifications and reports must carry their world identity');
assert.match(migration, /sync_content_report_world_type/, 'Reports must inherit the target content world');
assert.match(migration, /notify_social_like[\s\S]*?target_world[\s\S]*?world_type/, 'Like notifications must remain in the target world');
assert.match(migration, /notify_social_comment[\s\S]*?target_world[\s\S]*?world_type/, 'Comment notifications must remain in the target world');
assert.match(migration, /create_scoped_conversation/, 'Persistent messaging must support separate world-scoped conversations');

assert.match(app, /const worldType: WorldType = activeNavigation === 'guild' \? 'guild' : 'sanctuary'/, 'The active shell must choose the current world');
assert.match(app, /<Feed worldType=\{worldType\}/, 'Community feed must receive the current world');
assert.match(app, /<ShortsFeed worldType=\{worldType\}/, 'Shorts must receive the current world');
assert.match(app, /<MeetupCalendarPlaceholder worldType=\{worldType\}/, 'Events must receive the current world');
assert.match(app, /<MessagesInbox[\s\S]*?worldType=\{worldType\}/, 'Inbox must receive the current world');
assert.match(app, /<NotificationBar fullPage worldType=\{worldType\}/, 'Full-page notifications must receive the current world');
assert.match(app, /<ModerationDashboard role=\{currentUser\.profile\.role\} worldType=\{worldType\}/, 'Moderation queues must receive the current world');

assert.match(posts, /\.eq\('world_type', worldType\)/, 'Post reads and writes must scope to the requested world');
assert.match(posts, /world_type: input\.worldType \?\? 'sanctuary'/, 'New posts must be tagged with their world');
assert.match(feedHook, /fetchFeed\(worldType\)/, 'Feed hook must fetch the requested world');
assert.match(feedUi, /THE GUILD · COMMUNITY/, 'Guild community must have its own presentation');
assert.match(shorts, /\.eq\('world_type', worldType\)/, 'Shorts reads and mutations must scope to the requested world');
assert.match(shortsUi, /fetchShortVideos\(worldType\)/, 'Shorts UI must load the requested world');
assert.match(events, /\.eq\('world_type', worldType\)/, 'Events reads and mutations must scope to the requested world');
assert.match(messages, /conversation\.worldType \?\? 'sanctuary'\) !== worldType/, 'Local messages must not cross world boundaries');
assert.match(messageRepo, /create_scoped_conversation/, 'Persistent messages must create conversations in the requested world');
assert.match(messageRepo, /\.eq\('world_type', worldType\)/, 'Persistent conversations must be fetched only from the active world');
assert.match(notifications, /\.eq\('world_type', worldType\)/, 'Notification lists and read actions must be scoped by world');
assert.match(moderation, /\.eq\('world_type', worldType\)/, 'Moderation queue must only show reports from its world');
assert.match(generatedTypes, /type SanctuaryScope = 'sanctuary' \| 'guild'/, 'Generated database types must support both worlds');
assert.match(generatedTypes, /world_type: SanctuaryScope/, 'Generated database rows must expose world identity');

console.log('Guild community scope contract checks passed.');
