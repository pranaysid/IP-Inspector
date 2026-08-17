# IP Intelligence Inspector – Chrome Extension

Chrome extension for checking an IP directly against ProxyCheck and VPNAPI.

## First run

The extension asks for:

- ProxyCheck API key
- VPNAPI API key

After saving, the keys are stored in `chrome.storage.local` and reused automatically.

## Direct API mode

The extension no longer requires the Flask backend. It calls the APIs directly:

- ProxyCheck v2: `https://proxycheck.io/v2/<IP>?key=...&vpn=1&asn=1&node=1&time=1&risk=1&port=1&seen=1&days=7`
- VPNAPI: `https://vpnapi.io/api/<IP>?key=...`

The request parameters match the original Python implementation.

### ProxyCheck note

ProxyCheck documents a client-side/CORS mode using a public API key and configured origins. If your normal ProxyCheck key is rejected for browser/client-side use, create/use the client-side public key in the ProxyCheck dashboard and configure the extension origin as required by ProxyCheck.

## Install

1. Extract the ZIP.
2. Open `chrome://extensions`.
3. Enable Developer mode.
4. Click **Load unpacked**.
5. Select the extension folder.
6. Open the extension.
7. Enter both API keys on first run.

## Change API keys

Open the extension settings (gear icon) to update or clear the saved keys.

## Security

The keys are stored in Chrome extension local storage. This is suitable for a personal/internal extension, but it should not be treated as a secure secret vault. Anyone with access to the local extension profile may potentially retrieve them.
