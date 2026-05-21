export default {
    async fetch(request, env, ctx) {
        const allowedOrigins = [
            "https://moreid.github.io",
            "http://localhost:5500",
            "http://127.0.0.1:5500"
        ];

        const requestOrigin = request.headers.get("Origin");
        const isAllowed = allowedOrigins.includes(requestOrigin);
        const corsOrigin = isAllowed ? requestOrigin : allowedOrigins[0];

        const corsHeaders = {
            "Access-Control-Allow-Origin": corsOrigin,
            "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type, Authorization",
            "Access-Control-Max-Age": "86400",
        };

        if (request.method === "OPTIONS") {
            return new Response(null, { status: 204, headers: corsHeaders });
        }

        if (!isAllowed) {
            return new Response(JSON.stringify({ error: "Access Denied" }), { status: 403, headers: corsHeaders });
        }

        const gasUrl = env.GOOGLE_SCRIPT_URL;
        const apiKey = env.GOOGLE_API_KEY;
        const urlObj = new URL(request.url);
        const action = urlObj.searchParams.get("action");

        // ==========================================
        // LOGIC 1: DAFTAR AKUN BARU (REGISTER)
        // ==========================================
        if (request.method === "POST" && action === "register") {
            try {
                const payload = await request.json();
                const { username, email, password } = payload;

                if (!username || !email || !password) {
                    return new Response(JSON.stringify({ status: "error", message: "Semua field harus diisi." }), { status: 400, headers: corsHeaders });
                }

                // Cek dulu apakah email sudah terdaftar di Google Sheets
                const checkUrl = `${gasUrl}?api_key=${apiKey}&table=users`;
                const resCheck = await fetch(checkUrl);
                const usersData = await resCheck.json();

                if (usersData.status === "success" && Array.isArray(usersData.data)) {
                    const isExist = usersData.data.some(u => u.email.toLowerCase() === email.toLowerCase() || u.username.toLowerCase() === username.toLowerCase());
                    if (isExist) {
                        return new Response(JSON.stringify({ status: "error", message: "Username atau Email sudah terdaftar." }), { status: 400, headers: corsHeaders });
                    }
                }

                // Generate Salt unik & Hash Password menggunakan SHA-256 (Aman & Ringan di Worker)
                const salt = crypto.randomUUID().split("-")[0]; // Ambil string pendek acak
                const passwordHash = await hashPassword(password, salt);

                // Kirim data yang sudah diamankan ke Google Sheets
                const insertUrl = `${gasUrl}?api_key=${apiKey}&table=users&action=insert`;
                const gasResponse = await fetch(insertUrl, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                        username: username,
                        email: email.toLowerCase(),
                        password_hash: passwordHash,
                        salt: salt
                    })
                });

                const gasResult = await gasResponse.json();
                return new Response(JSON.stringify(gasResult), { headers: { ...corsHeaders, "Content-Type": "application/json" } });

            } catch (err) {
                return new Response(JSON.stringify({ status: "error", message: err.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ==========================================
        // LOGIC 2: MASUK AKUN (LOGIN)
        // ==========================================
        if (request.method === "POST" && action === "login") {
            try {
                const payload = await request.json();
                const { email, password } = payload;

                // Ambil daftar user dari Google Sheet via proxy internal
                const getUrl = `${gasUrl}?api_key=${apiKey}&table=users`;
                const resGas = await fetch(getUrl);
                const usersData = await resGas.json();

                if (usersData.status !== "success" || !Array.isArray(usersData.data)) {
                    return new Response(JSON.stringify({ status: "error", message: "Database error." }), { status: 500, headers: corsHeaders });
                }

                // Cari user berdasarkan email
                const user = usersData.data.find(u => u.email.toLowerCase() === email.toLowerCase());
                if (!user) {
                    return new Response(JSON.stringify({ status: "error", message: "Email atau Password salah." }), { status: 400, headers: corsHeaders });
                }

                // Rekonstruksi Hash Password kiriman user dengan Salt yang tersimpan di baris DB Sheet
                const incomingHash = await hashPassword(password, user.salt);

                if (incomingHash === user.password_hash) {
                    // Berhasil Login! Buat session token sederhana berdurasi 1 hari
                    const sessionToken = btoa(JSON.stringify({ uid: user.id, exp: Date.now() + 86400000 }));

                    return new Response(JSON.stringify({
                        status: "success",
                        message: "Login Berhasil!",
                        user: { username: user.username, email: user.email, token: sessionToken }
                    }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
                } else {
                    return new Response(JSON.stringify({ status: "error", message: "Email atau Password salah." }), { status: 400, headers: corsHeaders });
                }

            } catch (err) {
                return new Response(JSON.stringify({ status: "error", message: err.message }), { status: 500, headers: corsHeaders });
            }
        }

        // ==========================================
        // DEFIULT PROXY JALUR UTAMA (Sesuai kode lama Anda)
        // ==========================================
        const searchParams = urlObj.searchParams;
        searchParams.set("api_key", apiKey);
        const targetUrl = `${gasUrl}?${searchParams.toString()}`;

        const cleanedHeaders = new Headers();
        cleanedHeaders.set("Content-Type", request.headers.get("Content-Type") || "application/json");

        const modifiedRequest = new Request(targetUrl, {
            method: request.method,
            headers: cleanedHeaders,
            body: request.method === "POST" ? await request.text() : null,
            redirect: "follow"
        });

        try {
            const response = await fetch(modifiedRequest);
            const sanitizedHeaders = new Headers();
            sanitizedHeaders.set("Content-Type", response.headers.get("Content-Type") || "application/json");
            Object.keys(corsHeaders).forEach(key => sanitizedHeaders.set(key, corsHeaders[key]));

            return new Response(response.body, { status: response.status, headers: sanitizedHeaders });
        } catch (error) {
            return new Response(JSON.stringify({ error: "Proxy Error: " + error.message }), { status: 500, headers: corsHeaders });
        }
    }
};

// --- CRYPTO HELPER FUNCTION ---
async function hashPassword(password, salt) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password + salt);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
}