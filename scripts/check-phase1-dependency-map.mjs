import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const reportPath = 'docs/reports/phase1-dependency-map-2026-10-27.md';
const report = readFileSync(resolve(root, reportPath), 'utf8');

const contextPaths = [
  'AGENTS.md',
  'ROADMAP.md',
  'MASTER_BLUEPRINT.md',
  'AI_RESTORE_PROMPT.md',
  '.github/workflows/ci.yml',
  'package.json',
  'docs/SUPABASE_MIGRATION_DRIFT_INVENTORY_2026-10-26.md',
];
for (const path of contextPaths) {
  assert.ok(existsSync(resolve(root, path)), 'Required repository context is missing: ' + path);
}

const canonicalPaths = [
  'docs/SUPABASE_MIGRATION_DRIFT_INVENTORY_2026-10-26.md',
  'PHASE1_STAGING_CHECKLIST.md',
  'supabase/migrations/20261009000000_social_core_and_moderation.sql',
  'supabase/migrations/20261012000000_token_wallet_and_fulfillment.sql',
  'supabase/migrations/20261026120000_role_hierarchy_admin_tools.sql',
  'supabase/migrations/20261026233100_add_comment_report_target.sql',
  'supabase/migrations/20261026233200_restore_moderation_and_comment_controls.sql',
  'supabase/migrations/20261026233300_token_shop_schema_and_guard.sql',
  'supabase/migrations/20261026233400_lock_token_spending_until_staging.sql',
];
for (const path of canonicalPaths) {
  assert.ok(existsSync(resolve(root, path)), 'Canonical dependency is missing: ' + path);
  assert.ok(report.includes(path), 'Dependency map omits canonical path: ' + path);
}

const branchOnlyPaths = [
  'scripts/check-sql-handoff.mjs',
  'supabase/migrations/20261026000000_token_purchase_age_gate.sql',
  'supabase/migrations/20261026000100_token_refund_clawback.sql',
  'supabase/migrations/20261026000200_account_deletion_grace_period.sql',
  'supabase/migrations/20261026000400_admin_dashboard.sql',
  'supabase/migrations/20261026000500_moderation_action_guards.sql',
  'supabase/migrations/20261026113205_terms_acceptance_records.sql',
  'supabase/migrations/20261026113229_restrict_terms_acceptance_columns.sql',
  'supabase/migrations/20261027000000_admin_terms_acceptances.sql',
];
for (const path of branchOnlyPaths) {
  assert.ok(!existsSync(resolve(root, path)), 'Snapshot changed; review and update branch-only classification: ' + path);
  assert.ok(report.includes(path), 'Dependency map omits branch-only path: ' + path);
}

const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
for (const scriptName of ['lint', 'test', 'check:sql-handoff']) {
  assert.equal(packageJson.scripts?.[scriptName], undefined, 'Main script inventory changed; update the dependency map: ' + scriptName);
}

assert.ok(report.includes('5d5ad672d326f253c5a13171b620523dd7281a21'), 'Reviewed main SHA is missing');
assert.ok(report.includes('2e85add7b082ad113ed5fa54e43198c6f714d2da'), 'Reviewed PR #18 SHA is missing');
assert.match(report, /mergeable: false/i, 'Non-mergeable PR #18 status is not recorded');
assert.match(report, /Critical migration-order conflict/i, 'Moderation guard overwrite is not documented');
assert.match(report, /No dedicated staging\/test Supabase project/i, 'Staging auth blocker is not documented');
assert.match(report, /TOKEN_CHECKOUT_ENABLED=false/, 'Checkout safety gate is not documented');
assert.match(report, /NEXT_PUBLIC_TERMS_REQUIRED=false/, 'Terms safety gate is not documented');

console.log('Phase 1 dependency map contract passed: canonical dependencies exist, PR #18-only files remain non-canonical, and safety blockers are recorded.');
