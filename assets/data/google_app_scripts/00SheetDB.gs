var SheetDB = (function () {
  function connect(spreadsheetId) {
    var ss = spreadsheetId ? SpreadsheetApp.openById(spreadsheetId) : SpreadsheetApp.getActiveSpreadsheet();

    return {
      table: function (sheetName) {
        var sheet = ss.getSheetByName(sheetName);
        if (!sheet) {
          throw new Error("Tabel/Sheet '" + sheetName + "' tidak ditemukan.");
        }

        var dataRange = sheet.getDataRange();
        var values = dataRange.getValues();
        var headers = values[0];

        // Helper: Mengubah row array menjadi Object JSON
        function toObject(row) {
          var obj = {};
          headers.forEach(function (header, index) {
            obj[header] = row[index];
          });
          return obj;
        }

        return {
          // 1. READ ALL WITH JOIN SUPPORT
          get: function (options) {
            var rows = values.slice(1);
            var results = rows.map(toObject);

            // Fitur Join Table
            if (options && options.join) {
              var joinOpt = options.join; // { with: 'table', localKey: 'id', foreignKey: 'id', as: 'alias' }
              var foreignData = connect(spreadsheetId).table(joinOpt.with).get();

              results = results.map(function (mainRow) {
                mainRow[joinOpt.as] = foreignData.filter(function (fRow) {
                  return fRow[joinOpt.foreignKey] == mainRow[joinOpt.localKey];
                });
                return mainRow;
              });
            }
            return results;
          },

          // 2. READ BY ID
          find: function (id) {
            var rows = values.slice(1);
            for (var i = 0; i < rows.length; i++) {
              if (rows[i][0] == id) { // Asumsi ID selalu di kolom pertama (indeks 0)
                return toObject(rows[i]);
              }
            }
            return null;
          },

          // 3. CREATE (INSERT)
          insert: function (dataObject) {
            var newId = values.length > 1 ? Number(values[values.length - 1][0]) + 1 : 1; // Auto Increment ID
            var now = new Date().toISOString();

            dataObject.id = newId;
            dataObject.created_at = now;
            dataObject.updated_at = now;

            var newRow = headers.map(function (header) {
              return dataObject[header] !== undefined ? dataObject[header] : "";
            });

            sheet.appendRow(newRow);
            return dataObject;
          },

          // 4. UPDATE
          update: function (id, dataObject) {
            var rows = values.slice(1);
            var now = new Date().toISOString();

            for (var i = 0; i < rows.length; i++) {
              if (rows[i][0] == id) {
                var rowIndex = i + 2; // +2 karena indeks array mulai 0 dan terpotong header

                headers.forEach(function (header, colIndex) {
                  if (header === "id" || header === "created_at") return; // Jangan update ID & created_at
                  if (header === "updated_at") {
                    sheet.getRange(rowIndex, colIndex + 1).setValue(now);
                  } else if (dataObject[header] !== undefined) {
                    sheet.getRange(rowIndex, colIndex + 1).setValue(dataObject[header]);
                  }
                });
                return { status: "success", message: "Data ID " + id + " berhasil diperbarui." };
              }
            }
            throw new Error("Data dengan ID " + id + " tidak ditemukan.");
          },

          // 5. DELETE
          delete: function (id) {
            var rows = values.slice(1);
            for (var i = 0; i < rows.length; i++) {
              if (rows[i][0] == id) {
                var rowIndex = i + 2;
                sheet.deleteRow(rowIndex);
                return { status: "success", message: "Data ID " + id + " berhasil dihapus." };
              }
            }
            throw new Error("Data dengan ID " + id + " tidak ditemukan.");
          }
        };
      }
    };
  }

  return { connect: connect };
})();