// ===== UVENT ADMIN PANEL JS =====

const API_BASE = '/api/admin';
let currentTab = 'all';
let allEvents = [];
let currentEvent = null;

// ===== INITIALIZATION =====
document.addEventListener('DOMContentLoaded', () => {
    // Check if already logged in
    const token = localStorage.getItem('adminToken');
    if (token) {
        showDashboard();
        loadEvents('all');
    }

    // Setup event listeners
    setupLoginForm();
    setupTabs();
    setupFilters();
    setupModal();
});

// ===== LOGIN =====
function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            try {
                const response = await fetch(`${API_BASE}/login`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, password })
                });

                const data = await response.json();

                if (data.status === 'success') {
                    localStorage.setItem('adminToken', data.token);
                    showDashboard();
                    loadEvents('all');
                    showToast('Login berhasil!', 'success');
                } else {
                    showLoginError(data.message);
                }
            } catch (error) {
                showLoginError('Terjadi kesalahan koneksi');
            }
        });
    }
}

function showLoginError(message) {
    const errorEl = document.getElementById('loginError');
    if (errorEl) {
        errorEl.textContent = message;
        errorEl.style.display = 'block';
    }
}

function showDashboard() {
    document.getElementById('loginContainer').style.display = 'none';
    document.getElementById('dashboardContainer').classList.add('active');
}

function logout() {
    localStorage.removeItem('adminToken');
    location.reload();
}

// ===== TABS =====
function setupTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const tabName = tab.dataset.tab;
            setActiveTab(tabName);
            loadEvents(tabName);
        });
    });
}

function setActiveTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === tabName);
    });
}

// ===== LOAD EVENTS =====
async function loadEvents(status) {
    const tableBody = document.getElementById('eventsTableBody');
    tableBody.innerHTML = '<tr><td colspan="6"><div class="loading"><div class="spinner"></div></div></td></tr>';

    try {
        let endpoint;
        switch (status) {
            case 'pending': endpoint = '/events/pending'; break;
            case 'approved': endpoint = '/events/approved'; break;
            case 'rejected': endpoint = '/events/rejected'; break;
            default: endpoint = '/events/all';
        }

        const response = await fetch(`${API_BASE}${endpoint}`);
        const data = await response.json();

        if (data.status === 'success') {
            allEvents = data.data;
            updateTabBadges();
            renderEvents(data.data);
        } else {
            showEmptyState('Gagal memuat data');
        }
    } catch (error) {
        console.error('Error loading events:', error);
        showEmptyState('Terjadi kesalahan koneksi');
    }
}

function renderEvents(events) {
    const tableBody = document.getElementById('eventsTableBody');
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const typeFilter = document.getElementById('typeFilter').value;

    // Filter events
    let filteredEvents = events.filter(event => {
        const matchesSearch = event.title.toLowerCase().includes(searchTerm) ||
            (event.creator_name && event.creator_name.toLowerCase().includes(searchTerm));
        const matchesType = !typeFilter || event.type === typeFilter;
        return matchesSearch && matchesType;
    });

    if (filteredEvents.length === 0) {
        showEmptyState('Tidak ada event yang ditemukan');
        return;
    }

    tableBody.innerHTML = filteredEvents.map(event => `
        <tr>
            <td>
                <div class="event-title">${escapeHtml(event.title)}</div>
            </td>
            <td><span class="event-type">${escapeHtml(event.type || '-')}</span></td>
            <td>${escapeHtml(event.creator_name || 'Unknown')}</td>
            <td>${event.created_at || '-'}</td>
            <td><span class="status-badge ${getStatusClass(event.status)}">${getStatusText(event.status)}</span></td>
            <td>
                <div class="action-buttons">
                    <button class="btn btn-detail" onclick="showDetail(${event.id})">
                        <span>📋</span> Detail
                    </button>
                    ${event.status === 'menunggu' ? `
                        <button class="btn btn-approve" onclick="approveEvent(${event.id})">
                            <span>✓</span> Setujui
                        </button>
                        <button class="btn btn-reject" onclick="rejectEvent(${event.id})">
                            <span>✕</span> Tolak
                        </button>
                    ` : ''}
                </div>
            </td>
        </tr>
    `).join('');
}

