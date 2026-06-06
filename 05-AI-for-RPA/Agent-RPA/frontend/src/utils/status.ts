export const getGlobalStatusInfo = (status: string) => {
    if (status === 'Risco Crítico' || status === 'Risco Maximo') return { color: 'text-purple-500', pulse: 'rgba(168, 85, 247, 0.4)', text: status, bg: 'bg-purple-500/10', border: 'border-purple-500/20' };
    if (status === 'Perigo') return { color: 'text-rose-500', pulse: 'rgba(244, 63, 94, 0.4)', text: status, bg: 'bg-rose-500/10', border: 'border-rose-500/20' };
    if (status === 'Alerta') return { color: 'text-orange-500', pulse: 'rgba(249, 115, 22, 0.3)', text: status, bg: 'bg-orange-500/10', border: 'border-orange-500/20' };
    if (status === 'Manutenção Iminente') return { color: 'text-amber-400', pulse: 'rgba(251, 191, 36, 0.3)', text: status, bg: 'bg-amber-500/10', border: 'border-amber-500/20' };
    return { color: 'text-emerald-400', pulse: 'rgba(16, 185, 129, 0.2)', text: 'Operacional', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
};
