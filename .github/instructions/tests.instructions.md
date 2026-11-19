---
applyTo: "test/**"
---

# Test instruction scope

- Prefer stable selectors and semantic hooks (`role`, ARIA attributes, durable `data-*`) over styling classes.
- Add focused tests only for behavior introduced or changed.
- Keep fixture/setup changes minimal and local to the tested behavior.
- Keep assertions user-observable (behavior, output, accessibility), not implementation detail.
