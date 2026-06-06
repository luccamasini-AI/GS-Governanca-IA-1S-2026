import React from 'react';
import { motion } from 'framer-motion';
import { Activity, Zap, Shield, ChevronLeft, Calendar, Database, Maximize2 } from 'lucide-react';

import { Sparkline } from './Sparkline';
import { getGlobalStatusInfo } from '../utils/status';

export const EngineSchematic = ({ engineData, datasetId, onClose, onMotorChange }: { engineData: any, datasetId: number, onClose: () => void, onMotorChange?: (newMotorId: number) => void }) => {
    const [localUnit, setLocalUnit] = React.useState<number>(engineData.unit);
    
    // Sincronizar o input com a prop se mudar externamente
    React.useEffect(() => {
        setLocalUnit(engineData.unit);
    }, [engineData.unit]);

    const sensors = ["T2", "T24", "T30", "T50", "P2", "P15", "P30", "Nf", "Nc", "epr", "Ps30", 
                   "phi", "NRf", "NRc", "BPR", "farB", "htBleed", "Nf_dmd", "PCNfR_dmd", "W31", "W32"];
    
    const displayStatus = getGlobalStatusInfo(engineData.system_status);

    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 1.05 }}
            className="w-full flex flex-col"
        >
            <div className="w-full space-y-8 flex-1">
                {/* Header */}
                <div className="flex justify-between items-start">
                    <div>
                        <button 
                            onClick={onClose}
                            className="mb-6 flex items-center gap-2 text-white/40 hover:text-white transition-colors text-xs font-bold uppercase tracking-widest"
                        >
                            <ChevronLeft size={14} /> Voltar à Lista
                        </button>
                        <h2 className="text-3xl font-black text-white uppercase tracking-tighter">
                            Gêmeo Digital: Motor #{engineData.unit} (Dataset FD00{datasetId})
                        </h2>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                    {/* Schematic Area */}
                    <div className="lg:col-span-8 bg-black/40 rounded-[3rem] border border-white/5 p-8 pb-32 relative overflow-hidden flex flex-col min-h-[700px] backdrop-blur-2xl">
                        <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)]/5 via-transparent to-transparent opacity-50" />
                        
                        {/* Time-Machine Control Panel */}
                        <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 bg-black/60 border border-white/10 p-4 rounded-[2rem] backdrop-blur-md flex items-center gap-6 shadow-2xl">
                            <div className="flex flex-col gap-1">
                                <label className="text-[8px] text-white/40 font-black uppercase tracking-widest ml-2">Unidade do Motor</label>
                                <input 
                                    type="number" 
                                    min="1"
                                    value={localUnit} 
                                    onChange={(e) => setLocalUnit(parseInt(e.target.value) || 1)}
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-24 text-white text-sm font-black outline-none focus:border-[var(--theme-primary)]"
                                />
                            </div>
                            <div className="flex flex-col gap-1">
                                <label className="text-[8px] text-white/40 font-black uppercase tracking-widest ml-2">Ciclo de Tempo</label>
                                <input 
                                    type="number" 
                                    readOnly
                                    value={engineData.cycle} 
                                    className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-28 text-white/50 text-sm font-black outline-none cursor-not-allowed"
                                />
                            </div>
                            {onMotorChange && (
                                <button 
                                    onClick={() => onMotorChange(localUnit)}
                                    className="bg-[var(--theme-primary)] text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)] mt-4"
                                >
                                    Carregar Motor
                                </button>
                            )}
                        </div>

                        <div className="w-full h-full relative z-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pr-4">
                            {sensors.map((s: string, i: number) => {
                                const val = engineData[s] || 0;
                                const hist = engineData.history[s] || [];
                                
                                const minVal = hist.length > 0 ? Math.min(...hist) : 0;
                                const maxVal = hist.length > 0 ? Math.max(...hist) : 1;
                                const range = maxVal === minVal ? 1 : maxVal - minVal;
                                const percentage = Math.max(0, Math.min(100, ((val - minVal) / range) * 100));
                                
                                return (
                                    <div key={i} className={`bg-black/60 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col justify-between ${displayStatus.bg} shadow-md hover:scale-[1.02] transition-transform`}>
                                        <div className="flex justify-between items-start mb-4">
                                            <span className="text-[11px] text-white/60 font-black uppercase tracking-widest leading-none">{s}</span>
                                        </div>

                                        <div className="flex items-center justify-between mb-4">
                                            <div className="flex items-end gap-2">
                                                <span className={`text-3xl font-black leading-none ${displayStatus.color}`}>
                                                    {val.toFixed(2)}
                                                </span>
                                            </div>
                                            
                                            <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 flex-shrink-0">
                                                <motion.div 
                                                    className="h-full rounded-full"
                                                    initial={{ width: 0 }}
                                                    animate={{ width: `${percentage}%` }}
                                                    style={{ backgroundColor: displayStatus.pulse.replace(/[\d.]+\)$/g, '1)') }}
                                                />
                                            </div>
                                        </div>

                                        <div className="mt-auto">
                                            <Sparkline data={hist.slice(-20)} color={displayStatus.pulse.replace(/[\d.]+\)$/g, '1)')} />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Metadata Area */}
                    <div className="lg:col-span-4 space-y-6">
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2 text-[var(--theme-primary)]">
                                <Zap size={14} /> Ficha de Ativo
                            </h3>
                            <div className="space-y-5">
                                {[
                                    { label: 'Fabricante', val: 'NASA' },
                                    { label: 'Modelo', val: 'TURBOFAN C-MAPSS' },
                                    { label: 'Potência', val: '50000 HP' },
                                    { label: 'Ingestão', val: 'RPA / TIME MACHINE' },
                                ].map((row, idx) => (
                                    <div key={idx} className="flex justify-between border-b border-white/5 pb-4">
                                        <span className="text-[11px] text-white/40 uppercase font-bold">{row.label}</span>
                                        <span className="text-xs text-white font-black uppercase">{row.val}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Status Global */}
                        <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-[var(--theme-primary)]">
                                <Activity size={14} /> Status Global
                            </h3>
                            
                            <div className={`p-6 ${displayStatus.bg} border ${displayStatus.border} rounded-2xl flex items-center gap-4 mb-6`}>
                                <div className={`w-3 h-3 rounded-full animate-pulse shadow-[0_0_15px_currentColor] ${displayStatus.color}`} style={{ backgroundColor: displayStatus.color.replace('text-', '') }} />
                                <div>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/50">Diagnóstico do Ativo</p>
                                    <p className={`text-lg font-black uppercase tracking-widest ${displayStatus.color}`}>{displayStatus.text}</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 mb-6">
                                <div className="bg-black/40 border border-white/5 p-6 rounded-2xl text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-2">Ciclo Atual</p>
                                    <p className="text-3xl font-black text-white">{engineData.cycle.toString().padStart(3, '0')}</p>
                                </div>
                                <div className="bg-black/40 border border-white/5 p-6 rounded-2xl text-center">
                                    <p className="text-[9px] font-black uppercase tracking-widest text-[var(--theme-primary)]/50 mb-2">Vida Útil Restante</p>
                                    <p className="text-3xl font-black text-[var(--theme-primary)]">{engineData.true_rul}</p>
                                </div>
                            </div>

                            <div className="bg-black/40 border border-white/5 p-6 rounded-2xl">
                                <p className="text-[9px] font-black uppercase tracking-widest text-white/30 mb-4 text-center">Condições Operacionais de Voo</p>
                                <div className="grid grid-cols-3 gap-2 text-center">
                                    <div>
                                        <p className="text-[8px] font-bold text-white/40 mb-1">ALTITUDE</p>
                                        <p className="text-xs font-black text-white">{engineData.op_setting_1.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold text-white/40 mb-1">MACH</p>
                                        <p className="text-xs font-black text-white">{engineData.op_setting_2.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-[8px] font-bold text-white/40 mb-1">TRA (POTÊNCIA)</p>
                                        <p className="text-xs font-black text-white">{engineData.op_setting_3.toFixed(2)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
};
