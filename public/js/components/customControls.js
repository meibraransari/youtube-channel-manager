/**
 * Professional Custom UI Controls (Toasts, Cyber Modals, Futuristic Datepicker, Custom Dropdowns)
 */

// 1. Toast Notification System
const Toast = {
  container: null,

  init() {
    if (!this.container) {
      this.container = document.createElement('div');
      this.container.className = 'toast-container';
      document.body.appendChild(this.container);
    }
  },

  show(message, type = 'info', duration = 3500) {
    this.init();
    const toast = document.createElement('div');
    toast.className = `cyber-toast toast-${type}`;

    let icon = 'ℹ️';
    if (type === 'success') icon = '✅';
    if (type === 'error') icon = '⚠️';
    if (type === 'warning') icon = '⚡';

    toast.innerHTML = `
      <div style="font-size: 18px;">${icon}</div>
      <div style="flex: 1; font-size: 13px; font-weight: 600;">${message}</div>
      <button style="background: none; border: none; color: var(--text-dim); cursor: pointer; font-size: 14px;" onclick="this.parentElement.remove()">✕</button>
    `;

    this.container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(100%)';
      toast.style.transition = 'all 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, duration);
  }
};

window.Toast = Toast;

// 2. Futuristic Cyber Confirmation Dialog
function cyberConfirm({
  title = 'Confirmation Required',
  message = 'Are you sure you wish to proceed with this directive?',
  confirmText = 'EXECUTE DIRECTIVE',
  cancelText = 'ABORT',
  type = 'warning'
}) {
  return new Promise((resolve) => {
    let modal = document.getElementById('cyberConfirmModal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'cyberConfirmModal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const glowColor = type === 'danger' ? 'rgba(239, 68, 68, 0.4)' : 'var(--neon-cyan-glow)';
    const btnClass = type === 'danger' ? 'btn-cyber-danger' : 'btn-cyber-primary';

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 480px; border-color: ${glowColor}; box-shadow: 0 0 30px ${glowColor};">
        <div class="modal-header">
          <div class="modal-title" style="display: flex; align-items: center; gap: 8px;">
            <span style="font-size: 20px;">${type === 'danger' ? '⚠️' : '⚡'}</span>
            <span>${title}</span>
          </div>
          <button class="modal-close-btn" id="confirmCloseX">✕</button>
        </div>
        <div class="modal-body">
          <p style="font-size: 14px; color: var(--text-muted); line-height: 1.6;">${message}</p>
        </div>
        <div class="modal-footer">
          <button class="btn-cyber btn-cyber-outline" id="confirmCancelBtn">${cancelText}</button>
          <button class="btn-cyber ${btnClass}" id="confirmAcceptBtn">${confirmText}</button>
        </div>
      </div>
    `;

    modal.classList.add('open');

    let resolved = false;
    function cleanup(result) {
      if (resolved) return;
      resolved = true;
      modal.classList.remove('open');
      resolve(result);
    }

    document.getElementById('confirmCancelBtn').onclick = (e) => { e.preventDefault(); e.stopPropagation(); cleanup(false); };
    document.getElementById('confirmCloseX').onclick = (e) => { e.preventDefault(); e.stopPropagation(); cleanup(false); };
    document.getElementById('confirmAcceptBtn').onclick = (e) => { e.preventDefault(); e.stopPropagation(); cleanup(true); };

    const backdropListener = (e) => {
      if (e.target === modal) {
        modal.removeEventListener('click', backdropListener);
        cleanup(false);
      }
    };
    modal.addEventListener('click', backdropListener);
  });
}

window.cyberConfirm = cyberConfirm;

// 3. Futuristic Custom Date & Time Picker Modal
function openCyberDatePicker(currentVal, onSelect) {
  let modal = document.getElementById('cyberDatePickerModal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'cyberDatePickerModal';
    modal.className = 'modal-overlay';
    document.body.appendChild(modal);
  }

  const now = new Date();
  let selectedDate = currentVal ? new Date(currentVal) : now;
  if (isNaN(selectedDate.getTime())) selectedDate = now;

  let currentYear = selectedDate.getFullYear();
  let currentMonth = selectedDate.getMonth(); // 0-11
  let currentHours = selectedDate.getHours();
  let currentMinutes = selectedDate.getMinutes();

  const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

  function renderCalendar() {
    const firstDay = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

    let daysHtml = '';
    // Empty cells for first day offset
    for (let i = 0; i < firstDay; i++) {
      daysHtml += `<div style="height: 36px;"></div>`;
    }

    for (let d = 1; d <= daysInMonth; d++) {
      const isSelected = selectedDate.getDate() === d && selectedDate.getMonth() === currentMonth && selectedDate.getFullYear() === currentYear;
      const isToday = now.getDate() === d && now.getMonth() === currentMonth && now.getFullYear() === currentYear;

      let cellStyle = `
        height: 36px;
        display: flex;
        align-items: center;
        justify-content: center;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 600;
        transition: all 0.15s ease;
      `;

      if (isSelected) {
        cellStyle += `background: linear-gradient(135deg, var(--neon-cyan), var(--neon-violet)); color: #070913; font-weight: 800; box-shadow: 0 0 12px var(--neon-cyan-glow);`;
      } else if (isToday) {
        cellStyle += `border: 1px solid var(--neon-cyan); color: var(--neon-cyan);`;
      } else {
        cellStyle += `color: var(--text-main); hover: background: rgba(255,255,255,0.08);`;
      }

      daysHtml += `<div class="cal-day-cell" data-day="${d}" style="${cellStyle}">${d}</div>`;
    }

    modal.innerHTML = `
      <div class="modal-dialog" style="max-width: 420px;">
        <div class="modal-header">
          <div class="modal-title">🗓️ SCHEDULE DATE & TIME</div>
          <button class="modal-close-btn" id="calCloseBtn">✕</button>
        </div>
        <div class="modal-body" style="padding: 16px 20px;">
          <!-- Month Header -->
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px;">
            <button class="btn-cyber btn-cyber-outline btn-sm" id="calPrevMonth">◀</button>
            <div style="font-family: var(--font-tech); font-size: 15px; font-weight: 700; color: var(--neon-cyan);">
              ${monthNames[currentMonth]} ${currentYear}
            </div>
            <button class="btn-cyber btn-cyber-outline btn-sm" id="calNextMonth">▶</button>
          </div>

          <!-- Day of Week Headers -->
          <div style="display: grid; grid-template-columns: repeat(7, 1fr); text-align: center; font-size: 11px; font-weight: 700; color: var(--text-dim); margin-bottom: 8px;">
            <div>SUN</div><div>MON</div><div>TUE</div><div>WED</div><div>THU</div><div>FRI</div><div>SAT</div>
          </div>

          <!-- Days Grid -->
          <div id="calDaysGrid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; margin-bottom: 20px;">
            ${daysHtml}
          </div>

          <!-- Time Picker Section -->
          <div style="padding-top: 14px; border-top: 1px solid var(--border-color); display: flex; align-items: center; justify-content: space-between;">
            <div style="font-size: 12px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
              ⏰ TIME (24H):
            </div>
            <div style="display: flex; align-items: center; gap: 6px;">
              <input type="number" id="calHour" min="0" max="23" value="${String(currentHours).padStart(2, '0')}" class="cyber-input" style="width: 60px; text-align: center; padding: 6px;" />
              <span style="font-weight: 700;">:</span>
              <input type="number" id="calMin" min="0" max="59" value="${String(currentMinutes).padStart(2, '0')}" class="cyber-input" style="width: 60px; text-align: center; padding: 6px;" />
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button class="btn-cyber btn-cyber-outline" id="calCancelBtn">ABORT</button>
          <button class="btn-cyber btn-cyber-primary" id="calConfirmBtn">CONFIRM SCHEDULE</button>
        </div>
      </div>
    `;

    modal.classList.add('open');

    // Events
    document.getElementById('calCloseBtn').onclick = () => modal.classList.remove('open');
    document.getElementById('calCancelBtn').onclick = () => modal.classList.remove('open');

    document.getElementById('calPrevMonth').onclick = () => {
      currentMonth--;
      if (currentMonth < 0) {
        currentMonth = 11;
        currentYear--;
      }
      renderCalendar();
    };

    document.getElementById('calNextMonth').onclick = () => {
      currentMonth++;
      if (currentMonth > 11) {
        currentMonth = 0;
        currentYear++;
      }
      renderCalendar();
    };

    document.querySelectorAll('.cal-day-cell').forEach(cell => {
      cell.onclick = () => {
        const d = parseInt(cell.getAttribute('data-day'), 10);
        selectedDate = new Date(currentYear, currentMonth, d, currentHours, currentMinutes);
        renderCalendar();
      };
    });

    document.getElementById('calConfirmBtn').onclick = () => {
      const h = parseInt(document.getElementById('calHour').value, 10) || 0;
      const m = parseInt(document.getElementById('calMin').value, 10) || 0;
      selectedDate.setHours(h);
      selectedDate.setMinutes(m);

      modal.classList.remove('open');
      if (onSelect) onSelect(selectedDate.toISOString());
    };
  }

  renderCalendar();
}

