const {ipcRenderer} = require("electron");

document.addEventListener("DOMContentLoaded", () => {
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
});
