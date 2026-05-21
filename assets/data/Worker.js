export default {
    async fetch(request, env, ctx) {
        const allowedOrigins = [
            "https://moreid.github.io",          // Domain GitHub Pages Anda
            "https://moreid.github.io.test",
            "http://localhost:5500",             // VS Code Live Server
            "http://127.0.0.1:5500"              // Alternatif Localhost loopback
        ];

        // Ambil domain asal (Origin) dari header request browser
        const requestOrigin = request.headers.get("Origin");

        // Cek apakah domain pengirim ada di dalam whitelist
        const isAllowed = allowedOrigins.includes(requestOrigin);

        // Tentukan origin mana yang akan dikembalikan ke browser
        const corsOrigin = isAllowed ? requestOrigin : allowedOrigins[0];

        // Buat template header CORS universal untuk dipakai ulang pada semua response sukses/gagal
        const corsHeaders = {
            "Access-Control-Allow-Origin": corsOrigin,
            "Access-Control-Allow-Methods": "GET, POST, PATCH, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Requested-With",
            "Access-Control-Max-Age": "86400",
        };

        // 1. PENANGANAN CORS PREFLIGHT (OPTIONS)
        if (request.method === "OPTIONS") {
            return new Response(null, {
                status: 204,
                headers: corsHeaders
            });
        }

        // 2. VALIDASI KEAMANAN ORIGIN
        if (!isAllowed) {
            return new Response(JSON.stringify({ error: "Access Denied: Unauthorized Origin" }), {
                status: 403,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            });
        }

        // 3. AMBIL URL TARGET & SELIPKAN API KEY
        const gasUrl = env.GOOGLE_SCRIPT_URL;
        const apiKey = env.GOOGLE_API_KEY;

        const urlObj = new URL(request.url);
        const searchParams = urlObj.searchParams;
        searchParams.set("api_key", apiKey);

        const targetUrl = `${gasUrl}?${searchParams.toString()}`;

        // Modifikasi Request Baru. Bersihkan header sensitif agar Google Apps Script tidak bingung
        const cleanedHeaders = new Headers();
        cleanedHeaders.set("Content-Type", request.headers.get("Content-Type") || "application/json");

        const modifiedRequest = new Request(targetUrl, {
            method: request.method,
            headers: cleanedHeaders,
            body: request.method === "POST" ? await request.text() : null,
            redirect: "follow" // Biarkan Cloudflare menyelesaikan redirect 302 dari Google secara internal
        });

        try {
            const response = await fetch(modifiedRequest);

            // ⚠️ KRUSIAL: Jangan mengkloning mentah-mentah header dari Google. 
            // Buat objek header baru agar browser tidak membaca aturan CORS bawaan milik Google Server.
            const sanitizedHeaders = new Headers();

            // Salin hanya tipe konten dari Google (biasanya application/json atau text/html)
            sanitizedHeaders.set("Content-Type", response.headers.get("Content-Type") || "application/json");

            // Gabungkan header CORS yang sudah kita racik di atas
            Object.keys(corsHeaders).forEach(key => {
                sanitizedHeaders.set(key, corsHeaders[key]);
            });

            // Kembalikan data murni ke browser GitHub Pages Anda
            return new Response(response.body, {
                status: response.status,
                statusText: response.statusText,
                headers: sanitizedHeaders
            });

        } catch (error) {
            return new Response(JSON.stringify({ error: "Proxy Error: " + error.message }), {
                status: 500,
                headers: {
                    ...corsHeaders,
                    "Content-Type": "application/json"
                }
            });
        }
    },
};