document.addEventListener("DOMContentLoaded", async () => {
  const settings = await chrome.storage.local.get({
    proxycheckApiKey: "",
    vpnapiApiKey: ""
  });

  document.getElementById("proxyKey").value = settings.proxycheckApiKey;
  document.getElementById("vpnKey").value = settings.vpnapiApiKey;

  document.getElementById("saveKeys").addEventListener("click", async () => {
    const proxycheckApiKey = document.getElementById("proxyKey").value.trim();
    const vpnapiApiKey = document.getElementById("vpnKey").value.trim();
    const status = document.getElementById("status");

    if (!proxycheckApiKey || !vpnapiApiKey) {
      status.textContent = "Both API keys are required.";
      status.style.color = "#d83a3a";
      return;
    }

    await chrome.storage.local.set({ proxycheckApiKey, vpnapiApiKey });
    status.textContent = "API keys saved locally";
    status.style.color = "#15945b";
    setTimeout(() => status.textContent = "", 1800);
  });

  document.getElementById("clearKeys").addEventListener("click", async () => {
    await chrome.storage.local.remove(["proxycheckApiKey", "vpnapiApiKey"]);
    document.getElementById("proxyKey").value = "";
    document.getElementById("vpnKey").value = "";

    const status = document.getElementById("status");
    status.textContent = "API keys cleared";
    status.style.color = "#15945b";
    setTimeout(() => status.textContent = "", 1800);
  });
});