function showEmptyState(message) {
    const tableBody = document.getElementById('eventsTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="6">
                <div class="empty-state">
                    <div class="empty-state-icon">📭</div>
                    <h3>${message}</h3>
                    <p>Coba refresh halaman atau ubah filter pencarian</p>
                </div>
            </td>
        </tr>
    `;
}

function getStatusClass(status) {
    switch (status) {
        case 'menunggu': return 'pending';
        case 'disetujui': return 'approved';
        case 'ditolak': return 'rejected';
        default: return 'pending';
    }
}

function getStatusText(status) {
    switch (status) {
        case 'menunggu': return 'Diproses';
        case 'disetujui': return 'Disetujui';
        case 'ditolak': return 'Ditolak';
        default: return 'Diproses';
    }
}

async function updateTabBadges() {
    try {
        const [allRes, pendingRes, approvedRes, rejectedRes] = await Promise.all([
            fetch(`${API_BASE}/events/all`).then(r => r.json()),
            fetch(`${API_BASE}/events/pending`).then(r => r.json()),
            fetch(`${API_BASE}/events/approved`).then(r => r.json()),
            fetch(`${API_BASE}/events/rejected`).then(r => r.json())
        ]);

        document.querySelector('[data-tab="all"] .badge').textContent = allRes.data?.length || 0;
        document.querySelector('[data-tab="pending"] .badge').textContent = pendingRes.data?.length || 0;
        document.querySelector('[data-tab="approved"] .badge').textContent = approvedRes.data?.length || 0;
        document.querySelector('[data-tab="rejected"] .badge').textContent = rejectedRes.data?.length || 0;
    } catch (error) {
        console.error('Error updating badges:', error);
    }
}

// ===== FILTERS =====
function setupFilters() {
    document.getElementById('searchInput').addEventListener('input', () => {
        renderEvents(allEvents);
    });

    document.getElementById('typeFilter').addEventListener('change', () => {
        renderEvents(allEvents);
    });
}

// ===== MODAL =====
function setupModal() {
    document.getElementById('modalOverlay').addEventListener('click', (e) => {
        if (e.target.id === 'modalOverlay') {
            closeModal();
        }
    });
}

async function showDetail(eventId) {
    const modal = document.getElementById('modalOverlay');
    const modalBody = document.getElementById('modalBody');

    modal.classList.add('active');
    modalBody.innerHTML = '<div class="loading"><div class="spinner"></div></div>';

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}`);
        const data = await response.json();

        if (data.status === 'success') {
            currentEvent = data.data;
            renderEventDetail(data.data);
        }
    } catch (error) {
        modalBody.innerHTML = '<p>Gagal memuat detail event</p>';
    }
}

