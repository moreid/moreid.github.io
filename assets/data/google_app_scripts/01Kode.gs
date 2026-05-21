var API_KEY_RAHASIA = "Rahasia_Token_API_Anda_123456789_XYZ";
var SPREADSHEET_ID = "1n1i1GANLrP5BGM9foFsxvbe4P-1Kze9LuHxdka_5K0Q";
var MAIN_FOLDER_ID = "1LRbHIa0ZGG4qLx8izkYv1UXT8O4ydJQa";

function responseJSON(data) {
    return ContentService.createTextOutput(JSON.stringify(data))
        .setMimeType(ContentService.MimeType.JSON);
}

function isValidToken(e) {
    var tokenDariHeader = e.headers ? e.headers["X-API-KEY"] : null;

    // Cek token dari Query Parameter URL (Alternatif)
    var tokenDariParam = e.parameter.api_key;

    return (tokenDariHeader === API_KEY_RAHASIA || tokenDariParam === API_KEY_RAHASIA);
}

// HANDLER UNTUK GET REQUEST
function doGet(e) {
    try {
        var db = SheetDB.connect(SPREADSHEET_ID);
        var table = e.parameter.table;
        var id = e.parameter.id;
        var action = e.parameter.action;

        if (!table) return responseJSON({ error: "Parameter 'table' dibutuhkan." });

        // CONTOH REQ: ?table=users&id=1 (Ambil 1 user)
        if (id) {
            var data = db.table(table).find(id);
            return responseJSON({ status: "success", data: data });
        }

        // CONTOH JOIN REQ: ?table=users&action=with_transactions
        if (table === "users" && action === "with_transactions") {
            var data = db.table("users").get({
                join: {
                    with: "transactions",    // join dengan tabel transactions
                    localKey: "id",          // id di tabel users
                    foreignKey: "user_id",   // user_id di tabel transactions
                    as: "transactions"       // nama field hasil join
                }
            });
            return responseJSON({ status: "success", data: data });
        }

        // DEFAULT: Ambil semua data dari tabel yang di-request (?table=users atau ?table=transactions)
        var data = db.table(table).get();
        return responseJSON({ status: "success", data: data });

    } catch (err) {
        return responseJSON({ status: "error", message: err.toString() });
    }
}

// HANDLER UNTUK POST REQUEST (Create, Update, Delete)
function doPost(e) {
    try {
        var db = SheetDB.connect(SPREADSHEET_ID);
        var table = e.parameter.table;
        var action = e.parameter.action;
        var id = e.parameter.id;

        var payload = JSON.parse(e.postData.contents);

        if (!table || !action) {
            return responseJSON({ error: "Parameter 'table' dan 'action' dibutuhkan." });
        }

        var dbTable = db.table(table);
        var result;

        // ==========================================
        // KHUSUS INTEGRASI SCAMMERVAULT & GOOGLE DRIVE
        // ==========================================
        if (table === "scammervault" && action === "insert") {
            var evidenceUrl = "";
            var reportID = "SCAM-" + Date.now();

            // Mengikuti gaya kode Anda yang sukses mendeteksi folder utama dan membuat subfolder
            if (payload.file_data && payload.file_name) {
                // 1. Ambil folder induk langsung berdasarkan ID
                const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);

                // 2. Buat subfolder rapi per kasus memakai nama penipu
                var cleanFinName = payload.scam_financial ? payload.scam_financial.substring(0, 15).replace(/[^a-zA-Z0-9]/g, "_") : "Unknown";
                const subFolder = mainFolder.createFolder(`${reportID} - ${cleanFinName}`);

                // 3. Set izin akses tautan subfolder
                subFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

                // 4. Proses decode Base64 murni (tanpa .split karena sudah bersih dari frontend)
                const bytes = Utilities.base64Decode(payload.file_data);
                const blob = Utilities.newBlob(bytes, "image/png", payload.file_name);

                // 5. Simpan berkas di dalam subfolder baru
                const file = subFolder.createFile(blob);
                evidenceUrl = file.getUrl(); // Ambil tautan berkas bukti untuk disimpan di Google Sheet
            }

            // 6. Susun baris data bersih untuk disimpan ke tabel Google Sheets
            var cleanPayload = {
                id: reportID,
                pelapor_name: payload.pelapor_name || "Anonim",
                pelapor_contact_type: payload.pelapor_contact_type || "WhatsApp",
                pelapor_contact_val: payload.pelapor_contact_val || "-",
                scam_financial: payload.scam_financial || "-",
                scam_sosmed: payload.scam_sosmed || "-",
                nominal_loss: Number(payload.nominal_loss || 0),
                kronologi: payload.kronologi || "-",
                evidence_url: evidenceUrl,
                created_at: new Date().toISOString()
            };

            result = dbTable.insert(cleanPayload);
            return responseJSON(result);
        }

        // --- Logika Tabel Bawaan Lainnya (Users, Products, DLL) ---
        if (action === "insert") {
            result = dbTable.insert(payload);
        } else if (action === "update") {
            if (!id) return responseJSON({ error: "ID dibutuhkan untuk update." });
            result = dbTable.update(id, payload);
        } else if (action === "delete") {
            if (!id) return responseJSON({ error: "ID dibutuhkan untuk delete." });
            result = dbTable.delete(id);
        } else {
            return responseJSON({ error: "Action tidak dikenali." });
        }

        return responseJSON(result);

    } catch (err) {
        return responseJSON({ status: "error", message: err.toString() });
    }
}

function pemicuIzin() {
    // Baris ini memaksa Google mendeteksi bahwa script ini butuh izin Drive
    DriveApp.getRootFolder();
}