# Self-Discovery Centre — Product, Privacy, and Delivery Contract

**Status:** Implementation contract; not evidence that the feature is live.
**Product:** The Sanctuary
**Owner:** Ashley
**Purpose:** Give members useful, compassionate self-reflection without diagnosing them, exposing sensitive answers, or presenting uncertain patterns as facts.
**Related work:** Roadmap self-knowledge decisions; beta showcase PR #85; showcase reconciliation issue #98; roadmap status reconciliation issue #99.

## 1. Member outcome

A member can optionally answer a short set of reflective questions, receive a clear and non-clinical summary, and choose whether any part of that summary is visible to other members. The feature should help people notice patterns and try small practical actions; it must not label, rank, diagnose, predict, or tell people who they are.

A useful completed session produces four things:
1. **A tentative pattern:** a plain-language observation linked to the member's own answers.
2. **A practical experiment:** one small action the member can try, with an easy way to skip it.
3. **A micro-lesson:** a short explanation of a relevant skill or concept.
4. **A journal prompt:** an invitation to reflect, not an obligation.

Every output should say that it is a reflection based on answers provided, may be incomplete or wrong, and can be edited or discarded. Avoid certainty language such as “you are always,” “your brain is wired to,” or “this proves.”

## 2. Question domains and boundaries

Use one question at a time, with a visible progress indicator, back/edit controls, save-and-resume, and a skip option. Keep the first run short; allow members to return later rather than forcing a long quiz.

Suggested domains:
- Recharge: what tends to restore energy and what drains it?
- Decisions: what information or support helps when making a difficult choice?
- Motivation: what makes a task feel approachable?
- Communication: what helps a person feel heard and respected?
- Learning and practice: what formats or environments does the member personally find useful?
- Values and direction: what matters to the member right now?
- Optional interests and spiritual lenses: user-chosen context, never presented as scientific evidence.

An optional zodiac lens can be offered only as entertainment or personal meaning. Do not request a birth date just to infer a sign. Do not infer sensitive attributes or mental-health conditions from answers. Do not use an informal questionnaire to claim official MBTI results, validated learning styles, neurotype, or any clinical conclusion.

Questions must be inclusive and non-leading. Avoid requiring disclosures about trauma, self-harm, abuse, medication, sexuality, religion, or other sensitive topics. If the member volunteers distress, respond with supportive, non-diagnostic language and clear access to appropriate help where relevant; do not pretend the quiz is a clinical service.

## 3. Consent and privacy model

### Default state
- The feature is opt-in and can be abandoned without penalty.
- Raw answers are private to the member and authorized server-side processing.
- Profile visibility is off by default.
- No answers or generated insights are sent to friends, followers, moderators, analytics, advertising systems, or other third parties by default.
- No public compatibility score, personality ranking, type leaderboard, or inferred match score.

### Separate controls
Provide distinct controls for saving private answers, generating/updating a reflection, sharing selected summary fields, hiding a previously shared summary, and deleting saved answers and the derived summary. Consent to save answers is not consent to publish them. Changing a response must not silently broaden sharing. Deletion should remove raw answer records and derived profile projections where retention obligations permit; explain any unavoidable audit retention plainly.

### Data minimization
Store only answer values needed to support the feature, timestamps required for save/resume, schema/version metadata, and derived fields the member explicitly chooses to keep. Do not store a psychological score without a clear, reviewed need and transparent interpretation. Avoid duplicating raw answers into profile JSON, logs, event payloads, analytics, or support records.

## 4. Suggested data contract

Treat this section as a design proposal until checked against the actual mainline schema and deployed database.

### Raw answer record
- id: server-generated unique identifier.
- user_id: authenticated account owner.
- questionnaire_version: immutable version identifier.
- question_id: stable identifier within that version.
- answer: constrained answer payload validated against the versioned question schema.
- created_at and updated_at: server timestamps.

Enforce one current answer per user, questionnaire version, and question unless explicit answer history is required. If answer history is required, document its retention and deletion behavior first.

### Derived reflection record
- id and user_id.
- questionnaire_version.
- summary_text: short and editable.
- pattern_key: optional allow-listed rule identifier, not a diagnostic category.
- practical_action, micro_lesson, journal_prompt.
- generated_at and updated_at.
- sharing_enabled: default false.
- shared_fields: allow-listed field names only, default empty.
- consent_updated_at.

Derived content must be traceable to the questionnaire version and regeneratable. Do not make raw answers publicly readable through this table. Keep profile-card data as a minimal projection of explicitly shared fields, not a join that exposes source answers.

## 5. Authorization and database rules

Before implementation, inspect the current repository and live migration inventory. Reuse existing tables where they already meet these requirements; do not create a duplicate profile, answer store, or reflection table just to match this proposal.

