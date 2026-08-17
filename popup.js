const $ = (id) => document.getElementById(id);
let lastResult = null;

const PROXYCHECK_BASE = "https://proxycheck.io/v2";
const VPNAPI_BASE = "https://vpnapi.io/api";
const LAST_LOOKUP_KEY = "lastLookup";

document.addEventListener("DOMContentLoaded", async () => {
  const settings = await chrome.storage.local.get({
    proxycheckApiKey: "",
    vpnapiApiKey: ""
  });

  if (!settings.proxycheckApiKey || !settings.vpnapiApiKey) {
    showSetup();
    return;
  }

  await initApp();
});

async function initApp() {
  $("backendLabel").textContent = "Direct API mode";

  $("settingsBtn").addEventListener("click", () => chrome.runtime.openOptionsPage());
  $("searchBtn").addEventListener("click", checkIp);
  $("ipInput").addEventListener("keydown", (e) => {
    if (e.key === "Enter") checkIp();
  });
  $("moreBtn").addEventListener("click", copyResult);

  const params = new URLSearchParams(location.search);
  if (params.get("ip")) {
    $("ipInput").value = params.get("ip");
    checkIp();
    return;
  }

  // Popup HTML/JS is torn down every time the popup closes (including when
  // it just loses focus), so restore the last completed lookup from
  // chrome.storage.local instead of showing an empty state again.
  const stored = await chrome.storage.local.get({ [LAST_LOOKUP_KEY]: null });
  if (stored[LAST_LOOKUP_KEY]) {
    restoreLookup(stored[LAST_LOOKUP_KEY]);
  }
}

function restoreLookup(cached) {
  $("ipInput").value = cached.ip;
  lastResult = { ip: cached.ip, proxycheck: cached.proxycheck, vpnapi: cached.vpnapi };

  const proxyState = cached.proxyOk
    ? { status: "fulfilled", value: cached.proxycheck }
    : { status: "rejected", reason: { message: cached.proxyError || "Request failed" } };
  const vpnState = cached.vpnOk
    ? { status: "fulfilled", value: cached.vpnapi }
    : { status: "rejected", reason: { message: cached.vpnError || "Request failed" } };

  renderResults(lastResult, proxyState, vpnState);
  $("lastUpdated").textContent = `Last updated: ${formatRelativeTime(cached.timestamp)}`;
  setView("results");
}

function formatRelativeTime(ts) {
  if (!ts) return "earlier";
  const diffMs = Math.max(0, Date.now() - ts);
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function showSetup() {
  $("setupState").classList.remove("hidden");
  $("mainApp").classList.add("hidden");

  $("saveKeysBtn").addEventListener("click", saveKeys);
  $("proxyKey").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveKeys();
  });
  $("vpnKey").addEventListener("keydown", (e) => {
    if (e.key === "Enter") saveKeys();
  });
}

async function saveKeys() {
  const proxycheckApiKey = $("proxyKey").value.trim();
  const vpnapiApiKey = $("vpnKey").value.trim();
  $("setupError").classList.add("hidden");

  if (!proxycheckApiKey || !vpnapiApiKey) {
    $("setupError").textContent = "Please enter both API keys.";
    $("setupError").classList.remove("hidden");
    return;
  }

  await chrome.storage.local.set({ proxycheckApiKey, vpnapiApiKey });
  location.reload();
}

function isIp(value) {
  const ipv4 = /^(?:(?:25[0-5]|2[0-4]\d|1?\d?\d)\.){3}(?:25[0-5]|2[0-4]\d|1?\d?\d)$/;
  const ipv6 = /^(?:[0-9a-fA-F]{0,4}:){2,7}[0-9a-fA-F]{0,4}$/;
  return ipv4.test(value) || ipv6.test(value);
}

async function getApiKeys() {
  return chrome.storage.local.get({ proxycheckApiKey: "", vpnapiApiKey: "" });
}

