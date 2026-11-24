"use client";

/** Last-resort error page (the layout itself failed). No dependencies on app code. */
export default function GlobalError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="tr">
      <body style={{ margin: 0, minHeight: "100vh", display: "grid", placeItems: "center", background: "#01243C", color: "#fff", fontFamily: "system-ui, sans-serif", textAlign: "center" }}>
        <div>
          <p style={{ fontSize: 96, fontWeight: 900, color: "#E63D30", margin: 0 }}>500</p>
          <h1 style={{ fontSize: 28 }}>Bir şeyler ters gitti. / Something went wrong.</h1>
          <button onClick={reset} style={{ marginTop: 16, padding: "14px 28px", borderRadius: 999, border: 0, background: "#E63D30", color: "#fff", fontWeight: 800, fontSize: 16, cursor: "pointer" }}>
            Tekrar dene / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
