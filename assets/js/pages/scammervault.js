/**
 * Reactmore Digital ID - Core Application JS
 * Berbasis Event Delegation, Reusable, dan Zero-Inline-Onclick.
 * Integrasi Google Apps Script Database (SheetDBClient).
 */

// ==========================================
// INSTANSIASI DATABASE CLIENT & STATE
// ==========================================
const API_URL = "https://sheetdb-proxy.reactmoreid.workers.dev/";
const db = new SheetDBClient(API_URL, null);

// State Global untuk menyimpan data katalog sementara
let globalScammerData = [];

const daftarBank = ["BCA", "Mandiri", "BRI", "BNI", "BSI", "CIMB Niaga", "Permata", "Bank Jago", "Allo Bank", "Lainnya"];
const daftarEwallet = ["Dana", "Ovo", "GoPay", "LinkAja", "ShopeePay", "Doku", "Lainnya"];

// ==========================================
// INISIALISASI UTAMA (DOM CONTENT LOADED)
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
    checkUserSession();
    fetchVaultData();
    initModalReport();

    // Pencarian Real-Time (Filter) - Memperbaiki bug 'allReports' menjadi 'globalScammerData'
    const searchInput = document.getElementById("vaultSearchInput");
    if (searchInput) {
        searchInput.addEventListener("input", (e) => {
            const keyword = e.target.value.toLowerCase();
            const filtered = globalScammerData.filter(item =>
                String(item.scam_financial).toLowerCase().includes(keyword) ||
                String(item.scam_sosmed).toLowerCase().includes(keyword) ||
                String(item.kronologi).toLowerCase().includes(keyword)
            );
            // Ambil 5 laporan teratas hasil filter
            renderReports(filtered.slice(0, 5));
        });
    }
});

// ==========================================
// 1. MODULE: Check User Session
// ==========================================
function checkUserSession() {
    const session = localStorage.getItem('user_session');
    const badge = document.getElementById("badgeSessionStatus");
    const nameField = document.getElementById("reportPelaporName");

    if (session && nameField) {
        try {
            const user = JSON.parse(session);
            if (badge) {
                badge.innerText = `Sesi Terautentikasi: ${user.username}`;
                badge.className = "badge bg-success mb-2";
            }
            nameField.value = user.username;
            nameField.setAttribute("readonly", "true");
        } catch (e) {
            localStorage.removeItem('user_session');
        }
    }
}

// ==========================================
// 2. MODULE: Fetch & Render Data Laporan
// ==========================================
async function fetchVaultData() {
    const container = document.getElementById("recentReportsContainer");
    const counterTotal = document.getElementById("countTotalLaporan");

    try {
        const response = await fetch(`${API_URL}?table=scammervault`);
        const res = await response.json();

        if (res.status === 'success') {
            globalScammerData = res.data || [];
            if (counterTotal) counterTotal.innerText = globalScammerData.length;

            // Urutkan berdasarkan data terbaru (reverse) lalu ambil 5 baris pertama
            const recentData = [...globalScammerData].reverse().slice(0, 5);
            renderReports(recentData);
        }
    } catch (err) {
        console.error("Fetch Error:", err.message);
        if (container) {
            container.innerHTML = `<div class="text-center text-danger py-3 small">Gagal mengambil basis data dari server cloud.</div>`;
        }
    }
}

// ==========================================
// HELPER FOR MASKING & PARSING DATA
// ==========================================

// Fungsi mask untuk nama (e.g., "John Doe" -> "J***n D**e" atau "Penipu" -> "P****u")
function maskText(text) {
    if (!text || text === '-' || text.toLowerCase() === 'unknown') return text;
    const words = text.split(' ');
    const maskedWords = words.map(word => {
        if (word.length <= 2) return word;
        return word[0] + '*'.repeat(word.length - 2) + word[word.length - 1];
    });
    return maskedWords.join(' ');
}

// Fungsi mask untuk nomor rekening / nomor HP (e.g., "1234567890" -> "1234****90")
function maskAccountNumber(number) {
    if (!number || number === '-') return number;
    const cleanNum = number.trim();
    if (cleanNum.length <= 4) return '****';
    const visibleLength = Math.ceil(cleanNum.length * 0.3); // Tampilkan ~30% di awal dan akhir
    const start = cleanNum.substring(0, visibleLength);
    const end = cleanNum.substring(cleanNum.length - visibleLength);
    const mask = '*'.repeat(cleanNum.length - (visibleLength * 2));
    return `${start}${mask}${end}`;
}

