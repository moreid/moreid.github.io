var API_KEY_RAHASIA = "Rahasia_Token_API_Anda_123456789_XYZ";
var SPREADSHEET_ID = "1n1i1GANLrP5BGM9foFsxvbe4P-1Kze9LuHxdka_5K0Q";
var MAIN_FOLDER_ID = "1LRbHIa0ZGG4qLx8izkYv1UXT8O4ydJQa";

function responseJSON(data) {
  return ContentService.createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function isValidToken(e) {
  var tokenDariHeader = e.headers ? e.headers["X-API-KEY"] : null;
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
      // Lakukan masking jika mengakses tabel scammervault
      if (table === "scammervault" && data) {
        data = maskScammerVaultRow(data);
      }
      return responseJSON({ status: "success", data: data });
    }

    // CONTOH JOIN REQ: ?table=users&action=with_transactions
    if (table === "users" && action === "with_transactions") {
      var data = db.table("users").get({
        join: {
          with: "transactions",
          localKey: "id",
          foreignKey: "user_id",
          as: "transactions"
        }
      });
      return responseJSON({ status: "success", data: data });
    }

    // DEFAULT: Ambil semua data dari tabel
    var data = db.table(table).get();

    // PERBAIKAN BACKEND: Lakukan masking masal jika tabel adalah scammervault
    if (table === "scammervault" && Array.isArray(data)) {
      data = data.map(function (row) {
        return maskScammerVaultRow(row);
      });
    }

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

    if (table === "scammervault" && action === "insert") {
      var reportID = "SCAM-" + Date.now();
      const mainFolder = DriveApp.getFolderById(MAIN_FOLDER_ID);

      var cleanFinName = payload.scam_financial ? payload.scam_financial.substring(0, 15).replace(/[^a-zA-Z0-9]/g, "_") : "Unknown";
      const subFolder = mainFolder.createFolder(`${reportID} - ${cleanFinName}`);
      subFolder.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

      var subFolderUrl = subFolder.getUrl();

      if (payload.images && payload.images.length > 0) {
        payload.images.forEach(function (img, index) {
          if (img.file_data && img.file_name) {
            var bytes = Utilities.base64Decode(img.file_data);
            var blob = Utilities.newBlob(bytes, "image/png", img.file_name);
            subFolder.createFile(blob);
          }
        });
      }

      var cleanPayload = {
        report_id: reportID,
        pelapor_name: payload.pelapor_name || "Anonim",
        pelapor_contact_type: payload.pelapor_contact_type || "WhatsApp",
        pelapor_contact_val: payload.pelapor_contact_val || "-",
        scam_financial: payload.scam_financial || "-",
        scam_sosmed: payload.scam_sosmed || "-",
        nominal_loss: Number(payload.nominal_loss || 0),
        kronologi: payload.kronologi || "-",
        evidence_url: subFolderUrl,
        created_at: new Date().toISOString()
      };

      result = dbTable.insert(cleanPayload);
      return responseJSON({ status: "success", data: result });
    }

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

    return responseJSON({ status: "success", data: result });

  } catch (err) {
    return responseJSON({ status: "error", message: err.toString() });
  }
}

function pemicuIzin() {
  DriveApp.getRootFolder();
}

// ==========================================
// ENGINE MASKING & SENSOR DATA UTILIY (BACKEND)
// ==========================================

/**
 * Memproses masking satu baris data scammervault
 */
function maskScammerVaultRow(row) {
  if (!row) return row;

  // 1. Sensor Nama Pelapor
  if (row.pelapor_name) {
    row.pelapor_name = maskBackendName(row.pelapor_name);
  }

  // 2. Sensor Kontak Pelapor (E.g., "85155092922" -> "8515****922")
  if (row.pelapor_contact_val) {
    row.pelapor_contact_val = maskBackendValue(String(row.pelapor_contact_val));
  }

  // 3. Sensor Informasi Internal Finansial / Rekening Pelaku (Opsional)
  // Catatan: Sesuai logika scammervault.js Anda sebelumnya, masking rekening pelaku 
  // juga bisa dilakukan di backend ini jika Anda tidak ingin menyertakan nomor aslinya ke browser.
  if (row.scam_financial) {
    row.scam_financial = maskBackendFinancial(row.scam_financial);
  }

  return row;
}

/**
 * Sensor Nama (Contoh: "Andry Setyoso" -> "A****y S******o")
 */
function maskBackendName(name) {
  if (!name || name.toLowerCase() === "anonim" || name === "-") return "Anonim";
  var words = name.split(" ");
  var maskedWords = words.map(function (word) {
    if (word.length <= 2) return word;
    return word[0] + "*".repeat(word.length - 2) + word[word.length - 1];
  });
  return maskedWords.join(" ");
}

/**
 * Sensor Angka/Kontak (Contoh: "85155092922" -> "8515****922")
 */
function maskBackendValue(val) {
  if (!val || val === "-") return "-";
  var clean = val.trim();
  if (clean.length <= 5) return "****";

  var startLen = Math.floor(clean.length * 0.35); // Ambil 35% di awal
  var endLen = Math.floor(clean.length * 0.25);   // Ambil 25% di akhir

  var start = clean.substring(0, startLen);
  var end = clean.substring(clean.length - endLen);
  var mask = "*".repeat(clean.length - (startLen + endLen));

  return start + mask + end;
}

/**
 * Sensor Otomatis String Gabungan Finansial Pelaku di Backend
 * Format asal: "[Bank] Sea Bank - 901702697082 (Anugerah Hyang Akbar lawan)"
 * Hasil: "[Bank] Sea Bank - 9017****7082 (A******h H***g A***r l***n)"
 */
function maskBackendFinancial(finRaw) {
  if (!finRaw || finRaw === "-") return finRaw;
  try {
    var typeMatch = finRaw.match(/^\[(.*?)\]/);
    var type = typeMatch ? typeMatch[1] : "";

    let cleanStr = finRaw.replace(/^\[.*?\]\s*/, '');

    var holderMatch = cleanStr.match(/\(([^)]+)\)$/);
    var holder = holderMatch ? holderMatch[1] : "";

    cleanStr = cleanStr.replace(/\s*\([^)]+\)$/, '');

    var parts = cleanStr.split("-");
    var vendor = parts[0] ? parts[0].trim() : "";
    var number = parts[1] ? parts[1].trim() : "";

    // Lakukan Masking di Backend
    var maskedNumber = maskBackendValue(number);
    var maskedHolder = maskBackendName(holder);

    return "[" + type + "] " + vendor + " - " + maskedNumber + " (" + maskedHolder + ")";
  } catch (e) {
    return finRaw; // Kembalikan data asli jika format rusak
  }
}