function renderEventDetail(event) {
    const modalBody = document.getElementById('modalBody');
    const modalFooter = document.getElementById('modalFooter');

    // Poster URL with fallback - check if it's a valid URL
    let posterUrl = 'https://via.placeholder.com/300x400/3A5A6F/ffffff?text=No+Poster';
    if (event.thumbnail_uri) {
        // Check if it's already a full URL or needs base URL
        if (event.thumbnail_uri.startsWith('http')) {
            posterUrl = event.thumbnail_uri;
        } else if (event.thumbnail_uri.startsWith('/')) {
            posterUrl = window.location.origin + event.thumbnail_uri;
        } else {
            posterUrl = event.thumbnail_uri;
        }
    }

    modalBody.innerHTML = `
        <div class="modal-content-grid">
            <div class="poster-container">
                <img src="${posterUrl}" alt="${escapeHtml(event.title)}" class="event-poster" 
                     onerror="this.src='https://via.placeholder.com/300x400/3A5A6F/ffffff?text=No+Poster'">
            </div>
            <div class="event-details">
                <div class="detail-row">
                    <span class="detail-label">Judul Event</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">${escapeHtml(event.title)}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Jenis Event</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">${escapeHtml(event.type || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Tanggal</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">${event.date || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Waktu</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">${event.time_start || '-'} - ${event.time_end || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Lokasi/Platform</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">${escapeHtml(event.location_detail || '-')}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Kuota</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">${event.quota || '-'}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Status</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">
                        <span class="status-badge ${getStatusClass(event.status)}">${getStatusText(event.status)}</span>
                    </span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">Pengaju</span>
                    <span class="detail-separator">:</span>
                    <span class="detail-value">${escapeHtml(event.creator_name || 'Unknown')}</span>
                </div>
            </div>
        </div>
    `;

    // Clear footer first
    modalFooter.innerHTML = '';

    // Debug log to check status
    console.log('Event status:', event.status, 'Event ID:', event.id);

    // Always show action buttons for pending events
    if (event.status === 'menunggu') {
        modalFooter.innerHTML = `
            <button class="btn btn-approve btn-large" onclick="approveEventFromModal(${event.id})">
                <span>✓</span> Setujui Event
            </button>
            <button class="btn btn-reject btn-large" onclick="rejectEventFromModal(${event.id})">
                <span>✕</span> Tolak Event
            </button>
        `;
        modalFooter.style.display = 'flex';
    } else if (event.status === 'disetujui') {
        // Show status message for approved events
        modalFooter.innerHTML = `
            <div class="status-message approved">
                <span>✓</span> Event ini sudah disetujui
            </div>
        `;
        modalFooter.style.display = 'flex';
    } else if (event.status === 'ditolak') {
        // Show status message for rejected events
        modalFooter.innerHTML = `
            <div class="status-message rejected">
                <span>✕</span> Event ini ditolak${event.rejection_reason ? ': ' + escapeHtml(event.rejection_reason) : ''}
            </div>
        `;
        modalFooter.style.display = 'flex';
    } else {
        // For any other status (like null or undefined), show action buttons as fallback
        modalFooter.innerHTML = `
            <button class="btn btn-approve btn-large" onclick="approveEventFromModal(${event.id})">
                <span>✓</span> Setujui Event
            </button>
            <button class="btn btn-reject btn-large" onclick="rejectEventFromModal(${event.id})">
                <span>✕</span> Tolak Event
            </button>
        `;
        modalFooter.style.display = 'flex';
    }
}

// Approve from modal - closes modal after action
async function approveEventFromModal(eventId) {
    if (!confirm('Apakah Anda yakin ingin menyetujui event ini?')) return;

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.status === 'success') {
            closeModal();
            showToast('Event berhasil disetujui!', 'success');
            loadEvents(currentTab);
        } else {
            showToast(data.message || 'Gagal menyetujui event', 'error');
        }
    } catch (error) {
        showToast('Terjadi kesalahan koneksi', 'error');
    }
}

// Reject from modal - closes modal after action
async function rejectEventFromModal(eventId) {
    const reason = prompt('Masukkan alasan penolakan (opsional):');

    if (reason === null) return; // User cancelled

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (data.status === 'success') {
            closeModal();
            showToast('Event berhasil ditolak', 'success');
            loadEvents(currentTab);
        } else {
            showToast(data.message || 'Gagal menolak event', 'error');
        }
    } catch (error) {
        showToast('Terjadi kesalahan koneksi', 'error');
    }
}

function closeModal() {
    document.getElementById('modalOverlay').classList.remove('active');
    currentEvent = null;
}

// ===== APPROVE / REJECT =====
async function approveEvent(eventId) {
    if (!confirm('Apakah Anda yakin ingin menyetujui event ini?')) return;

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });

        const data = await response.json();

        if (data.status === 'success') {
            showToast('Event berhasil disetujui!', 'success');
            loadEvents(currentTab);
        } else {
            showToast(data.message || 'Gagal menyetujui event', 'error');
        }
    } catch (error) {
        showToast('Terjadi kesalahan koneksi', 'error');
    }
}

async function rejectEvent(eventId) {
    const reason = prompt('Masukkan alasan penolakan (opsional):');

    if (reason === null) return; // User cancelled

    try {
        const response = await fetch(`${API_BASE}/events/${eventId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ reason })
        });

        const data = await response.json();

        if (data.status === 'success') {
            showToast('Event berhasil ditolak', 'success');
            loadEvents(currentTab);
        } else {
            showToast(data.message || 'Gagal menolak event', 'error');
        }
    } catch (error) {
        showToast('Terjadi kesalahan koneksi', 'error');
    }
}

// ===== UTILITIES =====
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.innerHTML = `<span>${type === 'success' ? '✓' : '✕'}</span> ${message}`;
    container.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'toastSlideIn 0.3s ease reverse';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
