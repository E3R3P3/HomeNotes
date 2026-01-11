
// Cargar tareas al iniciar
document.addEventListener('DOMContentLoaded', cargarTareas);

async function cargarTareas() {
    try {
        const response = await fetch('/api/tareas');
        const tareas = await response.json();
        renderizarTareas(tareas);
        actualizarEstadisticas(tareas);
    } catch (error) {
        console.error('Error cargando tareas:', error);
    }
}

// Subtareas: cargar y renderizar dentro del modal
async function cargarSubtareas(tareaId) {
    try {
        const res = await fetch(`/api/tareas/${tareaId}/subtareas`);
        if (!res.ok) return;
        const list = await res.json();
        renderizarSubtareas(list);
    } catch (err) { console.error(err); }
}

function renderizarSubtareas(subs) {
    const cont = document.getElementById('subtareasList');
    cont.innerHTML = subs.map(s => `
    <div class="sub-item" style="display:flex;align-items:center;gap:8px;">
        <input type="checkbox" ${s.completada ? 'checked' : ''} onchange="toggleSubtarea(${s.id}, this.checked)" />
        <div style="flex:1;word-break:break-word;${s.completada ? 'text-decoration:line-through;color:#999;' : ''}">${escapeHtml(s.titulo)}</div>
        <button onclick="(event.stopPropagation(), editSubtareaPrompt(${s.id}, ${s.tarea_id}))" style="background:#ffffff00;border:none;border-radius:6px;padding:6px;"><img src="https://img.icons8.com/?size=100&id=20493&format=png&color=000000" height="34px"></button>
        <button onclick="(event.stopPropagation(), deleteSubtarea(${s.id}))" style="background:#ffffff00;color:white;border:none;border-radius:6px;padding:6px;"><img src="https://img.icons8.com/?size=100&amp;id=102550&amp;format=png&amp;color=000000" height="34px"></button>
    </div>
    `).join('');
}

async function addSubtarea() {
    const titulo = document.getElementById('subtareaInput').value.trim();
    if (!titulo) { showToast('Ingrese texto para la subtarea'); return; }
    if (!currentEditId) { showToast('Guarde la tarea primero'); return; }
    try {
        const res = await fetch(`/api/tareas/${currentEditId}/subtareas`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo })
        });
        if (res.ok) {
            document.getElementById('subtareaInput').value = '';
            cargarSubtareas(currentEditId);
            showToast('Subtarea creada');
        } else showToast('Error creando subtarea');
    } catch (err) { console.error(err); showToast('Error creando subtarea'); }
}

async function toggleSubtarea(id, completada) {
    try {
        const res = await fetch(`/api/subtareas/${id}/completar`, {
            method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ completada })
        });
        if (res.ok) { cargarSubtareas(currentEditId); showToast(completada ? 'Subtarea completada' : 'Subtarea pendiente'); }
    } catch (err) { console.error(err); showToast('Error'); }
}

// Delete/Edit subtask modals
let pendingDeleteSubId = null;
let pendingEditSubId = null;
let pendingEditSubTareaId = null;

function openDeleteSubModal(id) {
    pendingDeleteSubId = id;
    document.getElementById('deleteSubModal').style.display = 'flex';
}

function closeDeleteSubModal() {
    pendingDeleteSubId = null;
    document.getElementById('deleteSubModal').style.display = 'none';
}

async function confirmDeleteSub() {
    if (!pendingDeleteSubId) return;
    try {
        const res = await fetch(`/api/subtareas/${pendingDeleteSubId}`, { method: 'DELETE' });
        if (res.ok) { cargarSubtareas(currentEditId); showToast('Subtarea eliminada'); closeDeleteSubModal(); }
    } catch (err) { console.error(err); showToast('Error'); }
}

function openEditSubModal(id, tareaId) {
    pendingEditSubId = id;
    pendingEditSubTareaId = tareaId;
    fetch(`/api/tareas/${tareaId}/subtareas`).then(r => r.json()).then(list => {
        const s = list.find(x => x.id === id);
        if (s) document.getElementById('editSubInput').value = s.titulo;
    }).catch(() => { });
    document.getElementById('editSubModal').style.display = 'flex';
    document.getElementById('editSubInput').focus();
}

function closeEditSubModal() {
    pendingEditSubId = null;
    pendingEditSubTareaId = null;
    document.getElementById('editSubInput').value = '';
    document.getElementById('editSubModal').style.display = 'none';
}

