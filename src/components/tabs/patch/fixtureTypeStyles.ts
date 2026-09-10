/** Styles visuels Patch par type de projecteur. */
export function getFixtureColor(type: string): string {
  switch (type) {
    case 'RGB':
      return 'from-emerald-500 to-teal-600';
    case 'Moving Head':
      return 'from-blue-500 to-indigo-600';
    case 'Laser':
      return 'from-rose-500 to-pink-600';
    case 'Effect':
      return 'from-amber-500 to-orange-600';
    default:
      return 'from-slate-500 to-slate-600';
  }
}

export function getFixtureBg(type: string): string {
  switch (type) {
    case 'RGB':
      return 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300';
    case 'Moving Head':
      return 'bg-blue-500/20 border-blue-500/40 text-blue-300';
    case 'Laser':
      return 'bg-rose-500/20 border-rose-500/40 text-rose-300';
    case 'Effect':
      return 'bg-amber-500/20 border-amber-500/40 text-amber-300';
    default:
      return 'bg-slate-500/20 border-slate-500/40 text-slate-300';
  }
}

export function getFixtureLabelBg(type: string): string {
  switch (type) {
    case 'RGB':
      return 'bg-emerald-500 text-[#05070a]';
    case 'Moving Head':
      return 'bg-blue-500 text-[#05070a]';
    case 'Laser':
      return 'bg-rose-500 text-white';
    case 'Effect':
      return 'bg-amber-500 text-[#05070a]';
    default:
      return 'bg-slate-500 text-white';
  }
}