function isPhoneNumber(str) {
    const clean = str.replace(/[^0-9+]/g, '');
    return clean.length >= 8 && /^[0-9+]+$/.test(clean);
}

// Fungsi pembantu untuk memecah data finansial yang digabung dari DB
// Format asal: "[Bank] BCA - 1234567890 (Nama Pemilik)"
function parseFinancialData(finRaw) {
    const defaultData = { type: '-', vendor: '-', number: '-', holder: '-' };
    if (!finRaw || finRaw === '-') return defaultData;

    try {
        // Ambil tipe dari dalam kurung siku [...]
        const typeMatch = finRaw.match(/^\[(.*?)\]/);
        const type = typeMatch ? typeMatch[1] : '-';

        // Hapus bagian tipe dari string utama
        let cleanStr = finRaw.replace(/^\[.*?\]\s*/, '');

        // Ambil nama pemilik di dalam kurung terakhir (...)
        const holderMatch = cleanStr.match(/\(([^)]+)\)$/);
        const holder = holderMatch ? holderMatch[1] : '-';

        // Hapus bagian holder dari string
        cleanStr = cleanStr.replace(/\s*\([^)]+\)$/, '');

        // Sisa string dipecah berdasarkan tanda "-" untuk mendapatkan Vendor dan Nomor
        const parts = cleanStr.split('-');
        const vendor = parts[0] ? parts[0].trim() : '-';
        const number = parts[1] ? parts[1].trim() : '-';

        return { type, vendor, number, holder };
    } catch (e) {
        return { type: 'Info', vendor: finRaw, number: '-', holder: '-' };
    }
}

function renderReports(data) {
    const container = document.getElementById("recentReportsContainer");
    if (!container) return;

    if (data.length === 0) {
        container.innerHTML = `<div class="text-center py-4 opacity-50 small">Tidak ada kecocokan data laporan.</div>`;
        return;
    }

    container.innerHTML = data.map(item => {
        // Parsing data finansial terstruktur
        const fin = parseFinancialData(item.scam_financial);

        // Terapkan Masking di Frontend
        const maskedHolder = maskText(fin.holder);
        const maskedNumber = maskAccountNumber(fin.number);

        // Render List Media Sosial
        const sosmedListHtml = formatSosmedToList(item.scam_sosmed);

        return `
            <div class="card shadow-sm rounded-3 mb-2" style="border-left: 4px solid #e74c3c !important; background: var(--bs-body-bg);">
                <div class="card-body p-3">
                    <!-- Header Card -->
                    <div class="d-flex justify-content-between align-items-center pb-2 mb-2 border-bottom border-translucent">
                        <div>
                            <span class="badge bg-danger-subtle text-danger fw-bold me-1" style="font-size: 0.75rem;">${fin.type}</span>
                            <span class="fw-semibold text-secondary" style="font-size: 0.85rem;">ID: ${item.report_id || '-'}</span>
                        </div>
                        <span class="badge bg-secondary-subtle text-secondary style-bank-badge" style="font-size:0.65rem;">
                            ${item.created_at ? item.created_at.substring(0, 10) : 'Baru'}
                        </span>
                    </div>
                    
                    <!-- Konten Finansial & Kerugian -->
                    <div class="row g-2 mb-3">
                        <div class="col-7">
                            <div class="text-muted opacity-75" style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">Akun Finansial</div>
                            <div class="fw-bold text-body mb-0" style="font-size: 0.9rem;">${fin.vendor}</div>
                            <div class="font-monospace text-secondary small text-break">${maskedNumber}</div>
                            <div class="small text-muted text-truncate">A/N: <span class="fw-medium">${maskedHolder}</span></div>
                        </div>
                        <div class="col-5 text-end border-start border-translucent ps-2">
                            <div class="text-muted opacity-75" style="font-size: 0.7rem; font-weight: 600; text-transform: uppercase;">Total Kerugian</div>
                            <div class="fw-bold text-danger h5 my-1">
                                Rp ${Number(item.nominal_loss || 0).toLocaleString('id-ID')}
                            </div>
                        </div>
                    </div>
                    
                    <!-- List Media Sosial / Kontak Pelaku -->
                    <div class="mb-3 p-2 bg-light rounded-2 border border-translucent">
                        <div class="text-muted opacity-75 mb-1" style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">Kontak / Medsos Terkait:</div>
                        ${sosmedListHtml}
                    </div>
                    
                    <!-- Kronologi Singkat -->
                    <div class="mt-2">
                        <div class="text-muted opacity-75" style="font-size: 0.65rem; font-weight: 700; text-transform: uppercase;">Kronologi Kasus:</div>
                        <p class="small text-secondary mb-2 lh-base" style="font-size:0.8rem; text-align: justify;">
                            ${item.kronologi || 'Tidak ada keterangan kronologi.'}
                        </p>
                    </div>
                    
                    <!-- Tombol Bukti Fisik -->
                    ${item.evidence_url ? `
                        <div class="d-flex justify-content-end border-top border-translucent pt-2 mt-2">
                            <a href="${item.evidence_url}" target="_blank" class="btn btn-sm btn-outline-secondary py-1 px-3 rounded-2" style="font-size:0.75rem; fw-medium">
                                📁 Lihat Bukti Dokumen / Foto
                            </a>
                        </div>
                    ` : ''}
                </div>
            </div>
        `;
    }).join('');
}