For any new or changed Supabase objects:
- Enable RLS on all member answer and reflection tables.
- A member may read, insert, update, and delete only their own raw answers.
- A member may read and edit their own private reflection and sharing preferences.
- Public/profile queries may return only allow-listed, explicitly shared projection fields.
- No policy may permit another member to read raw answers.
- Review each SECURITY DEFINER function individually; require strict input validation, a fixed safe search_path, and explicit authorization tests.
- Do not trust client-supplied user_id, role, sharing flag, score, questionnaire version, or generated summary. Derive identity from authenticated server/database context and validate allowed values.
- Server-generated reflection writes must be scoped to the authenticated owner and fail closed when identity or authorization is missing.
- Keep service-role credentials server-only. Never put them in public environment variables, browser bundles, client logs, or error messages.
- Migrations remain code-only until reviewed and deliberately applied to staging by the owner.

## 6. Explainable reflection engine

Start with a small deterministic rule-based engine. Each rule must declare the question IDs it reads, its activation condition, the exact output template or approved content key, a qualification phrase, one practical action, one micro-lesson and one journal prompt, and tests for positive, negative, incomplete, and contradictory answers.

Rules should describe preferences and situational tendencies, not fixed identity. Example: “You selected quiet time as helpful for recharging; you could experiment with protecting ten quiet minutes after a busy day.” Avoid pretending that one answer establishes a stable trait.

If a future generative model is used, keep output private, ground it in the member's own responses, provide edit/delete controls, prevent prompt injection from changing access or sharing settings, and never allow generated text to write directly to profile visibility. Do not send answers to an external model/provider until data handling, consent, retention, and vendor settings have been reviewed.

## 7. Accessibility and UX acceptance

- Works with keyboard only and screen readers.
- Question, answer options, validation, progress, and save state have meaningful labels.
- Focus is managed when moving between questions and when errors appear.
- Color is never the only indicator of selected answers or progress.
- Touch targets and text remain usable on narrow screens and at zoom.
- Respect reduced-motion preferences and current theme settings.
- Support save/resume, back, edit, skip, restart, and delete.
- Distinguish not answered from prefer not to say.
- Avoid guilt language, streaks, urgency, or punitive completion states.
- Clearly mark the result as a reflection, not diagnosis or professional advice.

## 8. Required test plan

### Pure logic
- Every rule has positive, negative, missing, and contradictory-answer tests.
- Unknown question IDs, invalid payloads, stale questionnaire versions, and malformed answers are rejected.
- Incomplete answers produce a qualified result or no result, never fabricated certainty.
- Results are deterministic for the same versioned answer set.

### Authorization and privacy
- User A cannot read, update, delete, or regenerate User B's answers or reflection.
- User A cannot change User B's sharing preferences.
- Unauthenticated requests fail closed.
- Profile/public queries return no fields until sharing is explicitly enabled.
- Sharing one field does not expose adjacent private fields or raw answers.
- Hide/unshare takes effect on profile queries immediately after successful persistence.
- Delete removes answer and derived data according to the documented retention policy.
- Logs and analytics do not contain answer text or sensitive reflection content.

### Product flow
- New member can skip the entire feature.
- Member can complete a partial session, leave, and resume.
- Member can edit an earlier answer and see the reflection update.
- Member can hide and delete their results.
- Guest/read-only sessions cannot save answers or share a profile summary.
- Responsive layout and keyboard/screen-reader flows pass browser checks.

### Release gate
Do not describe this feature as production-ready until the exact commit has passing CI, staging RLS/authorization tests, mobile and desktop browser review, and verified deletion/sharing behavior. A merged PR or successful static check alone is not sufficient.

## 9. Delivery sequence
1. Audit mainline: locate existing questionnaire UI, profile projection, Supabase migrations, RLS, and test scripts; record what is actually present.
2. Build private vertical slice: versioned questions, local UI state, answer validation, private save/resume, deterministic reflection.
3. Add persistence only after schema review: additive migration, strict RLS, explicit grants, and adversarial cross-account tests.
4. Add sharing as a separate feature: off by default, allow-listed fields, immediate unshare, deletion path.
5. Reconcile the beta showcase PR: do not merge stacked/conflicted history wholesale; cherry-pick or rebuild only reviewed feature commits against current main.
6. Staging verification: use two independent accounts, inspect actual returned rows, test all denial paths, then record exact SHA and evidence.
7. Production release: only after owner approval and all release gates pass.

## 10. Handoff checklist
- [ ] Existing schema and mainline implementation inspected.
- [ ] No duplicate answer/profile data model introduced.
- [ ] Question set reviewed for leading, clinical, and sensitive questions.
- [ ] Consent copy approved and shown before saving.
- [ ] RLS and grants reviewed object by object.
- [ ] Cross-account denial tests pass.
- [ ] Sharing defaults off and field allow-list enforced server-side.
- [ ] Deletion behavior documented and tested.
- [ ] Accessibility and responsive checks pass.
- [ ] Exact commit, CI, staging evidence, rollback, and remaining gaps recorded.
- [ ] No statement implies E2EE, diagnosis, or production verification without evidence.