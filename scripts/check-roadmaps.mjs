import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = path => readFileSync(path, 'utf8');
const sanctuary = read('src/components/SanctuaryRoadmap.tsx');
const guild = read('src/components/GuildRoadmap.tsx');
const workspace = read('src/components/AppWorkspace.tsx');
const navigation = read('src/components/Navigation.tsx');
const context = read('src/context/AppContext.tsx');
const guildStyles = read('src/components/GuildRoadmap.module.css');
const sanctuaryStyles = read('src/components/SanctuaryRoadmap.module.css');

assert.match(sanctuary, /<h1>Roadmap<\/h1>/, 'Sanctuary roadmap uses a simple member-facing title');
assert.match(sanctuary, /<details className=\{styles\.moreInfo\}>/, 'Sanctuary cards hide deeper explanations behind More info');
assert.match(sanctuary, /What we are working on/, 'Sanctuary roadmap explains the feature list plainly');
assert.doesNotMatch(sanctuary, /The 5 Sleeves|The-5-Sleeves|Guild Sanctuary|Connected workstreams|Three projects\. One roadmap/, 'Sanctuary roadmap must exclude separate games and Guild work');
assert.match(sanctuary, /Sanctuary-built mini-games/, 'Sanctuary roadmap may describe its own Cosmic Arcade');
assert.match(guild, /<h1>Guild Roadmap<\/h1>/, 'Guild has a separate roadmap page');
assert.match(guild, /persistent Linux workspace/, 'Guild roadmap explains the Cloud Lab future');
assert.match(guild, /<details className=\{styles\.moreInfo\}>/, 'Guild cards hide deeper explanations behind More info');
assert.match(guild, /not a native desktop app/, 'Guild roadmap sets honest native-launch expectations');
assert.doesNotMatch(guild, /The 5 Sleeves/, 'Guild roadmap does not pull in the separate 5 Sleeves projects');
assert.match(workspace, /activeNavigation === 'roadmap'[\s\S]*?<SanctuaryRoadmap \/>/, 'Sanctuary roadmap route is wired');
assert.match(workspace, /activeNavigation === 'guild-roadmap'[\s\S]*?<GuildRoadmap \/>/, 'Guild roadmap route is wired');
assert.match(context, /'guild-roadmap'/, 'Guild roadmap is a valid navigation state');
assert.match(navigation, /id: 'roadmap', label: 'Sanctuary Roadmap'/, 'Sanctuary roadmap has a clear navigation label');
assert.match(navigation, /id: 'guild-roadmap', label: 'Guild Roadmap'/, 'Guild roadmap has a separate navigation label');
assert.match(guildStyles, /@media\(max-width:560px\)/, 'Guild roadmap is responsive');
assert.match(guildStyles, /:focus-visible/, 'Guild roadmap has visible keyboard focus');
assert.match(sanctuaryStyles, /\.moreInfo summary:focus-visible/, 'Sanctuary More info has visible keyboard focus');

console.log('Roadmap separation and readability contracts passed.');
