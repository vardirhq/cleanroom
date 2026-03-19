# Product Summary

Cleanroom is a desktop support-desk workbench for **Android junk-app remediation**.

It connects to phones over ADB, surfaces likely junk utilities such as fake cleaners, boosters, optimizers, fake security apps, and fake launchers, then helps a technician review, remove, and document those changes safely.

## Product posture

Cleanroom should stay focused on one job:

- identify likely junk and nuisance apps
- guide safe cleanup
- recover hijacked defaults such as fake launchers
- document before/after service work

## What belongs in scope

Features that directly improve that workflow are in scope:

- better junk-app detection and categorization
- launcher/default-app recovery helpers
- notification-spam and nuisance-app diagnosis
- stronger protected-package and trust logic
- technician review controls and audit-friendly reporting

## What does not belong in scope

Cleanroom should not expand into a general Android utility suite. Out of scope by default:

- hardware diagnostics
- backup and migration tooling
- general performance tuning
- broad ADB device management
- antivirus or full forensic claims

## Decision rule

When considering a new feature, ask:

**Does this help a technician identify, remove, recover from, or document Android junk-app contamination?**

If the answer is no, it probably belongs in a different product.
