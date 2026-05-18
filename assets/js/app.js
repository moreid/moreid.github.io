// Fungsi Deteksi & Pasang Tema saat Halaman Dimuat
document.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme) {
        setTheme(savedTheme);
    } else if (systemPrefersDark) {
        setTheme('dark');
    } else {
        setTheme('light');
    }
});

// Fungsi Mengubah Tema
function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-bs-theme');
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
}

function setTheme(theme) {
    document.documentElement.setAttribute('data-bs-theme', theme);
    localStorage.setItem('theme', theme);
    updateTogglerIcon(theme);
}

// Manipulasi Icon SVG Tombol Tema
function updateTogglerIcon(theme) {
    const btn = document.getElementById('themeToggler');
    const icon = document.getElementById('themeIcon');

    if (theme === 'dark') {
        btn.className = "theme-switch-btn btn btn-light";
        // Ganti ke Ikon Matahari (Sun)
        icon.innerHTML = `<path d="M8 11a3 3 0 1 1 0-6 3 3 0 0 1 0 6zm0 1a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM8 0a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2A.5.5 0 0 1 8 0zm0 13a.5.5 0 0 1 .5.5v2a.5.5 0 0 1-1 0v-2a.5.5 0 0 1 .5-.5zM0 8a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2A.5.5 0 0 1 0 8zm13 0a.5.5 0 0 1 .5-.5h2a.5.5 0 0 1 0 1h-2a.5.5 0 0 1-.5-.5zM2.343 2.343a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 1 1-.707.707L2.343 3.05a.5.5 0 0 1 0-.707zm10.932 10.932a.5.5 0 0 1 .707 0l1.414 1.414a.5.5 0 0 1-.707.707l-1.414-1.414a.5.5 0 0 1 0-.707zm1.414-10.932a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 1 1-.707-.707L12.93 2.343a.5.5 0 0 1 .707 0zm-10.932 10.932a.5.5 0 0 1 0 .707l-1.414 1.414a.5.5 0 0 1-.707-.707l1.414-1.414a.5.5 0 0 1 .707 0z"/>`;
    } else {
        btn.className = "theme-switch-btn btn btn-dark";
        // Ganti ke Ikon Bulan (Moon)
        icon.innerHTML = `<path d="M6 .278a.77.77 0 0 1 .08.858 7.2 7.2 0 0 0-.878 3.46c0 4.021 3.278 7.277 7.306 7.277.793 0 1.571-.124 2.305-.357a.77.77 0 0 1 .916.533A8.25 8.25 0 0 1 8 16.002c-4.573 0-8.25-3.665-8.25-8.247C0 3.738 3.321.135 6 .278z"/><path d="M10.794 3.148a.217.217 0 0 1 .412 0l.387 1.162c.173.518.579.924 1.097 1.097l1.162.387a.217.217 0 0 1 0 .412l-1.162.387a1.73 1.73 0 0 0-1.097 1.097l-.387 1.162a.217.217 0 0 1-.412 0l-.387-1.162A1.73 1.73 0 0 0 9.31 6.593l-1.162-.387a.217.217 0 0 1 0-.412l1.162-.387a1.73 1.73 0 0 0 1.097-1.097zM13.863.099a.145.145 0 0 1 .274 0l.258.774c.115.346.386.617.732.732l.774.258a.145.145 0 0 1 0 .274l-.774.258a1.16 1.16 0 0 0-.732.732l-.258.774a.145.145 0 0 1-.274 0l-.258-.774a1.16 1.16 0 0 0-.732-.732l-.774-.258a.145.145 0 0 1 0-.274l.774-.258c.346-.115.617-.386.732-.732z"/>`;
    }
}

// Fungsi Reusable untuk Membuat & Menampilkan Toast secara Dinamis
function showDynamicToast(message) {
    // 1. Cek apakah container utama toast sudah ada di DOM, jika belum buat baru
    let toastContainer = document.querySelector('.toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainer.style.zIndex = '1100';
        toastContainer.style.paddingTop = '24px'; // Ruang aman notch HP
        document.body.appendChild(toastContainer);
    }

    // 2. Buat ID unik untuk setiap toast baru agar tidak bentrok saat diklik berturut-turut
    const toastId = 'toast_' + Date.now();

    // 3. Template HTML Toast dengan style hijau toska (#1abc9c)
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

    // 4. Sisipkan toast ke dalam container utama
    toastContainer.insertAdjacentHTML('beforeend', toastHTML);

    // 5. Inisialisasi & Jalankan Toast menggunakan instance Bootstrap
    const toastElement = document.getElementById(toastId);
    const bootstrapToast = new bootstrap.Toast(toastElement, {
        delay: 2500 // Hilang otomatis dalam 2.5 detik
    });
    bootstrapToast.show();

    // 6. Hapus elemen dari DOM setelah toast benar-benar selesai bersembunyi agar memori tetap bersih
    toastElement.addEventListener('hidden.bs.toast', () => {
        toastElement.remove();
    });
}

// ==========================================
// PANGGILAN FUNGSI (TETAP SAMA & LEBIH BERSIH)
// ==========================================

// Fungsi Salin No Rekening
function copyToClipboard(elementId, btnElement) {
    const textToCopy = document.getElementById(elementId).innerText;
    navigator.clipboard.writeText(textToCopy).then(() => {
        showDynamicToast("Nomor rekening berhasil disalin!");
    }).catch(err => console.error('Gagal menyalin:', err));
}

// Fungsi Salin Direct Link QRIS secara Aman & Absolut
function copyQrisLink(relativeUrl, btnElement) {
    const secureAbsoluteUrl = window.location.origin + window.location.pathname.replace(/[^\/]*$/, '') + relativeUrl;

    navigator.clipboard.writeText(secureAbsoluteUrl).then(() => {
        showDynamicToast("Link QRIS berhasil disalin!");
    }).catch(err => console.error('Gagal menyalin link:', err));
}