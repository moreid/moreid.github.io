/**
 * Reactmore Digital ID - Core Application JS
 * Berbasis Event Delegation, Reusable, dan Zero-Inline-Onclick.
 * Integrasi Google Apps Script Database (SheetDBClient).
 */

// ==========================================
// INSTANSIASI DATABASE CLIENT
// ==========================================
const API_URL = "https://sheetdb-proxy.reactmoreid.workers.dev/";
const db = new SheetDBClient(API_URL, null);

// State Global untuk menyimpan data katalog sementara tanpa database
let globalScammerData = [];
document.addEventListener("DOMContentLoaded", () => {
    checkUserSession();
    fetchVaultData();
    renderModalReport();

    // Pencarian Real-Time (Filter)
    document.getElementById("vaultSearchInput").addEventListener("input", (e) => {
        const keyword = e.target.value.toLowerCase();
        const filtered = allReports.filter(item =>
            String(item.scam_financial).toLowerCase().includes(keyword) ||
            String(item.scam_sosmed).toLowerCase().includes(keyword) ||
            String(item.kronologi).toLowerCase().includes(keyword)
        );
        renderReports(filtered.slice(0, 5));
    });
});

// ==========================================
// 1. MODULE: CheckUser
// ==========================================
function checkUserSession() {
    const session = localStorage.getItem('user_session');
    const badge = document.getElementById("badgeSessionStatus");
    const nameField = document.getElementById("reportPelaporName");

    if (session) {
        try {
            const user = JSON.parse(session);
            badge.innerText = `Sesi Terautentikasi: ${user.username}`;
            badge.className = "badge bg-success mb-2";
            nameField.value = user.username;
            nameField.setAttribute("readonly", "true");
        } catch (e) {
            localStorage.removeItem('user_session');
        }
    }
}

// ==========================================
// 2. MODULE: Fetch Data
// ==========================================
async function fetchVaultData() {
    try {
        const response = await fetch(`${API_URL}?table=scammervault`);
        const res = await response.json();
        if (res.status === 'success') {
            globalScammerData = res.data || [];
            document.getElementById("countTotalLaporan").innerText = globalScammerData.length;

            // Urutkan berdasarkan ID/waktu terbaru lalu ambil 5 baris pertama
            const recentData = [...globalScammerData].reverse().slice(0, 5);
            renderReports(recentData);
        }
    } catch (err) {
        console.log(err.message);
        document.getElementById("recentReportsContainer").innerHTML = `<div class="text-center text-danger py-3 small">Gagal mengambil basis data dari server cloud.</div>`;
    }
}

function renderReports(data) {
    const container = document.getElementById("recentReportsContainer");
    if (data.length === 0) {
        container.innerHTML = `<div class="text-center py-4 opacity-50 small">Tidak ada kecocokan data laporan.</div>`;
        return;
    }

    container.innerHTML = data.map(item => `
            <div class="webapp-card" style="border-left: 4px solid #e74c3c;">
                <div class="d-flex justify-content-between align-items-center mb-1">
                    <div class="fw-bold text-danger" style="font-size: 0.95rem;">ID: ${item.report_id}</div>
                    <span class="badge bg-secondary style-bank-badge" style="font-size:0.6rem;">${item.created_at ? item.created_at.substring(0, 10) : 'Baru'}</span>
                </div>
                <div class="small mb-1"><strong>Account:</strong> <span class="bg-body-secondary px-1 rounded text-break">${item.scam_financial}</span></div>
                <div class="small mb-1"><strong>Total Loss:</strong> <span class="bg-body-secondary px-1 rounded text-break">Rp ${Number(item.nominal_loss).toLocaleString('id-ID')}</span></div>
                <div class="small mb-2"><strong>Kontak/Medsos:</strong> <span class="text-break">${item.scam_sosmed}</span></div>
                <p class="small opacity-75 mb-2 border-top pt-1" style="font-size:0.8rem; line-height:1.4;">${item.kronologi}</p>
                ${item.evidence_url ? `<a href="${item.evidence_url}" target="_blank" class="btn btn-xs btn-outline-secondary py-0 px-2 rounded-2" style="font-size:0.7rem;">📁 Lihat Bukti Objek</a>` : ''}
            </div>
        `).join('');
}


// ==========================================
// 3. MODULE: Modal Report
// ==========================================
const daftarBank = ["BCA", "Mandiri", "BRI", "BNI", "BSI", "CIMB Niaga", "Permata", "Bank Jago", "Allo Bank", "Lainnya"];
const daftarEwallet = ["Dana", "Ovo", "GoPay", "LinkAja", "ShopeePay", "Doku", "Lainnya"];
const sosmedContainer = document.getElementById("sosmedDynamicContainer");
const addSosmedBtn = document.getElementById("addSosmedBtn");

