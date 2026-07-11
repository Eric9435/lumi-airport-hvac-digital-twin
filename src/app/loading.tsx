import { LoaderCircle } from "lucide-react";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
      <div className="text-center">
        <LoaderCircle
          size={38}
          className="mx-auto animate-spin text-cyan-300"
        />

        <p className="mt-4 text-sm text-slate-400">
          Initializing LUMI Airport HVAC Digital Twin...
        </p>
      </div>
    </main>
  );
}
