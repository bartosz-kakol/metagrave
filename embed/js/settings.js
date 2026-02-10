const { ipcRenderer } = require("electron");

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
    ipcRenderer.invoke("settings:get", "appearance.useSystemWindowFrame").then(value => {
        systemFrameSwitch.checked = !!value;
    });

    systemFrameSwitch.addEventListener("change", (e) => {
        ipcRenderer.send("settings:set", "appearance.useSystemWindowFrame", e.target.checked);
    });

    // Native emojis switch handling
    const nativeEmojisSwitch = document.getElementById("native-emojis-switch");
    ipcRenderer.invoke("settings:get", "appearance.useNativeEmojis").then(value => {
        nativeEmojisSwitch.checked = !!value;
    });

    nativeEmojisSwitch.addEventListener("change", (e) => {
        ipcRenderer.send("settings:set", "appearance.useNativeEmojis", e.target.checked);
    });

    // About tab
    document.getElementById("app-version").textContent = await ipcRenderer.invoke("app:get-version");

    const developedByLink = document.getElementById("developed-by-link");
    developedByLink.href = misc.repository.maintainer.url;
    developedByLink.textContent = misc.repository.maintainer.name;

    const projectLink = document.getElementById("project-link");
    projectLink.href = misc.repository.url;
    projectLink.textContent = misc.repository.linkText;

    // Updates Widget Simulation
    const widget = document.getElementById("updates-widget");
    const checkUpdatesBtn = document.getElementById("check-updates-btn");
    const changelogBtn = document.getElementById("changelog-btn");
    const updateStatus = document.getElementById("update-status");
    const updateProgress = document.getElementById("update-progress");
    const updateProgressFill = document.getElementById("update-progress-fill");

    const icons = {
        uptodate: document.getElementById("icon-uptodate"),
        checking: document.getElementById("icon-checking"),
        downloading: document.getElementById("icon-downloading"),
        ready: document.getElementById("icon-ready")
    };

    function setWidgetState(state) {
        // Reset classes
        widget.classList.remove("state-uptodate", "state-checking", "state-downloading", "state-ready");
        widget.classList.add(`state-${state}`);

        // Hide all icons
        Object.values(icons).forEach(icon => icon.style.display = "none");

        // Show active icon
        if (icons[state]) {
            icons[state].style.display = "block";
        }
    }

    // Initial state
    setWidgetState("uptodate");

    changelogBtn.addEventListener("click", () => {
        alert("Changelog for version 2.0.0:\n- Added updates widget\n- Improved performance\n- Fixed bugs");
    });

    const startDownload = () => {
        // 3. Downloading state
        setWidgetState("downloading");
        updateStatus.textContent = "Downloading update...";
        updateProgress.style.display = "block";
        checkUpdatesBtn.style.display = "none";
        changelogBtn.style.display = "none";

        let progress = 0;
        const interval = setInterval(() => {
            progress += 5;
            updateProgressFill.style.width = `${progress}%`;

            if (progress >= 100) {
                clearInterval(interval);
                // 4. Ready state
                setWidgetState("ready");
                updateStatus.textContent = "Update ready to install";
                updateProgress.style.display = "none";
                checkUpdatesBtn.style.display = "inline-flex";
                checkUpdatesBtn.textContent = "Restart to install";
                checkUpdatesBtn.removeEventListener("click", startDownload); // Clean up
                checkUpdatesBtn.addEventListener("click", restartApp);
                checkUpdatesBtn.disabled = false;
            }
        }, 100);
    };

    const restartApp = () => {
        alert("App would restart now.");
    };

    checkUpdatesBtn.addEventListener("click", function onCheck() {
        if (checkUpdatesBtn.textContent === "Restart to install") return; // Should be handled by restartApp

        // 1. Checking state
        setWidgetState("checking");
        checkUpdatesBtn.disabled = true;
        checkUpdatesBtn.textContent = "Checking...";
        updateStatus.textContent = "Checking for updates...";
        changelogBtn.style.display = "none";

        setTimeout(() => {
            // 2. Found update
            setWidgetState("downloading"); // Use downloading icon (cloud) for "found" state too
            updateStatus.textContent = "Found version 2.0.0";

            checkUpdatesBtn.textContent = "Download update";
            checkUpdatesBtn.disabled = false;
            checkUpdatesBtn.style.display = "inline-flex";

            changelogBtn.style.display = "inline-flex";

            // Remove check listener, add download listener
            checkUpdatesBtn.removeEventListener("click", onCheck);
            checkUpdatesBtn.addEventListener("click", startDownload);

        }, 2000);
    });
}

document.addEventListener("DOMContentLoaded", async () => {
    misc = await ipcRenderer.invoke("import:misc");

    await onReady();
});
