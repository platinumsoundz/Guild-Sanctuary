import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync('src/components/GuildDiagnosticsPanel.tsx', 'utf8');
const styles = readFileSync('src/components/GuildDiagnosticsPanel.module.css', 'utf8');
const navigation = readFileSync('src/components/GuildNavigation.tsx', 'utf8');

assert.match(navigation, /import \{ GuildDiagnosticsPanel \} from '\.\/GuildDiagnosticsPanel'/, 'Quick Menu imports the diagnostics panel');
assert.match(navigation, /<GuildDiagnosticsPanel \/>/, 'diagnostics panel is visible inside the page-preserving Quick Menu');
assert.match(navigation, /Touch navigation controls/, 'Quick Menu exposes touch-control visibility settings');
assert.match(navigation, /aria-pressed=\{controlsOpen\}/, 'touch-control visibility is exposed as an accessible toggle');
assert.match(panel, /getConnectedGamepad\(\)/, 'controller status uses the shared safe controller abstraction');
assert.match(panel, /gamepadconnected/, 'controller connect events refresh diagnostics');
assert.match(panel, /gamepaddisconnected/, 'controller disconnect events refresh diagnostics');
assert.match(panel, /pad\?\.buttons\.length/, 'diagnostics report the detected controller button count');
assert.match(panel, /pad\?\.axes\.length/, 'diagnostics report the detected controller axis count');
assert.match(panel, /aria-labelledby="guild-diagnostics-title"/, 'diagnostics section has an accessible title');
assert.match(panel, /aria-live="polite"/, 'audio test feedback is announced accessibly');
assert.match(panel, /onClick=\{\(\) => void playAudioTest\(\)\}/, 'audio test only runs after an explicit user action');
assert.match(panel, /oscillator\.stop\(context\.currentTime \+ 0\.21\)/, 'test tone has a bounded duration');
assert.match(panel, /context\.close\(\)/, 'audio context is closed after the test to avoid lingering resources');
assert.doesNotMatch(panel, /getUserMedia|MediaDevices|fetch\(/, 'diagnostics do not request microphone access or send device details to a server');
assert.match(styles, /:focus-visible/, 'diagnostic test controls have visible keyboard focus');
assert.match(styles, /@media\(max-width:400px\)/, 'diagnostics layout adapts to narrow mobile screens');

console.log('Guild device diagnostics contract passed.');
