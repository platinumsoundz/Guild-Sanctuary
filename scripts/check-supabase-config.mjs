import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const config = readFileSync('src/services/supabase/config.ts', 'utf8');
const clients = [
  'src/services/supabase/client.ts',
  'src/lib/supabase/client.ts',
  'src/lib/supabase/server.ts',
].map((path) => ({ path, source: readFileSync(path, 'utf8') }));

assert.match(config, /NEXT_PUBLIC_SUPABASE_URL/);
assert.match(config, /NEXT_PUBLIC_SUPABASE_ANON_KEY/);
assert.match(config, /new URL\(rawUrl\)/);
assert.match(config, /parsedUrl\.protocol !== 'https:'/);
assert.match(config, /parsedUrl\.username \|\| parsedUrl\.password \|\| parsedUrl\.search \|\| parsedUrl\.hash/);
assert.match(config, /service-role key in NEXT_PUBLIC_\*/);

for (const { path, source } of clients) {
  assert.match(source, /getSupabasePublicConfig/, `${path} must use the shared Supabase configuration validator`);
  assert.doesNotMatch(source, /SUPABASE_SERVICE_ROLE_KEY|service_role/i, `${path} must not expose service-role credentials`);
}

console.log('Supabase connection configuration contract passed.');