// Helper untuk merubah data sosmed JSON menjadi baris list vertical yang rapi jika banyak
function formatSosmedToList(sosmedRaw) {
    try {
        const arr = JSON.parse(sosmedRaw);
        if (Array.isArray(arr) && arr.length > 0) {
            return `
                <div class="d-flex flex-wrap gap-1 mt-1">
                    ${arr.map(s => {
                // Logika Masking: 
                // Jika platform bukan "Website" dan isinya terdeteksi nomor telepon, maka mask
                let displayValue = s.username;
                const isPhone = isPhoneNumber(s.username);

                if (s.platform !== 'Website' && s.platform !== 'Facebook' && isPhone) {
                    displayValue = maskAccountNumber(s.username);
                }

                // PERBAIKAN: Menambahkan max-width dan text-break agar tidak menjebol layar HP
                return `
                            <span class="badge bg-body-secondary text-body border py-1 px-2 rounded-2 d-inline-flex align-items-center gap-1" 
                                  style="font-size: 0.72rem; font-weight: 500; max-width: 100%; text-break: break-all; white-space: normal; text-align: left;">
                                <small class="text-primary fw-bold" style="font-size: 0.65rem; flex-shrink: 0;">${s.platform}:</small> 
                                <span class="text-break">${displayValue}</span>
                            </span>
                        `;
            }).join('')}
                </div>
            `;
        }
    } catch (e) { }

    if (sosmedRaw && sosmedRaw !== '-') {
        return `<div class="small text-body font-monospace text-break ps-1">${sosmedRaw}</div>`;
    }
    return `<div class="small text-muted italic ps-1">Tidak ada data media sosial.</div>`;
}