async function confirmEditSub() {
    if (!pendingEditSubId) return;
    const titulo = document.getElementById('editSubInput').value.trim();
    if (!titulo) { showToast('El título es requerido'); return; }
    try {
        const res = await fetch(`/api/subtareas/${pendingEditSubId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ titulo }) });
        if (res.ok) { cargarSubtareas(pendingEditSubTareaId); showToast('Subtarea actualizada'); closeEditSubModal(); }
    } catch (err) { console.error(err); showToast('Error'); }
}

async function deleteSubtarea(id) {
    openDeleteSubModal(id);
}

function editSubtareaPrompt(id, tareaId) {
    openEditSubModal(id, tareaId);
}

function renderizarTareas(tareas) {
    const lista = document.getElementById('tareasList');

    if (tareas.length === 0) {
        lista.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">✨</div>
                        <p>No hay tareas.</p>
                    </div>
                `;
        return;
    }

    lista.innerHTML = tareas.map(tarea => `
    <div class="task-item ${tarea.completada ? 'completed' : ''}" onclick="openModal('edit', ${tarea.id})">
        <div class="checkbox-wrapper" onclick="event.stopPropagation()">
            <input type="checkbox" ${tarea.completada ? 'checked' : ''}
                onchange="alternarTarea(${tarea.id}, this.checked)" />
        </div>
        <div class="task-content">
            <div class="task-title">${escapeHtml(tarea.titulo)}</div>
            ${tarea.descripcion ? `<div class="task-description">${escapeHtml(tarea.descripcion)}</div>` : ''}
        </div>
        <div class="task-actions">
            <button class="btn-delete" onclick="(event.stopPropagation(), openDeleteModal(${tarea.id}))"><img src="https://img.icons8.com/?size=100&amp;id=102550&amp;format=png&amp;color=000000" height="34px"></button>
        </div>
    </div>
    `).join('');
}

function actualizarEstadisticas(tareas) {
    const total = tareas.length;
    const completadas = tareas.filter(t => t.completada).length;
    const pendientes = total - completadas;

    document.getElementById('totalTareas').textContent = total;
    document.getElementById('tareasCompletadas').textContent = completadas;
    document.getElementById('tareasPendientes').textContent = pendientes;
}

async function agregarTarea() {
    const titulo = document.getElementById('tituloInput').value.trim();
    const descripcion = document.getElementById('descripcionInput').value.trim();

    if (!titulo) {
        showToast('Por favor ingresa un título para la tarea');
        return;
    }

    try {
        const response = await fetch('/api/tareas', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ titulo, descripcion })
        });

        if (response.ok) {
            document.getElementById('tituloInput').value = '';
            document.getElementById('descripcionInput').value = '';
            cargarTareas();
            showToast('Tarea creada');
        } else {
            showToast('Error al agregar la tarea');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al agregar la tarea');
    }
}

async function alternarTarea(id, completada) {
    try {
        const response = await fetch(`/api/tareas/${id}/completar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ completada })
        });

        if (response.ok) {
            cargarTareas();
            showToast(completada ? 'Tarea marcada como completada' : 'Tarea marcada como pendiente');
        } else {
            showToast('Error al actualizar la tarea');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al actualizar la tarea');
    }
}

async function eliminarTarea(id) {
    try {
        const response = await fetch(`/api/tareas/${id}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            cargarTareas();
            showToast('Tarea eliminada');
        } else {
            showToast('Error al eliminar la tarea');
        }
    } catch (error) {
        console.error('Error:', error);
        showToast('Error al eliminar la tarea');
    }
}

// Delete modal logic
let pendingDeleteId = null;
function openDeleteModal(id) {
    pendingDeleteId = id;
    // opcional: mostrar título en el modal
    fetch('/api/tareas').then(r => r.json()).then(list => {
        const t = list.find(x => x.id === id);
        if (t) document.getElementById('deleteMsg').textContent = `Eliminar: "${t.titulo}"?`;
    }).catch(() => { });
    document.getElementById('deleteModal').style.display = 'flex';
}

function closeDeleteModal() {
    pendingDeleteId = null;
    document.getElementById('deleteMsg').textContent = '¿Estás seguro que deseas eliminar esta tarea?';
    document.getElementById('deleteModal').style.display = 'none';
}

async function confirmDelete() {
    if (!pendingDeleteId) return;
    await eliminarTarea(pendingDeleteId);
    closeDeleteModal();
}

// Modal & Edit logic
let currentEditId = null;

function openModal(mode, id) {
    const modal = document.getElementById('modal');
    const title = document.getElementById('modalTitle');
    const tituloInput = document.getElementById('modalTitulo');
    const descInput = document.getElementById('modalDescripcion');

    if (mode === 'new') {
        currentEditId = null;
        title.textContent = 'Nueva tarea';
        tituloInput.value = '';
        descInput.value = '';
        renderizarSubtareas([]);
        document.getElementById('subtareaInput').value = '';
    } else if (mode === 'edit') {
        currentEditId = id;
        title.textContent = 'Editar tarea';
        // cargar datos de la tarea
        fetch('/api/tareas').then(r => r.json()).then(list => {
            const t = list.find(x => x.id === id);
            if (t) {
                tituloInput.value = t.titulo || '';
                descInput.value = t.descripcion || '';
            }
        }).catch(err => console.error(err));
        // cargar subtareas de esta tarea
        cargarSubtareas(id);
    }

    modal.style.display = 'flex';
    tituloInput.focus();
}

function closeModal() {
    const modal = document.getElementById('modal');
    modal.style.display = 'none';
}

async function saveModal() {
    const titulo = document.getElementById('modalTitulo').value.trim();
    const descripcion = document.getElementById('modalDescripcion').value.trim();

    if (!titulo) { showToast('El título es requerido'); return; }

    try {
        if (currentEditId) {
            const res = await fetch(`/api/tareas/${currentEditId}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, descripcion })
            });
            if (res.ok) {
                closeModal();
                cargarTareas();
                showToast('Tarea actualizada');
            } else showToast('Error al actualizar');
        } else {
            const res = await fetch('/api/tareas', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ titulo, descripcion })
            });
            if (res.ok) {
                closeModal();
                cargarTareas();
                showToast('Tarea creada');
            } else showToast('Error al crear tarea');
        }
    } catch (err) {
        console.error(err);
        showToast('Error en la solicitud');
    }
}

// Simple toast
let toastTimer = null;
function showToast(msg) {
    const t = document.getElementById('toast');
    t.textContent = msg;
    t.style.display = 'block';
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.style.display = 'none'; }, 2200);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}