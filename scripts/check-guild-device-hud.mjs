import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const navigation = read('../src/components/GuildNavigation.tsx');
const styles = read('../src/components/GuildNavigation.module.css');

assert.ok(navigation.includes('getBattery'), 'HUD should use the browser Battery API when available');
assert.ok(navigation.includes('batteryManager.level'), 'battery percentage should come from the device API');
assert.ok(navigation.includes('batteryManager.charging'), 'charging state should come from the device API');
assert.ok(navigation.includes('nav.connection'), 'HUD should read browser-provided connection metadata when available');
assert.ok(navigation.includes('signal strength is not exposed by the browser'), 'HUD must not fabricate Wi-Fi or cellular signal strength');
assert.ok(navigation.includes('const measureGuildPing = async () =>'), 'HUD should measure latency to the Guild origin');
assert.ok(navigation.includes("method: 'HEAD'"), 'Guild ping should use a lightweight HEAD request');
assert.ok(navigation.includes('cache: \'no-store\''), 'Guild ping should avoid cached responses');
assert.ok(navigation.includes('window.setInterval(() => { void measureGuildPing(); }, 15000)'), 'Guild ping should refresh at a restrained interval');
assert.ok(navigation.includes('requestAnimationFrame(measureFrameRate)'), 'HUD should estimate frame rate from animation frames');
assert.ok(navigation.includes('document.visibilityState === \'visible\''), 'HUD sampling should account for page visibility');
assert.ok(navigation.includes('deviceStatus.rtt'), 'HUD should render the measured Guild ping');
assert.ok(navigation.includes('deviceStatus.fps'), 'HUD should render the approximate interface FPS');
assert.ok(styles.includes('.deviceHud'), 'console HUD should have dedicated styling');
assert.ok(styles.includes('@media(max-width:560px)'), 'console HUD should adapt to narrow mobile screens');

console.log('Guild device HUD contract checks passed.');
