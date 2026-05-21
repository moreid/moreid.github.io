// ==========================================
// DB ENGINE: REUSABLE API CLIENT (DATABASE ORM)
// ==========================================
class SheetDBClient {
    constructor(baseUrl, apiKey) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
    }

    /**
     * Helper Internal untuk eksekusi Fetch HTTP Request
     */
    async _request(table, action, method = 'GET', id = null, payload = null) {
        const params = new URLSearchParams({
            table: table,
        });

        if (action) params.append('action', action);
        if (id) params.append('id', id);

        const url = `${this.baseUrl}?${params.toString()}`;

        const options = {
            method: 'POST',
            mode: 'cors'
        };

        if (method === 'GET') {
            options.method = 'GET';
        }

        if (payload && method === 'POST') {
            // Biarkan dikirim sebagai plain text bawaan agar tidak memicu preflight check CORS
            options.body = JSON.stringify(payload);
        }

        try {
            const response = await fetch(url, options);
            if (!response.ok) throw new Error(`HTTP Error! Status: ${response.status}`);
            const result = await response.json();

            if (result.status === 'error' || result.status === 'unauthorized') {
                throw new Error(result.message || 'Terjadi kesalahan sistem API');
            }
            return result.data || result.result || result;
        } catch (error) {
            console.error(`SheetDB Client Error [${table}-${action}]:`, error);
            throw error;
        }
    }

    // --- METHOD REUSABLE YANG BISA DIPANGGIL KAPAN SAJA ---

    // Ambil Semua Data dari sebuah tabel
    async selectAll(table) {
        return await this._request(table, null, 'GET');
    }

    // Ambil Satu Data Berdasarkan ID
    async selectById(table, id) {
        return await this._request(table, null, 'GET', id);
    }

    // Ambil Data Relasi/Gabungan (Join Table)
    async selectWithJoin(table, joinAction) {
        return await this._request(table, joinAction, 'GET');
    }

    // Tambah Data Baru (Insert)
    async insert(table, dataObject) {
        return await this._request(table, 'insert', 'POST', null, dataObject);
    }

    // Perbarui Data Berdasarkan ID (Update)
    async update(table, id, dataObject) {
        return await this._request(table, 'update', 'POST', id, dataObject);
    }

    // Hapus Data Berdasarkan ID (Delete)
    async delete(table, id) {
        return await this._request(table, 'delete', 'POST', id, {});
    }
}