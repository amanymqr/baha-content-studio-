"use client";

// Last-resort page when the root layout itself fails (for example the account
// file can't be read). It replaces the whole document, so it carries its own
// <html> and plain styles, and shows both languages.

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="ar" dir="rtl">
      <body style={{ fontFamily: "system-ui, sans-serif", background: "#f7f5f0", color: "#1c1b19", margin: 0, display: "grid", minHeight: "100vh", placeItems: "center", padding: 24 }}>
        <main role="alert" style={{ maxWidth: 520, background: "#fff", border: "1px solid #e6e1d6", borderRadius: 16, padding: 32, textAlign: "center", lineHeight: 1.7 }}>
          <h1 style={{ fontSize: 22, margin: "0 0 8px" }}>صار خطأ بالتطبيق</h1>
          <p style={{ margin: "0 0 16px" }}>
            إذا كان السبب ملف بيانات تالف بمجلد data/، فالملف ما انكتب عليه. التفاصيل بسجل الخادم، وبتقدري تستعيدي نسخة احتياطية بـ npm run restore-backup.
          </p>
          <p dir="ltr" style={{ margin: "0 0 16px", color: "#5c574d" }}>
            The app hit an error. If a data file in data/ is damaged, it was not written over. Details are in the server log; a backup can be restored with npm run restore-backup.
          </p>
          {error.digest && <p dir="ltr" style={{ fontSize: 12, color: "#8a8478" }}>ref: {error.digest}</p>}
          <button type="button" onClick={reset} style={{ height: 40, padding: "0 18px", borderRadius: 8, border: 0, background: "#1f6f5c", color: "#fff", cursor: "pointer" }}>
            جرّبي كمان مرة · Try again
          </button>
        </main>
      </body>
    </html>
  );
}
