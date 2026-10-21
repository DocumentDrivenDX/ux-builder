---
"@ux-builder/create-app": patch
---

HELIX in a new app, aligned with FEAT-010. The release request honours `HTTPS_PROXY`, `HTTP_PROXY` and `NO_PROXY` through undici's `EnvHttpProxyAgent`; `undici` is now a dependency (MIT). If the bundled HELIX is missing or bad when it is needed, the app is created without HELIX, and the output says why, instead of creation failing. `--helix-offline` with `--helix-version` is refused. With `--no-helix`, the app's `e2e/starter.spec.js` cites no criteria. A missing template in the installed HELIX is printed, naming its type. The app's `ux-assessment.yml` lists the `lint` and `audit` test commands as well as `e2e`.
