const MAINTENANCE_MODE = true;

(function () {
    const maintenancePage = "maintenance.html";

    const path = window.location.pathname;
    const fileName = path.substring(path.lastIndexOf("/") + 1);

    if (!MAINTENANCE_MODE) {
        return;
    }

    if (
        fileName === maintenancePage ||
        path.endsWith("/" + maintenancePage)
    ) {
        return;
    }

    window.location.replace(maintenancePage);
})();
