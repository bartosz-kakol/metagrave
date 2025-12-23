const {ipcRenderer} = require("electron");

/** @type {typeof import("../../app/misc.json")} */
let misc = {};

async function onReady() {
    const sidebarItems = document.querySelectorAll(".sidebar-item[data-tab]");
    const tabPanes = document.querySelectorAll(".tab-pane");
    const resetBtn = document.getElementById("reset-btn");
    const editBtn = document.getElementById("edit-btn");
    const closeBtn = document.getElementById("close-btn");

    sidebarItems.forEach(item => {
        item.addEventListener("click", () => {
            const tabId = item.getAttribute("data-tab");

            // Update sidebar
            sidebarItems.forEach(i => i.classList.remove("active"));
            item.classList.add("active");
            item.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });

            // Update content
            tabPanes.forEach(pane => {
                pane.classList.remove("active");
                if (pane.id === `${tabId}-tab`) {
                    pane.classList.add("active");
                }
            });
        });
    });

    resetBtn.addEventListener("click", () => {
        if (confirm("Are you sure you want to reset all settings? The app will relaunch.")) {
            ipcRenderer.send("settings:reset");
        }
    });

    editBtn.addEventListener("click", () => {
        ipcRenderer.send("settings:edit-file");
    });

    closeBtn.addEventListener("click", () => {
        window.close();
    });

    document.addEventListener("keydown", (e) => {
        if (e.key === "Escape") {
            window.close();
        }
    });

    // System window frame switch handling
    const systemFrameSwitch = document.getElementById("system-frame-switch");
    ipcRenderer.invoke("settings:get", "useSystemWindowFrame").then(value => {
        systemFrameSwitch.checked = !!value;
    });

    systemFrameSwitch.addEventListener("change", (e) => {
        ipcRenderer.send("settings:set", "useSystemWindowFrame", e.target.checked);
    });

    // About tab
    document.getElementById("app-version").textContent = await ipcRenderer.invoke("app:get-version");

    const developedByLink = document.getElementById("developed-by-link");
    developedByLink.href = misc.repository.maintainer.url;
    developedByLink.textContent = misc.repository.maintainer.name;

    const githubLink = document.getElementById("github-link");
    githubLink.href = misc.repository.url;
}

document.addEventListener("DOMContentLoaded", async () => {
    misc = await ipcRenderer.invoke("import:misc");

    await onReady();
});
