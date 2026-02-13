"use client";
import Link from "next/link";

export default function Navbar() {
  return (
    <nav className="bg-slate-900 border-b border-slate-800 p-4 flex justify-between items-center">
      <h1 className="text-xl font-bold text-primary">
        Workout Analyzer
      </h1>
      <div className="space-x-4">
        <Link href="/" className="hover:text-primary">Home</Link>
        <Link href="/dashboard" className="hover:text-primary">Dashboard</Link>
        <Link href="/workout" className="hover:text-primary">Workout</Link>
        <Link href="/history" className="hover:text-primary">History</Link>
        <Link href="/login" className="bg-primary px-4 py-2 rounded-lg text-black font-semibold">
          Login
        </Link>
      </div>
    </nav>
  );
}
