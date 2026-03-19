# Detection Philosophy

Cleanroom is not trying to be a general Android antivirus product. It is a technician support tool for reviewing likely junk utilities and recovering hijacked launcher/default states without forcing opaque automation.

## Core principles

- Detection is advisory.
- Human review stays in the loop for cleanup decisions.
- Trusted packages and protected packages should suppress destructive actions by default.
- Notification activity is contextual evidence, not a standalone verdict.
- Multi-signal matches matter more than any single weak keyword.

## What the scorer optimizes for

- Rank suspicious utility apps high enough that a technician sees them quickly.
- Explain why an app was ranked.
- Avoid obvious false positives on legitimate mainstream apps.
- Treat launcher/default-handler risk as a safety concern even when the app is not classic junkware.

## Guardrails

- Exact known-bad matches can surface immediately.
- Trusted package and vendor-prefix matches reduce or suppress suspicion.
- Protected packages are kept out of bulk cleanup by default.
- Multi-device sessions require explicit device selection before scan or cleanup.
- Cleanup actions are logged into persisted reports for auditability.

## Practical consequence

Cleanroom should prefer a conservative `suspicious` or `review` result over confidently labeling a normal app as junk. The tool is most useful when it narrows technician attention without pretending to replace technician judgment.