async function fetchJson(url) {
  const response = await fetch(url, {
    method: "GET",
    cache: "no-store"
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    const message = data?.message || data?.error || data?.status || `HTTP ${response.status}`;
    throw new Error(message);
  }

  return data;
}

async function checkIp() {
  const ip = $("ipInput").value.trim();
  $("inputError").classList.add("hidden");

  if (!isIp(ip)) {
    $("inputError").textContent = "Enter a valid IPv4 or IPv6 address.";
    $("inputError").classList.remove("hidden");
    return;
  }

  setView("loading");

  try {
    const keys = await getApiKeys();

    if (!keys.proxycheckApiKey || !keys.vpnapiApiKey) {
      showSetup();
      return;
    }

    // ProxyCheck v2 request, matching the parameters used by the original Flask app.
    const proxyUrl = new URL(`${PROXYCHECK_BASE}/${encodeURIComponent(ip)}`);
    proxyUrl.searchParams.set("key", keys.proxycheckApiKey);
    proxyUrl.searchParams.set("vpn", "1");
    proxyUrl.searchParams.set("asn", "1");
    proxyUrl.searchParams.set("node", "1");
    proxyUrl.searchParams.set("time", "1");
    proxyUrl.searchParams.set("risk", "1");
    proxyUrl.searchParams.set("port", "1");
    proxyUrl.searchParams.set("seen", "1");
    proxyUrl.searchParams.set("days", "7");

    // VPNAPI request, matching the original Flask app.
    const vpnUrl = new URL(`${VPNAPI_BASE}/${encodeURIComponent(ip)}`);
    vpnUrl.searchParams.set("key", keys.vpnapiApiKey);

    const [proxyResult, vpnResult] = await Promise.allSettled([
      fetchJson(proxyUrl.toString()),
      fetchJson(vpnUrl.toString())
    ]);

    const proxy = proxyResult.status === "fulfilled" ? proxyResult.value : null;
    const vpnapi = vpnResult.status === "fulfilled" ? vpnResult.value : null;

    if (!proxy && !vpnapi) {
      throw new Error(
        `ProxyCheck: ${proxyResult.reason?.message || "request failed"} | VPNAPI: ${vpnResult.reason?.message || "request failed"}`
      );
    }

    lastResult = { ip, proxycheck: proxy, vpnapi };
    renderResults(lastResult, proxyResult, vpnResult);
    $("lastUpdated").textContent = "Last updated: just now";
    setView("results");

    // Persist so the result survives the popup closing/reopening.
    await chrome.storage.local.set({
      [LAST_LOOKUP_KEY]: {
        ip,
        proxycheck: proxy,
        vpnapi,
        proxyOk: proxyResult.status === "fulfilled",
        proxyError: proxyResult.status === "rejected" ? (proxyResult.reason?.message || "Request failed") : null,
        vpnOk: vpnResult.status === "fulfilled",
        vpnError: vpnResult.status === "rejected" ? (vpnResult.reason?.message || "Request failed") : null,
        timestamp: Date.now()
      }
    });
  } catch (error) {
    $("inputError").textContent = error.message || "Unable to check IP.";
    $("inputError").classList.remove("hidden");
    setView("empty");
  }
}

function proxyEntry(data, ip) {
  if (!data || typeof data !== "object") return null;
  if (data[ip]) return data[ip];
  const ignored = new Set(["status", "query time", "node"]);
  const key = Object.keys(data).find(k => !ignored.has(k));
  return key ? data[key] : null;
}

function boolValue(v) {
  return v === true || v === "yes" || v === "true" || v === 1 || v === "1";
}

function first(...values) {
  return values.find(v => v !== undefined && v !== null && v !== "");
}

function renderResults(result, proxyState, vpnState) {
  const pc = proxyEntry(result.proxycheck, result.ip);
  const va = result.vpnapi;
  const sec = va?.security || {};
  const loc = va?.location || {};
  const net = va?.network || {};

  const vpn = boolValue(first(sec.vpn, pc?.vpn, String(pc?.type || "").toLowerCase() === "vpn"));
  const proxy = boolValue(first(sec.proxy, pc?.proxy));
  const tor = boolValue(first(sec.tor, pc?.tor, String(pc?.type || "").toLowerCase() === "tor"));
  const relay = boolValue(first(sec.relay, pc?.relay));

  const riskRaw = first(pc?.risk, pc?.risk_score);
  const risk = Number.isFinite(Number(riskRaw)) ? Number(riskRaw) : null;

  const country = first(loc.country, pc?.country);
  const countryCode = first(loc.country_code, loc.countryCode, pc?.isocode);
  const city = first(loc.city, pc?.city);
  const region = first(loc.region, pc?.region);
  const asn = first(net.autonomous_system_number, pc?.asn);
  const isp = first(net.autonomous_system_organization, pc?.provider, pc?.organisation, pc?.organization, net.network);
  $("countryName").textContent = country || "Unknown";
  setFlag(countryCode);
  $("location").textContent = [city, region].filter(Boolean).join(", ") || "Unknown";
  $("isp").textContent = isp || "Unknown";
  $("asn").textContent = asn || "Unknown";

  setSignal("vpn", vpn);
  setSignal("proxy", proxy);
  setSignal("tor", tor);
  setSignal("relay", relay);

  const detected = [vpn, proxy, tor, relay].filter(Boolean).length;
  $("verdict").textContent = detected ? "Anonymization detected" : "No anonymization detected";
  $("verdictNote").textContent = detected
    ? `${detected} signal${detected === 1 ? "" : "s"} detected`
    : "Both sources report no matching signal";
  $("verdictDot").className = `verdict-dot ${detected ? "bad" : "good"}`;

  const riskColor = risk === null ? "var(--good)" : risk >= 67 ? "var(--bad)" : risk >= 34 ? "var(--warn)" : "var(--good)";
  const riskWord = risk === null ? "Unknown" : risk >= 67 ? "High Risk" : risk >= 34 ? "Medium Risk" : "Low Risk";

  $("riskValue").textContent = risk === null ? "—" : `${risk}`;
  $("riskValue").style.color = riskColor;
  $("riskLabel").textContent = riskWord;
  $("riskDot").style.left = risk === null ? "0%" : `${Math.max(0, Math.min(100, risk))}%`;
  $("riskDot").style.background = riskColor;

  if (proxyState.status === "fulfilled") {
    const typeVal = first(pc?.type, "Unknown");
    const typeFlagged = typeVal !== "Unknown" && String(typeVal).trim() !== "";
    const riskBad = risk !== null && risk >= 67;
    const riskWarn = risk !== null && risk >= 34 && risk < 67;

    renderSource("proxyStatus", "proxyDetails", true, [
      detailLine("Detection", proxy ? "Yes" : "No", proxy),
      detailLine("Type", typeVal, typeFlagged),
      detailLine("Provider", first(pc?.provider, "Unknown"), false),
      detailLine("Risk", risk === null ? "Unknown" : `${risk}`, riskBad, riskWarn)
    ]);
  } else {
    renderSource("proxyStatus", "proxyDetails", false, proxyState.reason?.message || "Request failed");
  }

  if (vpnState.status === "fulfilled") {
    renderSource("vpnApiStatus", "vpnApiDetails", true, [
      detailLine("VPN", yesNo(sec.vpn), boolValue(sec.vpn)),
      detailLine("Proxy", yesNo(sec.proxy), boolValue(sec.proxy)),
      detailLine("TOR", yesNo(sec.tor), boolValue(sec.tor)),
      detailLine("Relay", yesNo(sec.relay), boolValue(sec.relay)),
      detailLine("Network", first(net.autonomous_system_organization, net.network, "Unknown"), false)
    ]);
  } else {
    renderSource("vpnApiStatus", "vpnApiDetails", false, vpnState.reason?.message || "Request failed");
  }
}

function detailLine(label, value, flaggedBad, flaggedWarn) {
  const line = document.createElement("div");
  line.className = "detail-line";

  const labelSpan = document.createElement("span");
  labelSpan.className = "detail-label";
  labelSpan.textContent = `${label}: `;

  const valueSpan = document.createElement("span");
  valueSpan.className = "detail-value";
  if (flaggedBad) valueSpan.classList.add("flagged-bad");
  else if (flaggedWarn) valueSpan.classList.add("flagged-warn");
  valueSpan.textContent = value;

  line.append(labelSpan, valueSpan);
  return line;
}

function setSignal(name, detected) {
  const cell = document.querySelector(`.signal-cell[data-signal="${name}"]`);
  const value = $(`${name}Value`);
  cell.classList.remove("detected", "clear");
  cell.classList.add(detected ? "detected" : "clear");
  value.textContent = detected ? "DETECTED" : "CLEAR";
}

function renderSource(statusId, detailsId, ok, details) {
  const status = $(statusId);
  status.textContent = ok ? "OK" : "ERROR";
  status.classList.toggle("error", !ok);

  const container = $(detailsId);
  container.textContent = "";
  if (Array.isArray(details)) {
    details.forEach(line => container.appendChild(line));
  } else {
    container.textContent = details;
  }
}

function yesNo(value) {
  return boolValue(value) ? "Detected" : "Clear";
}

function setFlag(code) {
  const img = $("countryFlag");
  const cc = (code || "").toString().trim().toLowerCase();

  if (!/^[a-z]{2}$/.test(cc)) {
    img.hidden = true;
    img.removeAttribute("src");
    return;
  }

  img.onerror = () => { img.hidden = true; };
  img.onload = () => { img.hidden = false; };
  img.src = `https://flagcdn.com/32x24/${cc}.png`;
  img.alt = cc.toUpperCase();
}

function setView(view) {
  $("emptyState").classList.toggle("hidden", view !== "empty");
  $("loadingState").classList.toggle("hidden", view !== "loading");
  $("results").classList.toggle("hidden", view !== "results");
}

async function copyResult() {
  if (!lastResult) return;
  await navigator.clipboard.writeText(JSON.stringify(lastResult, null, 2));
  const btn = $("moreBtn");
  const original = btn.innerHTML;
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>';
  setTimeout(() => btn.innerHTML = original, 1200);
}
