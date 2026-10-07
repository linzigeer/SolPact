"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { WalletButton } from "@/components/WalletButton";
import { LockKeyhole } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/dashboard", label: "项目" },
  { href: "/project/new", label: "创建" },
] as const;

export function AppShell({
  children,
  breadcrumb,
}: {
  children: ReactNode;
  breadcrumb?: ReactNode;
}) {
  const pathname = usePathname();
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setIsScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-primary-950 text-primary-200">
      <div className="bg-noise fixed inset-0 z-[100] pointer-events-none" />

      <nav
        className={cn(
          "fixed left-0 right-0 z-50 w-full transition-all duration-300",
          isScrolled
            ? "border-b border-primary-800 bg-primary-950/80 py-3 backdrop-blur-md"
            : "bg-transparent py-4"
        )}
      >
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center space-x-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-500/15">
              <LockKeyhole className="h-4 w-4 text-accent-400" />
            </div>
            <span className="bg-gradient-to-r from-white to-primary-400 bg-clip-text text-lg font-bold tracking-tight text-transparent">
              SolPact
            </span>
          </Link>

          <div className="hidden items-center gap-6 text-sm font-medium text-primary-400 md:flex">
            {NAV.map((item) => {
              const active =
                pathname === item.href ||
                (item.href === "/dashboard" &&
                  (pathname.startsWith("/project/") && pathname !== "/project/new"));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "transition-colors hover:text-accent-400",
                    active && "text-accent-400"
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            <WalletButton />
            {pathname === "/dashboard" && (
              <Link
                href="/project/new"
                className="hidden rounded-full bg-accent-600 px-5 py-2.5 text-sm font-bold text-white shadow-lg shadow-accent-900/40 transition-all hover:bg-accent-500 active:scale-95 sm:inline-flex"
              >
                创建项目
              </Link>
            )}
          </div>
        </div>
      </nav>

      <main className="relative mx-auto max-w-6xl px-4 pb-16 pt-24 sm:px-6 md:pt-28">
        {breadcrumb && (
          <div className="mb-4 text-sm text-primary-500">{breadcrumb}</div>
        )}
        {children}
      </main>
    </div>
  );
}