window.openCyberDatePicker = openCyberDatePicker;

// 4. Universal Modal Manager & Fail-Safe Close Handlers
window.openModal = function(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (!modal) return;
  if (modal.parentElement !== document.body) {
    document.body.appendChild(modal);
  }
  modal.classList.add('open');
};

window.closeModal = function(modalOrId) {
  const modal = typeof modalOrId === 'string' ? document.getElementById(modalOrId) : modalOrId;
  if (modal) {
    modal.classList.remove('open');
  }
};

window.closeAllModals = function() {
  document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
};

// Global click listener ensuring every close trigger, backdrop click, and cancel button ALWAYS works
document.addEventListener('click', (e) => {
  // 1. Explicit close buttons or elements with .modal-close-btn, [data-close-modal]
  const closeBtn = e.target.closest('.modal-close-btn, [data-close-modal], .btn-close-modal');
  if (closeBtn) {
    e.preventDefault();
    e.stopPropagation();
    const modal = closeBtn.closest('.modal-overlay');
    if (modal) {
      modal.classList.remove('open');
    }
    return;
  }

  // 2. Click on modal overlay backdrop itself
  if (e.target.classList && e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
    return;
  }

  // 3. Global Sign Out Click Delegation
  const signoutBtn = e.target.closest('.signout-trigger-btn, #navDirectSignoutBtn, #navDropdownSignoutBtn, #sidebarSignoutBtn, [data-action="logout"], [data-action="signout"], [href="#logout"], [href="#signout"]');
  if (signoutBtn) {
    e.preventDefault();
    e.stopPropagation();
    window.logout();
    return;
  }
});