// ==========================================
// 3. MODULE: Form & Modal Interactive Logic
// ==========================================
function initModalReport() {
    const finAccountType = document.getElementById("finAccountType");
    const dynamicFinFields = document.getElementById("dynamicFinFields");
    const groupBankEwallet = document.getElementById("groupBankEwallet");
    const groupCrypto = document.getElementById("groupCrypto");

    const lblFinSelect = document.getElementById("lblFinSelect");
    const finVendorSelect = document.getElementById("finVendorSelect");
    const finAccountNumber = document.getElementById("finAccountNumber");
    const groupFinLainnya = document.getElementById("groupFinLainnya");
    const finVendorCustom = document.getElementById("finVendorCustom");

    const cryptoMethodSelect = document.getElementById("cryptoMethodSelect");
    const lblCryptoValue = document.getElementById("lblCryptoValue");
    const cryptoValueInput = document.getElementById("cryptoValueInput");
    const groupCryptoUidOpt = document.getElementById("groupCryptoUidOpt");
    const cryptoExchangeSelect = document.getElementById("cryptoExchangeSelect");
    const groupExchangeLainnya = document.getElementById("groupExchangeLainnya");
    const cryptoExchangeCustom = document.getElementById("cryptoExchangeCustom");

    const sosmedContainer = document.getElementById("sosmedDynamicContainer");
    const addSosmedBtn = document.getElementById("addSosmedBtn");
    const reportForm = document.getElementById("scammerReportForm");

    if (!finAccountType) return;

    // EVENT: PERUBAHAN UTAMA TIPE AKUN FINANSIAL
    finAccountType.addEventListener("change", function () {
        const tipe = this.value;
        dynamicFinFields.classList.remove("d-none");

        // Reset visibility & HTML5 Validation
        groupBankEwallet.classList.add("d-none");
        groupCrypto.classList.add("d-none");
        finVendorSelect.required = false;
        finAccountNumber.required = false;
        cryptoValueInput.required = false;

        if (tipe === "Bank" || tipe === "E-Wallet") {
            groupBankEwallet.classList.remove("d-none");
            finVendorSelect.required = true;
            finAccountNumber.required = true;

            lblFinSelect.innerText = tipe === "Bank" ? "Pilih Bank" : "Pilih E-Wallet";
            finAccountNumber.placeholder = tipe === "Bank" ? "Masukkan Nomor Rekening" : "Masukkan Nomor HP E-Wallet";

            const dataList = tipe === "Bank" ? daftarBank : daftarEwallet;
            finVendorSelect.innerHTML = dataList.map(item => `<option value="${item}">${item}</option>`).join("");
            finVendorSelect.dispatchEvent(new Event("change"));

        } else if (tipe === "Crypto") {
            groupCrypto.classList.remove("d-none");
            cryptoValueInput.required = true;
            cryptoMethodSelect.dispatchEvent(new Event("change"));
        }
    });

    // EVENT: JIKA PILIH "LAINNYA" PADA VENDOR BANK / EWALLET
    finVendorSelect.addEventListener("change", function () {
        if (this.value === "Lainnya") {
            groupFinLainnya.classList.remove("d-none");
            finVendorCustom.required = true;
        } else {
            groupFinLainnya.classList.add("d-none");
            finVendorCustom.required = false;
        }
    });

    // EVENT: PERUBAHAN METODE CRYPTO (ADDRESS VS UID)
    cryptoMethodSelect.addEventListener("change", function () {
        if (this.value === "UID") {
            lblCryptoValue.innerText = "Nomor UID Akun Pelaku";
            cryptoValueInput.placeholder = "Masukkan angka UID (contoh: 8749201)";
            groupCryptoUidOpt.classList.remove("d-none");
            cryptoExchangeSelect.dispatchEvent(new Event("change"));
        } else {
            lblCryptoValue.innerText = "Alamat Wallet";
            cryptoValueInput.placeholder = "Contoh: TR7NHqjeCpJV... (TRC20)";
            groupCryptoUidOpt.classList.add("d-none");
            groupExchangeLainnya.classList.add("d-none");
            cryptoExchangeCustom.required = false;
        }
    });

    // EVENT: JIKA PILIH EXCHANGE "LAINNYA" PADA CRYPTO UID
    cryptoExchangeSelect.addEventListener("change", function () {
        if (this.value === "Lainnya" && cryptoMethodSelect.value === "UID") {
            groupExchangeLainnya.classList.remove("d-none");
            cryptoExchangeCustom.required = true;
        } else {
            groupExchangeLainnya.classList.add("d-none");
            cryptoExchangeCustom.required = false;
        }
    });

    // EVENT: TAMBAH FORM SOSMED DINAMIS
    addSosmedBtn.addEventListener("click", () => {
        const newRow = document.createElement("div");
        newRow.className = "row g-2 mb-2 sosmed-row";
        newRow.innerHTML = `
            <div class="col-4">
              <select class="form-select form-select-sm rounded-3 scam-platform">
                <option value="WhatsApp">WhatsApp</option>
                <option value="Telegram">Telegram</option>
                <option value="Instagram">Instagram</option>
                <option value="Facebook">Facebook URL</option>
                <option value="TikTok">TikTok</option>
                <option value="Website">Website/Lain</option>
              </select>
            </div>
            <div class="col-8 d-flex gap-2">
              <input type="text" class="form-control form-control-sm rounded-3 scam-username" placeholder="Username / No HP" required>
              <button type="button" class="btn btn-sm btn-outline-danger rounded-3 px-2 py-0 remove-sosmed-btn" style="font-size:0.9rem; line-height:1;">×</button>
            </div>
        `;
        sosmedContainer.appendChild(newRow);
        toggleRemoveButtons(sosmedContainer);
    });

    // EVENT DELEGATION: HAPUS SOSMED
    sosmedContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-sosmed-btn")) {
            e.target.closest(".sosmed-row").remove();
            toggleRemoveButtons(sosmedContainer);
        }
    });

    // EVENT: SUBMIT FORM LAPORAN
    reportForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById("submitReportBtn");

        submitBtn.disabled = true;
        submitBtn.innerText = "Memproses Berkas Bukti & Mengunggah Laporan...";

        // 1. Ambil Nilai Input Media Sosial Dinamis
        const sosmedRows = sosmedContainer.querySelectorAll(".sosmed-row");
        const sosmedArray = [];
        sosmedRows.forEach(row => {
            const platform = row.querySelector(".scam-platform").value;
            const username = row.querySelector(".scam-username").value.trim();
            if (username) {
                sosmedArray.push({ platform, username });
            }
        });

        // 2. Ambil Seluruh Gambar Terpilih (Multiple Image Loop)
        const fileInputList = document.getElementById("reportScamFile").files;
        const imagesArray = [];
        try {
            if (fileInputList.length > 0) {
                await Promise.all(Array.from(fileInputList).map(async (file, index) => {
                    const base64Data = await fileToBase64(file);
                    const cleanName = `${Date.now()}_bukti_${index + 1}_${file.name.replace(/\s+/g, '_')}`;
                    imagesArray.push({
                        file_data: base64Data,
                        file_name: cleanName
                    });
                }));
            }
        } catch (err) {
            alert("Gagal memproses file gambar bukti.");
            resetSubmitButton(submitBtn);
            return;
        }

        // 3. Rekonstruksi & Ambil Nilai Finansial Pelaku (Menghindari bug reportScamFin)
        let scamFinancialFormatted = "";
        const tipeFin = finAccountType.value;

        if (tipeFin === "Bank" || tipeFin === "E-Wallet") {
            const vendor = (finVendorSelect.value === "Lainnya") ? finVendorCustom.value.trim() : finVendorSelect.value;
            scamFinancialFormatted = `[${tipeFin}] ${vendor} - ${finAccountNumber.value.trim()} (${document.getElementById("finAccountHolder").value.trim()})`;
        } else if (tipeFin === "Crypto") {
            const metode = cryptoMethodSelect.value;
            if (metode === "UID") {
                const exchange = (cryptoExchangeSelect.value === "Lainnya") ? cryptoExchangeCustom.value.trim() : cryptoExchangeSelect.value;
                scamFinancialFormatted = `[Crypto UID] ${exchange} - ${cryptoValueInput.value.trim()} (${document.getElementById("finAccountHolder").value.trim()})`;
            } else {
                scamFinancialFormatted = `[Crypto Address] ${cryptoValueInput.value.trim()} (${document.getElementById("finAccountHolder").value.trim()})`;
            }
        }

        // 4. Susun Payload Akhir
        const payload = {
            pelapor_name: document.getElementById("reportPelaporName").value.trim(),
            pelapor_contact_type: document.getElementById("reportPelaporType").value,
            pelapor_contact_val: document.getElementById("reportPelaporVal").value.trim(),
            scam_financial: scamFinancialFormatted,
            scam_sosmed: JSON.stringify(sosmedArray),
            nominal_loss: document.getElementById("reportScamNominal").value,
            kronologi: document.getElementById("reportScamText").value.trim(),
            images: imagesArray
        };

        // 5. Kirim HTTP POST ke Proxy Server Cloud
        try {
            const response = await fetch(`${API_URL}?table=scammervault&action=insert`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(payload)
            });
            const res = await response.json();

            if (res && (res.status === "success" || res.id)) {
                alert("Sukses! Laporan Anda telah berhasil dicatat ke dalam database ScammerVault.");
                window.location.reload();
            } else {
                alert("Gagal memproses data: " + (res.message || "Periksa server Google Sheets Anda."));
                resetSubmitButton(submitBtn);
            }
        } catch (err) {
            alert("Terjadi masalah jaringan atau koneksi proxy gagal.");
            resetSubmitButton(submitBtn);
        }
    });
}

// Helper: Manajemen tombol hapus sosmed dinamis
function toggleRemoveButtons(container) {
    const rows = container.querySelectorAll(".sosmed-row");
    rows.forEach(row => {
        const btn = row.querySelector(".remove-sosmed-btn");
        if (btn) btn.disabled = rows.length === 1;
    });
}

// Helper: Reset tombol submit jika proses gagal
function resetSubmitButton(btn) {
    btn.disabled = false;
    btn.innerText = "KIRIM LAPORAN ADUAN";
}

// Helper: Menghasilkan String Base64 murni dari File input
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}