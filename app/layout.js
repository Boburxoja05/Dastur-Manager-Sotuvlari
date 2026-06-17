import "./globals.css";

export const metadata = {
  title: "Dastur 24 — Sotuv Dashboard",
  description: "Sales manager performance analytics",
};

export default function RootLayout({ children }) {
  return (
    <html lang="uz" className="h-full">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
