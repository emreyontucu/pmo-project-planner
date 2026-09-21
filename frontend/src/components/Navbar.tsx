"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Eye, LayoutDashboard, Lock, ShieldCheck, Sparkles, UserCheck, Wrench } from "lucide-react";
import { useRole } from "@/context/RoleContext";

export default function Navbar() {
  const { role, isExecutive, setRole, toggleRole } = useRole();
  const pathname = usePathname();
  const router = useRouter();

  function handleSwitchToExecutive() {
    setRole("executive");
    if (pathname === "/") {
      router.push("/manager");
    }
  }

  function handleSwitchToPlanner() {
    setRole("planner");
    if (pathname === "/manager") {
      router.push("/");
    }
  }

  return (
    <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3 sm:px-6">
        
        {/* Brand & Left Navigation */}
        <div className="flex items-center gap-6">
          <Link
            href="/"
            onClick={() => setRole("planner")}
            className="flex items-center gap-2.5 group"
          >
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-indigo-600 to-indigo-800 text-white shadow-sm shadow-indigo-300 group-hover:scale-105 transition-transform">
              <Sparkles size={18} />
            </span>
            <div className="flex flex-col">
              <span className="text-base font-extrabold tracking-tight text-slate-900 group-hover:text-indigo-600 transition-colors">
                PMO Planner
              </span>
              <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                Kurumsal Proje Yönetimi
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-1 pl-4 border-l border-slate-200">
            <Link
              href="/"
              onClick={() => setRole("planner")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                pathname === "/" && !isExecutive
                  ? "bg-indigo-50 text-indigo-700 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              Planlama & Projeler
            </Link>
            <Link
              href="/manager"
              onClick={() => setRole("executive")}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 ${
                pathname.startsWith("/manager") || isExecutive
                  ? "bg-purple-50 text-purple-700 font-bold"
                  : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
              }`}
            >
              <Eye size={13} className="text-purple-600" />
              Yönetici Portalı
            </Link>
          </nav>
        </div>

        {/* Right: Role Switcher & Status */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex flex-col items-end text-right">
            <span className="text-[11px] text-slate-400 font-medium">Aktif Mod:</span>
            <span className="text-xs font-bold text-slate-700 flex items-center gap-1">
              {isExecutive ? (
                <>
                  <Eye size={12} className="text-purple-600" />
                  Yönetici (Salt Okunur)
                </>
              ) : (
                <>
                  <Wrench size={12} className="text-indigo-600" />
                  Planlayıcı (Tam Yetki)
                </>
              )}
            </span>
          </div>

          {/* Switch Button */}
          {isExecutive ? (
            <button
              onClick={handleSwitchToPlanner}
              className="inline-flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3.5 py-1.5 text-xs font-bold text-indigo-700 shadow-2xs hover:bg-indigo-100 hover:border-indigo-300 transition-all cursor-pointer"
            >
              <Wrench size={14} className="text-indigo-600" />
              <span>Planlayıcı Moduna Geç</span>
            </button>
          ) : (
            <button
              onClick={handleSwitchToExecutive}
              className="inline-flex items-center gap-2 rounded-xl border border-purple-200 bg-purple-50 px-3.5 py-1.5 text-xs font-bold text-purple-700 shadow-2xs hover:bg-purple-100 hover:border-purple-300 transition-all cursor-pointer"
            >
              <Eye size={14} className="text-purple-600" />
              <span>Yönetici misiniz? Geçiş Yap</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
}