// Global Escape key listener to close modals
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    window.closeAllModals();
  }
});

// 5. Universal Bulletproof Sign Out Routine
window.logout = function() {
  console.log('[AUTH] Universal Sign Out directive executed.');

  // 1. Purge client-side auth tokens and cached user models synchronously
  try {
    localStorage.removeItem('yt_auth_token');
    localStorage.removeItem('yt_auth_user');
    sessionStorage.clear();
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && (k.startsWith('yt_auth') || k.includes('token') || k.includes('user'))) {
        localStorage.removeItem(k);
      }
    }
  } catch (err) {
    console.warn('Storage purge warning:', err);
  }

  // 2. Clear in-memory API authentication
  if (window.API) {
    try {
      window.API.setToken(null);
      window.API.setUser(null);
    } catch {}
  }

  // 3. Clear in-memory App state
  if (window.App) {
    window.App.currentUser = null;
    window.App.currentView = 'dashboard';
  }

  // 4. Send background signout notification to server (non-blocking)
  try {
    fetch('/api/auth/logout', { method: 'POST', keepalive: true }).catch(() => {});
  } catch {}

  // 5. Reset URL hash without triggering hashchange routing loops
  if (window.history && window.history.replaceState) {
    window.history.replaceState(null, '', window.location.pathname);
  }

  // 6. Direct clean navigation to root authentication view
  window.location.href = '/';
};
