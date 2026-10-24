# RELEASING — shipping this plugin to official magpie (dist + npm)

> How a release of **@magpie-community/opencode-cloudflare-workers-ai-auth** reaches
> every magpie user. The source repo is **git-first**; the official channel is the
> upstream `magpie-community/plugins` monorepo, which rebuilds `dist` and publishes
> npm from its **own** `packages/cloudflare-workers-ai/` copy.

## Two channels (do not confuse them)

| Channel | Installed from | Updates when | Ship new UI/docs? |
|---|---|---|---|
| **git-first** | `magpie plugin add github:Guislabert/magpie-cloudflare-workers-ai` (this repo) | you push here | ✅ yes, immediately |
| **official dist/npm** | `magpie-community/plugins` → `dist` branch / npm | upstream merge → CI rebuild | ❌ only via PR + version bump |

`README.md` documents **both** channels. This repo has **no `dist/` of its own** and
never publishes npm directly — `package.json` `files[]` only lists what would ship,
and `npm` publishing is the community org's job.

## When to PR upstream

Only bump the upstream version and open a PR when the change is **functional**
(a bug fix or a feature). Pure docs/visual changes are served by the git-first
channel at zero cost; forcing them into dist adds ~20 KB of hero SVG to every
package download and an upstream review round-trip for no runtime value.

**Rule of thumb:** bundle any accumulated README/hero work together with the
*next* real code change, in one version bump, one PR.

## What the upstream package keeps (its `files[]`)

The upstream `packages/cloudflare-workers-ai/package.json` ships a **slim** set:

```
index.mjs
src/
README.md
README.zh-CN.md
README.ja.md
LICENSE
```

It intentionally **omits** `llms.txt` and `assets/*` (icon + hero). Those live
only in this repo and are served via git-first. Do not add them to upstream
`files[]` unless there is a real runtime reason.

> ⚠️ **Hero image caveat.** The READMEs reference `assets/hero-{light,dark}.svg`
> via `<picture srcset>`. Those files exist here but NOT in the upstream package.
> If you sync the new READMEs upstream and do NOT include `assets/hero-*.svg`,
> the images will appear broken on any README rendered from the upstream dist
> tarball. Options, in order of preference:
>   1. Leave upstream READMEs at the older (pre-hero) revision — dist keeps
>      working images via the git-first channel. *(default; recommended)*
>   2. Or, if you insist on syncing the new READMEs, also add
>      `assets/hero-light.svg` + `assets/hero-dark.svg` to upstream `files[]`
>      and copy them in. Accept the size cost.

## Release checklist (functional change → PR upstream)

```sh
# 1. In THIS repo: bump + changelog + tests + push (git-first is now live)
#    edit package.json version, add ## [x.y.z] to CHANGELOG.md
#    npm test  &&  node .github/scripts/version-check.mjs
#    git add -A && git commit && git push origin master

# 2. Sync the functional files into your plugins fork
./.github/scripts/sync-to-plugins.sh --version <x.y.z> --dry-run   # inspect
./.github/scripts/sync-to-plugins.sh --version <x.y.z>             # apply to fork
```

The sync script copies the slim runtime set (index.mjs, src/, README.zh-CN.md,
README.ja.md, LICENSE) plus the `files[]`-driven version bump into
`YOUR_PLUGINS_FORK/packages/cloudflare-workers-ai/`. Then:

```sh
# 3. In the fork: commit + push branch + open PR upstream
cd <fork> && git add packages/cloudflare-workers-ai && git commit -m "cloudflare-workers-ai: v<x.y.z>"
git push origin HEAD:release/cf-<x.y.z>
gh pr create --repo magpie-community/plugins \
  --base main --head <your-name>:release/cf-<x.y.z> \
  --title "cloudflare-workers-ai: v<x.y.z>" --body "…"
```

Upstream merge → `publish.yml` (path `packages/*/package.json`) rebuilds `dist`
and publishes npm automatically. **Nothing else to do.**

## Version bumps (SemVer)

- fix → PATCH (`0.0.3 → 0.0.4`)
- backward-compatible feature → MINOR (`0.0.4 → 0.1.0`)
- incompatible change → MAJOR before `1.0`

Bump `package.json` **and** `CHANGELOG.md` **and** every README Version badge in
one commit — `version-check.mjs` enforces all three stay equal.