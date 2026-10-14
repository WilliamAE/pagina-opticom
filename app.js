const STORAGE_KEY = "opticom-maintenance-records";
const form = document.querySelector("#maintenance-form");
const recordsBody = document.querySelector("#records-body");
const emptyState = document.querySelector("#empty-state");
const announcement = document.querySelector("#announcement");
const searchInput = document.querySelector("#search-input");
const statusFilter = document.querySelector("#status-filter");

let records = loadRecords();
let editingId = null;

function loadRecords() {
    try {
        const savedRecords = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
        return Array.isArray(savedRecords)
            ? savedRecords.map((record) => ({ type: "Mantenimiento", ...record }))
            : [];
    } catch {
        return [];
    }
}

function saveRecords() {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
        return true;
    } catch {
        announce("No se pudo guardar. Revisa el espacio disponible en el navegador.");
        return false;
    }
}

function announce(message) {
    announcement.textContent = message;
}

function makeCell(text, className = "") {
    const cell = document.createElement("td");
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
}

function renderRecords() {
    const query = searchInput.value.trim().toLocaleLowerCase("es");
    const selectedStatus = statusFilter.value;
    const filteredRecords = records.filter((record) => {
        const matchesQuery = [record.name, record.address, record.type, record.phone]
            .some((value) => value.toLocaleLowerCase("es").includes(query));
        return matchesQuery && (selectedStatus === "Todos" || record.status === selectedStatus);
    });

    recordsBody.replaceChildren();
    for (const record of filteredRecords) {
        const row = document.createElement("tr");
        const nameCell = makeCell(record.name, "client-name");
        nameCell.setAttribute("data-label", "Cliente");
        const addressCell = makeCell(record.address);
        addressCell.setAttribute("data-label", "Dirección");
        const typeCell = makeCell(record.type || "Mantenimiento");
        typeCell.setAttribute("data-label", "Tipo de mantenimiento");
        const phoneCell = makeCell(record.phone, "phone-cell");
        phoneCell.setAttribute("data-label", "Celular");

        const statusCell = document.createElement("td");
        statusCell.setAttribute("data-label", "Estado");
        const badge = document.createElement("span");
        badge.className = `badge ${record.status === "Completo" ? "badge-complete" : "badge-pending"}`;
        badge.textContent = record.status;
        statusCell.append(badge);

        const actionsCell = document.createElement("td");
        actionsCell.className = "actions-cell";
        actionsCell.setAttribute("data-label", "Acciones");
        for (const [action, label] of [["edit", "Editar"], ["delete", "Eliminar"]]) {
            const button = document.createElement("button");
            button.className = `text-button ${action === "delete" ? "delete-button" : ""}`;
            button.type = "button";
            button.dataset.action = action;
            button.dataset.id = record.id;
            button.textContent = label;
            actionsCell.append(button);
        }

        row.append(nameCell, addressCell, typeCell, phoneCell, statusCell, actionsCell);
        recordsBody.append(row);
    }

    document.querySelector("#total-count").textContent = records.length;
    document.querySelector("#pending-count").textContent = records.filter((record) => record.status === "Pendiente").length;
    document.querySelector("#complete-count").textContent = records.filter((record) => record.status === "Completo").length;
    document.querySelector("#visible-count").textContent = `${filteredRecords.length} ${filteredRecords.length === 1 ? "registro" : "registros"}`;
    emptyState.hidden = filteredRecords.length > 0;
    if (records.length === 0) {
        document.querySelector("#empty-title").textContent = "Aún no hay mantenimientos";
        emptyState.querySelector("p").textContent = "Agrega el primer registro para empezar.";
    } else {
        document.querySelector("#empty-title").textContent = "No se encontraron resultados";
        emptyState.querySelector("p").textContent = "Prueba con otra búsqueda o cambia el filtro.";
    }
}

function resetForm() {
    form.reset();
    editingId = null;
    document.querySelector("#form-title").textContent = "Nuevo registro";
    document.querySelector("#submit-button").textContent = "Guardar registro";
    document.querySelector("#cancel-button").hidden = true;
}

form.addEventListener("submit", (event) => {
    event.preventDefault();
    const formData = new FormData(form);
    const values = {
        name: formData.get("name").trim(),
        address: formData.get("address").trim(),
        type: formData.get("type"),
        phone: formData.get("phone").trim(),
        status: formData.get("status")
    };

    if (editingId) {
        records = records.map((record) => record.id === editingId ? { ...record, ...values } : record);
        announce("Registro actualizado.");
    } else {
        records.unshift({ id: crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`, ...values });
        announce("Mantenimiento guardado.");
    }

    saveRecords();
    resetForm();
    renderRecords();
});

recordsBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    const record = records.find((item) => item.id === button.dataset.id);
    if (!record) return;

    if (button.dataset.action === "edit") {
        editingId = record.id;
        form.elements.name.value = record.name;
        form.elements.address.value = record.address;
        form.elements.type.value = record.type || "Mantenimiento";
        form.elements.phone.value = record.phone;
        form.elements.status.value = record.status;
        document.querySelector("#form-title").textContent = "Editar registro";
        document.querySelector("#submit-button").textContent = "Guardar cambios";
        document.querySelector("#cancel-button").hidden = false;
        form.elements.name.focus();
        return;
    }

    if (window.confirm(`¿Eliminar el mantenimiento de ${record.name}?`)) {
        records = records.filter((item) => item.id !== record.id);
        saveRecords();
        renderRecords();
        announce("Registro eliminado.");
    }
});

document.querySelector("#cancel-button").addEventListener("click", resetForm);
searchInput.addEventListener("input", renderRecords);
statusFilter.addEventListener("change", renderRecords);

function exportCsv() {
    const headers = ["Nombre", "Dirección", "Tipo de mantenimiento", "Celular", "Estado"];
    const rows = records.map((record) => [record.name, record.address, record.type || "Mantenimiento", record.phone, record.status]);
    const csv = [headers, ...rows].map((row) => row.map((value) => {
        const safeValue = /^[=+\-@]/.test(value) ? `'${value}` : value;
        return `"${safeValue.replaceAll('"', '""')}"`;
    }).join(",")).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `mantenimientos-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    announce("Archivo CSV descargado. Puedes abrirlo con Excel.");
}

document.querySelector("#export-button").addEventListener("click", () => {
    if (records.length === 0) {
        announce("Agrega al menos un mantenimiento antes de exportar.");
        return;
    }

    if (!window.XLSX) {
        exportCsv();
        return;
    }

    const sheet = XLSX.utils.aoa_to_sheet([
        ["Nombre", "Dirección", "Tipo de mantenimiento", "Celular", "Estado"],
        ...records.map(({ name, address, type, phone, status }) => [name, address, type || "Mantenimiento", phone, status])
    ]);
    sheet["!cols"] = [{ wch: 28 }, { wch: 42 }, { wch: 25 }, { wch: 20 }, { wch: 16 }];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, sheet, "Mantenimientos");
    XLSX.writeFile(workbook, `mantenimientos-${new Date().toISOString().slice(0, 10)}.xlsx`);
    announce("Archivo Excel descargado.");
});

document.querySelector("#today-label").textContent = new Intl.DateTimeFormat("es", {
    day: "numeric",
    month: "short",
    year: "numeric"
}).format(new Date()).toUpperCase();

renderRecords();