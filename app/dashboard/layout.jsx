"use client";
import "./dashboard.css";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/dashboard",              label: "Dashboard" },
  { href: "/dashboard/menejerlar",   label: "Menejerlar" },
  { href: "/dashboard/sotuvlar",     label: "Haftalik tahlil" },
  { href: "/dashboard/solishtirish", label: "Solishtirish" },
];

export default function DashboardLayout({ children }) {
  const pathname = usePathname();
  return (
    <div className="d-root">
      <header style={{
        position: "sticky", top: 0, zIndex: 40,
        borderBottom: "1px solid var(--border)",
        background: "rgba(22,27,38,.85)",
        backdropFilter: "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",
      }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 1rem", height: 56, display: "flex", alignItems: "center", gap: 16 }}>
          <Link href="/dashboard" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none", flexShrink: 0 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              display: "flex", alignItems: "center", justifyContent: "center",
              background: "linear-gradient(135deg,#5b95ff,#3f7cf2)",
              boxShadow: "0 6px 18px -6px rgba(79,140,255,.7)",
              fontFamily: "'Space Grotesk', sans-serif", fontWeight: 700, color: "#fff", fontSize: 15,
            }}>D</div>
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600, color: "var(--text)", letterSpacing: "-.025em", fontSize: 15 }}>
              Dastur 24
            </span>
          </Link>

          <nav style={{ display: "flex", alignItems: "center", gap: 4, flex: 1 }}>
            {NAV.map(n => {
              const active = n.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(n.href);
              return (
                <Link key={n.href} href={n.href} style={{
                  padding: "6px 12px", borderRadius: 8, fontSize: 14, textDecoration: "none",
                  color: active ? "var(--accent)" : "var(--muted)",
                  background: active ? "rgba(91,149,255,.15)" : "transparent",
                  fontWeight: active ? 500 : 400,
                  transition: "color .15s, background .15s",
                }}>{n.label}</Link>
              );
            })}
          </nav>

          <span style={{ fontSize: 12, color: "var(--muted)" }}>Sotuv tahlili</span>
        </div>
      </header>

      <main style={{ maxWidth: 1280, margin: "0 auto", padding: "24px 16px 96px" }}>
        {children}
      </main>
    </div>
  );
}
