var API_KEY_RAHASIA = "Rahasia_Token_API_Anda_123456789_XYZ";
var SPREADSHEET_ID = "1n1i1GANLrP5BGM9foFsxvbe4P-1Kze9LuHxdka_5K0Q";

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
        var action = e.parameter.action; // insert, update, delete
        var id = e.parameter.id;

        var payload = JSON.parse(e.postData.contents);

        if (!table || !action) {
            return responseJSON({ error: "Parameter 'table' dan 'action' dibutuhkan." });
        }

        var dbTable = db.table(table);
        var result;

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

        return responseJSON({ status: "success", result: result });

    } catch (err) {
        return responseJSON({ status: "error", message: err.toString() });
    }
}