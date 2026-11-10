# @local/dsh-account-usage

A DeepSeek Harness UI plugin: it prints the account credit usage as plain text
in the status row below the composer, right after the built-in context meter.

## What it shows

- One plain text reading in `conversation.composer.dock`, e.g. `$2.00 · ¥0.55`.
  It uses the same size, color, and tabular figures as the host's own stats, so
  it reads as part of the row rather than a new control.
- **No ring and no click target.** The reading is a plain span: clicking it does
  nothing, and the tooltip/accessible name is `Usage: <amount>`.
- Nothing is rendered while the account is signed out or before the first read
  arrives. If a refresh fails after a successful read, the last amount stays on
  screen marked visually muted, and a first read that never succeeds shows `—`.

## Where it comes from

The reading is built from the same account projection the Account settings page
uses:

- `ctx.remote.account.getState()` — sign-in state.
- `ctx.remote.account.getBalance(clientMetadata)` — topped-up and granted
  wallets. Amounts are grouped per currency and formatted like the settings
  page; nothing is cached server-side by this plugin.

The balance is re-read on mount, when the window regains focus or visibility,
and every five minutes. The client identity the platform sees is composed from
the page boot manifest's release version, the active UI language, and the UTC
offset.

## Placement

The reading registers in `conversation.composer.dock` as its own cell
(`account-usage`, order 2), which keeps the host's own `activity` and `usage`
cells intact. Inside the dock row it uses flex `order: 1` so it renders after
the host context meter rather than before it.

## Install

From a DSH profile with Full access:

```
plugin_manager install_bundle <absolute path to this directory>
```

or add the directory to the profile's bundle list. The bundle is client-only;
its Host half only keeps the Loader row alive.

## Privacy

The plugin reads only the signed-in account's own balance through the existing
account Remote. It stores nothing, logs no credentials, and never talks to the
platform from the browser itself.

## License

MIT — see [LICENSE](LICENSE).
