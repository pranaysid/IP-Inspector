# IP Intelligence Inspector

A lightweight Chrome extension that checks any IPv4/IPv6 address against [ProxyCheck](https://proxycheck.io) and [VPNAPI](https://vpnapi.io) in one click, surfacing VPN, proxy, Tor, and relay signals side by side — no backend server required.

![Manifest](https://img.shields.io/badge/manifest-v3-blue) ![Status](https://img.shields.io/badge/status-unpacked%20install-yellow)

## Features

- **Dual-source lookups** — queries ProxyCheck and VPNAPI in parallel and merges the results into a single verdict
- **Signal grid** — VPN / Proxy / TOR / Relay flags at a glance, with detected values highlighted
- **Risk score** — ProxyCheck's 0–100 risk score with a color-coded gauge
- **Geo & network info** — country (with flag), city/region, ISP/org, and ASN
- **Persistent last search** — the popup remembers your most recent lookup across opens/closes
- **One-click copy** — copy the full raw result as JSON
- **Local-only keys** — your ProxyCheck and VPNAPI keys are stored in `chrome.storage.local` and never leave your machine except in the direct API calls you initiate

## Screenshot
<img width="351" height="451" alt="image" src="https://github.com/user-attachments/assets/aebcf5ae-f748-4a23-a578-b50b81ba8bf5" />




## Install (unpacked / developer mode)

The extension isn't published to the Chrome Web Store yet, so install it as an unpacked extension:

1. Download or clone this repository.
2. Open `chrome://extensions` in Chrome.
3. Toggle **Developer mode** on (top-right corner).
4. Click **Load unpacked**.
5. Select the folder containing `manifest.json`.
6. The IP Inspector icon appears in your toolbar — pin it for quick access.
7. Click the icon and enter your **ProxyCheck** and **VPNAPI** API keys when prompted (both are free to sign up for). Keys are saved locally and only need to be entered once.

## Usage

1. Click the toolbar icon.
2. Enter an IPv4 or IPv6 address and press **Enter** or click search.
3. Review the verdict, signal grid, risk score, and per-source details.
4. Use the copy icon in the top bar to grab the full JSON result, or the gear icon to update/clear your saved API keys.

## Permissions

| Permission | Why it's needed |
|---|---|
| `storage` | Saves your API keys and your last lookup locally |
| `clipboardWrite` | Powers the "copy result" button |
| Host permissions (ProxyCheck / VPNAPI) | Lets the extension call both APIs directly from the popup |

## Privacy

- API keys and lookup results are stored **only** in `chrome.storage.local` on your machine.
- The only network calls this extension makes are to `proxycheck.io` and `vpnapi.io`, using the IP address you enter.
- No analytics, telemetry, or third-party servers are involved.

## Roadmap

- [ ] Publish to the Chrome Web Store
- [ ] Scoped host permissions for the two API domains only
- [ ] Optional dark mode

## License

Personal/internal use. Add a license of your choice before publishing publicly.