function renderModalReport() {
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
    const finAccountHolder = document.getElementById("finAccountHolder");

    // EVENT HANDLER PERUBAHAN UTAMA: TIPE AKUN FINANSIAL
    finAccountType.addEventListener("change", function () {
        const tipe = this.value;
        dynamicFinFields.classList.remove("d-none");

        // Reset requirement & visibility default
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

            // Render Opsi Dropdown
            const dataList = tipe === "Bank" ? daftarBank : daftarEwallet;
            finVendorSelect.innerHTML = dataList.map(item => `<option value="${item}">${item}</option>`).join("");
            finVendorSelect.dispatchEvent(new Event("change"));

        } else if (tipe === "Crypto") {
            groupCrypto.classList.remove("d-none");
            cryptoValueInput.required = true;
            cryptoMethodSelect.dispatchEvent(new Event("change"));
        }
    });

    // EVENT HANDLER JIKA PILIH "LAINNYA" PADA VENDOR BANK / EWALLET
    finVendorSelect.addEventListener("change", function () {
        if (this.value === "Lainnya") {
            groupFinLainnya.classList.remove("d-none");
            finVendorCustom.required = true;
        } else {
            groupFinLainnya.classList.add("d-none");
            finVendorCustom.required = false;
        }
    });

    // EVENT HANDLER PERUBAHAN METODE CRYPTO (ADDRESS VS UID)
    cryptoMethodSelect.addEventListener("change", function () {
        if (this.value === "UID") {
            lblCryptoValue.innerText = "Nomor UID Akun Pelaku";
            cryptoValueInput.placeholder = "Masukkan angka UID (contoh: 8749201)";
            groupCryptoUidOpt.classList.remove("d-none");
            cryptoExchangeSelect.dispatchEvent(new Event("change"));
        } else {
            lblCryptoValue.innerText = "Alamat Wallet Address (Crypto Address)";
            cryptoValueInput.placeholder = "Contoh: TR7NHqjeCpJV... (TRC20)";
            groupCryptoUidOpt.classList.add("d-none");
            groupExchangeLainnya.classList.add("d-none");
            cryptoExchangeCustom.required = false;
        }
    });

    // EVENT HANDLER JIKA PILIH EXCHANGE "LAINNYA" PADA CRYPTO UID
    cryptoExchangeSelect.addEventListener("change", function () {
        if (this.value === "Lainnya" && cryptoMethodSelect.value === "UID") {
            groupExchangeLainnya.classList.remove("d-none");
            cryptoExchangeCustom.required = true;
        } else {
            groupExchangeLainnya.classList.add("d-none");
            cryptoExchangeCustom.required = false;
        }
    });



    addSosmedBtn.addEventListener("click", () => {
        const newRow = document.createElement("div");
        newRow.className = "row g-2 mb-2 sosmed-row";
        newRow.style.animation = "fadeIn 0.2s ease";
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
        toggleRemoveButtons();
    });

    sosmedContainer.addEventListener("click", (e) => {
        if (e.target.classList.contains("remove-sosmed-btn")) {
            e.target.closest(".sosmed-row").remove();
            toggleRemoveButtons();
        }
    });
}

function toggleRemoveButtons() {
    const rows = sosmedContainer.querySelectorAll(".sosmed-row");
    rows.forEach(row => {
        const btn = row.querySelector(".remove-sosmed-btn");
        btn.disabled = rows.length === 1;
    });
}

// 2. CONVERTER FILE KE STRING BASE64 BERSIH
function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result.split(',')[1]);
        reader.onerror = error => reject(error);
    });
}

document.getElementById("scammerReportForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const submitBtn = document.getElementById("submitReportBtn");
    submitBtn.disabled = true;
    submitBtn.innerText = "Memproses Berkas Bukti & Mengunggah Laporan...";

    // A. Ambil Semua Nilai Input Media Sosial Dinamis
    const sosmedRows = sosmedContainer.querySelectorAll(".sosmed-row");
    const sosmedArray = [];
    sosmedRows.forEach(row => {
        const platform = row.querySelector(".scam-platform").value;
        const username = row.querySelector(".scam-username").value.trim();
        if (username) {
            sosmedArray.push({
                platform,
                username
            });
        }
    });

    // B. Ambil Seluruh Gambar Terpilih (Multiple Image Loop)
    const fileInputList = document.getElementById("reportScamFile").files;
    const imagesArray = [];

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

    // C. Susun Payload Akhir (scam_sosmed di-stringified ke JSON String)
    const payload = {
        pelapor_name: document.getElementById("reportPelaporName").value.trim(),
        pelapor_contact_type: document.getElementById("reportPelaporType").value,
        pelapor_contact_val: document.getElementById("reportPelaporVal").value.trim(),
        scam_financial: document.getElementById("reportScamFin").value.trim(),
        scam_sosmed: JSON.stringify(sosmedArray), // Disimpan dalam bentuk JSON String yang aman di Spreadsheet
        nominal_loss: document.getElementById("reportScamNominal").value,
        kronologi: document.getElementById("reportScamText").value.trim(),
        images: imagesArray
    };

    try {
        const response = await fetch(`${API_URL}?table=scammervault&action=insert`, {
            method: "POST",
            body: JSON.stringify(payload)
        });
        const res = await response.json();

        if (res && (res.status === "success" || res.id)) {
            alert("Sukses! Laporan Anda telah berhasil dicatat ke dalam database ScammerVault.");
            window.location.reload();
        } else {
            alert("Gagal memproses data: " + (res.message || "Periksa server Google Sheets Anda."));
            submitBtn.disabled = false;
            submitBtn.innerText = "KIRIM LAPORAN ADUAN";
        }
    } catch (err) {
        alert("Terjadi masalah jaringan atau koneksi proxy gagal.");
        submitBtn.disabled = false;
        submitBtn.innerText = "KIRIM LAPORAN ADUAN";
    }
});

