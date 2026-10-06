import React, { useEffect } from 'react';

export function LiveToast({
  message,
  onDone,
}: {
  message: string | null;
  onDone: () => void;
}) {
  useEffect(() => {
    if (!message) return;
    const t = window.setTimeout(onDone, 2200);
    return () => clearTimeout(t);
  }, [message, onDone]);

  if (!message) return null;

  return (
    <div className="pointer-events-none fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 rounded-xl border border-cyan-500/40 bg-slate-900/95 px-4 py-2 text-[11px] font-bold text-cyan-300 shadow-lg">
      {message}
    </div>
  );
}
