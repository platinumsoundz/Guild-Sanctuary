# The Sanctuary — collaboration guide

This guide is for the product owner and anyone helping with the project. You do not need to be a developer to review a preview or give useful feedback.

## The simple model

- **Main** is the shared baseline. It should represent the accepted product, not unfinished experiments.
- **A branch** is a separate line of work. It lets someone change a feature without overwriting the main version.
- **A pull request (PR)** is the proposal to bring a branch back into another branch. It shows the changes, build checks, discussion, and review before merging.
- **A preview deployment** is a test version of a branch when the hosting integration creates one. A green build is not proof that a feature works in a real browser.
- **An issue** is a tracked task, bug, or idea. It gives the team one place to discuss scope and completion.

## The workflow we will use

1. **Capture the task.** Describe the user problem and the result you want. Use a GitHub issue or the beta feedback form in The Sanctuary.
2. **Pick one owner.** Every task should have one person responsible for making progress. Others can review or contribute.
3. **Create a small branch.** Use names such as feat/circle-preview, fix/mobile-navigation, or docs/beta-guide. Do not work directly on main for normal feature changes.
4. **Build one coherent change.** Keep the diff focused. Avoid mixing unrelated redesigns, database migrations, and deployment changes into one PR.
5. **Open a pull request.** Explain what changed, why, how to test it, what is still unfinished, and how to roll it back. Mark it draft while work is incomplete.
6. **Check the evidence.** Review automated checks and, when possible, open the preview on mobile and desktop. A successful build is necessary but not the same as user acceptance.
7. **Review and merge.** Check the preview, confirm the change matches the task, and merge only when required checks and approvals are satisfied.
8. **Verify after merge.** Confirm the deployed commit, test the live route, and record any follow-up issue. Never call a feature live just because a PR exists.

## How Ashley can collaborate without coding

- Open a pull request and read its Conversation and Files changed tabs.
- Open the preview deployment link if one appears in the PR checks.
- Try the changed screen on a phone and a desktop browser.
- Report the exact screen, what you clicked, what happened, and what you expected.
- Use the in-app beta feedback panel to prepare a report, then paste it into a message or GitHub issue.
- Ask for a change by describing the outcome, not by prescribing code. For example: “Make the Circles preview easier to find from Today” is a good task.

## Inviting collaborators

Repository access is controlled by GitHub, not by the app. The repository owner can open the repository Settings → Collaborators area, invite a person's GitHub username, and choose the least access they need. The invitee must accept. Do not share passwords, access tokens, environment files, database service-role keys, or payment credentials in chat or a PR.

Suggested access:
- **Read / Triage:** follow work, review issues, and help test.
- **Write:** create branches and pull requests.
- **Maintain / Admin:** reserve for trusted people who genuinely need repository or settings control.

Do not invite anyone by guessing their username. Confirm the intended GitHub account first.

## Work-in-progress labels

- **Available:** the route is implemented; still test the specific path before promising production reliability.
- **In preview:** an interface or partial flow exists, but some behavior or integration remains unverified.
- **In design:** the product direction is shown as a concept, not a working system.
- **Safety gated:** visible for planning, but must not be enabled until its explicit release checks pass.

## Definition of done

A feature is ready to call done when:
- its purpose and user-facing state are clear;
- it works at mobile and desktop sizes;
- keyboard focus and readable contrast have been checked;
- loading, empty, error, and success states are considered;
- automated checks pass;
- database, auth, payments, or moderation dependencies have been tested in a designated staging environment;
- the PR and roadmap state what was actually verified;
- rollback or follow-up steps are known.

## Keep changes safe

- Never commit secrets. Use environment variables and the hosting provider's secret store.
- Never apply database migrations to production as part of an ordinary UI task.
- Do not enable live checkout, token purchases, ads, or terms gates based only on a visual preview.
- Keep experimental work in branches and previews. Close or revert a branch when it is no longer wanted.
- Ask before inviting collaborators, changing permissions, merging major changes, or altering production services.
