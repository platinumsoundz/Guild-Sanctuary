# Work log — explicit journal prompt export

- Date: 2026-10-27
- Branch: `feat/self-discovery-journal-prompt-export-2026-10-27`, stacked on PR #117 → #116 → #115 → #102.
- Change: add a button to copy the generated journal prompt using the browser clipboard API. Show a status message on success and a manual-select fallback if copying is unavailable.
- Privacy: no journal entry is created, nothing is automatically saved, and no answer is transmitted. The member explicitly chooses whether and where to copy/save the prompt.
- Accessibility: copy outcome is announced using a status region.
- Verification: static contract assertion added. CI and browser clipboard behavior have not yet been verified for this branch.
- Integration: review/merge the parent PRs in dependency order.
