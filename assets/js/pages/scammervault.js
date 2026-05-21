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

document.addEventListener('DOMContentLoaded', () => {
});
