interface StatCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  icon?: React.ReactNode;
  accent?: boolean;
}

export function StatCard({ label, value, subtext, icon, accent }: StatCardProps) {
  return (
    <div className={`rounded-xl border p-4.5 transition-all duration-300 hover:shadow-lg backdrop-blur-xl ${
      accent
        ? 'border-[#ffaa33]/40 bg-gradient-to-br from-[#221006]/85 via-[#140b05]/85 to-[#0b0c14]/90 shadow-[0_4px_24px_rgba(255,119,0,0.12)]'
        : 'border-white/[0.08] bg-[#0c0e17]/80 hover:border-[#ffaa33]/30 hover:shadow-[0_4px_20px_rgba(255,119,0,0.08)]'
    }`}>
      <div className="flex items-center justify-between mb-2.5">
        <div className="text-[11px] text-slate-400 uppercase tracking-widest font-mono font-medium">{label}</div>
        {icon && <div className={accent ? 'text-[#ffaa33] drop-shadow-[0_0_6px_#ff7700]' : 'text-slate-400'}>{icon}</div>}
      </div>
      <div className={`text-2xl font-bold tracking-tight font-sans ${accent ? 'text-[#ffaa33]' : 'text-white'}`}>{value}</div>
      {subtext && <div className="text-xs text-slate-400 mt-1.5 font-sans">{subtext}</div>}
    </div>
  );
}
