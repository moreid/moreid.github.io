/**
 * Reactmore Digital ID - Core Application JS
 * Berbasis Event Delegation, Reusable, dan Zero-Inline-Onclick.
 */

document.addEventListener('DOMContentLoaded', () => {
    initThemeManager();
    initInteractionsManager(); // Gabungan clipboard dan modal dinamis
});

// ==========================================
// 1. MODULE: THEME MANAGER
// ==========================================
function initThemeManager() {
    const themeToggler = document.getElementById('themeToggler');
    if (!themeToggler) return;

    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    let activeTheme = savedTheme || (systemPrefersDark ? 'dark' : 'light');
    applyTheme(activeTheme);

    themeToggler.addEventListener('click', () => {
        const currentTheme = document.documentElement.getAttribute('data-bs-theme');
        const nextTheme = currentTheme === 'dark' ? 'light' : 'dark';
        applyTheme(nextTheme);
    });
}

function applyTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);

    const btn = document.getElementById('themeToggler');
    const icon = document.getElementById('themeIcon');
    if (!btn || !icon) return;

    if (theme === 'dark') {
        btn.className = "theme-switch-btn btn btn-light";
        icon.innerHTML = `<path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5zM0 8a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 0 8zm13 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zM2.343 2.343a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 1 1-.707.707L2.343 3.05a.5.5 0 0 1 0-.707zm10.932 10.932a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 0 1-.707.707l-1.414-1.414a.5.5 0 0 1 0-.707zm1.414-10.932a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707L12.93 2.343a.5.5 0 0 1 .707 0zm-10.932 10.932a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0z"/>`;
    } else {
        btn.className = "theme-switch-btn btn btn-dark";
        icon.innerHTML = `<path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.306 7.277.793 0 1.571-.124 2.305-.357a.77.77 0 0 1 .916.533A8.25 8.25 0 0 1 8 16.002c-4.573 0-8.25-3.665-8.25-8.247C0 3.738 3.321.135 6 .278z"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.73 1.73 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.73 1.73 0 0 0 1.097-1.097zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/>`;
    }
}

// ==========================================
// 2. MODULE: MAIN INTERACTIONS MANAGER (DYNAMIC REUSABLE MODAL & CLIPBOARD)
// ==========================================
function initInteractionsManager() {
    document.body.addEventListener('click', (event) => {

        // --- FITUR 1: OPEN DYNAMIC MODAL QRIS ---
        const viewBtn = event.target.closest('.js-btn-view-qris');
        if (viewBtn) {
            // Ambil semua data meta dari elemen tombol yang diklik
            const title = viewBtn.getAttribute('data-qris-title');
            const imgSrc = viewBtn.getAttribute('data-qris-src');
            const desc = viewBtn.getAttribute('data-qris-desc');

            // Ambil elemen penampung di dalam modal tunggal
            const modalTitle = document.getElementById('dynamicModalTitle');
            const modalImg = document.getElementById('dynamicModalImg');
            const modalDesc = document.getElementById('dynamicModalDesc');
            const modalLoader = document.getElementById('modalLoader');

            // Reset tampilan (tampilkan loader, sembunyikan gambar lama) sebelum memuat gambar baru
            modalLoader.classList.remove('d-none');
            modalImg.classList.add('d-none');

            // Suntikkan teks ke dalam modal
            if (modalTitle) modalTitle.innerText = title;
            if (modalDesc) modalDesc.innerText = desc;

            // Suntikkan gambar & hilangkan loader saat gambar selesai diunduh oleh browser
            if (modalImg) {
                modalImg.src = imgSrc;
                modalImg.onload = () => {
                    modalLoader.classList.add('d-none');
                    modalImg.classList.remove('d-none');
                };
            }
        }

        // --- FITUR 2: COPY REKENING BANK ---
        const bankBtn = event.target.closest('.js-btn-copy-bank');
        if (bankBtn) {
            const targetId = bankBtn.getAttribute('data-copy-target');
            const accountText = document.getElementById(targetId)?.innerText;
            if (accountText) {
                executeCopy(accountText, "Nomor rekening berhasil disalin!");
            }
        }

        // --- FITUR 3: COPY LINK QRIS ---
        const qrisBtn = event.target.closest('.js-btn-copy-qris');
        if (qrisBtn) {
            const relativeUrl = qrisBtn.getAttribute('data-qris-src');
            const secureAbsoluteUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '') + relativeUrl;
            executeCopy(secureAbsoluteUrl, "Link QRIS aman berhasil disalin!");
        }
    });
}

function executeCopy(text, successMessage) {
    navigator.clipboard.writeText(text)
        .then(() => showDynamicToast(successMessage))
        .catch(err => console.error('Gagal menyalin text: ', err));
}

// ==========================================
// 3. MODULE: TOAST GLOBAL COMPONENT
// ==========================================
function showDynamicToast(message) {
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        toastContainer.style.paddingTop = '24px';
        document.body.appendChild(toastContainer);
    }

    const toastId = 'toast_' + Date.now();
    const toastHTML = `
      <div id="${toastId}" class="toast align-items-center text-white border-0" role="alert" aria-live="assertive" aria-atomic="true" style="background-color: #1abc9c !important; border-radius: 12px; box-shadow: 0 10px 30px rgba(26, 188, 156, 0.2); font-size: 0.85rem; font-weight: 600;">
        <div class="d-flex">
          <div class="toast-body d-flex align-items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
              <path d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"/>
            </svg>
            <span>${message}</span>
          </div>
          <button type="button" class="btn-close btn-close-white m-auto me-2" data-bs-dismiss="toast" aria-label="Close"></button>
        </div>
      </div>
    `;

    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    const toastElement = document.getElementById(toastId);
    const bootstrapToast = new bootstrap.Toast(toastElement, { delay: 2500 });
    bootstrapToast.show();

    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}