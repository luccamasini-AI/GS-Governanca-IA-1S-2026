import React, { useState } from 'react';
import { Bot, Play, Download, AlertTriangle, CheckCircle, Clock, Database, Info, Activity, Zap, MapPin, Maximize2, X, ChevronLeft, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';
import { EngineSchematic } from '../components/EngineSchematic';
const RpaPanel = () => {
    const [simulateDate, setSimulateDate] = useState('2026-05-15');
    const [isRunning, setIsRunning] = useState(false);
    const [results, setResults] = useState<any>(null);
    const [toast, setToast] = useState<{message: string, type: 'success'|'error'} | null>(null);
    const [selectedFleet, setSelectedFleet] = useState<string | null>(null);
    const [fetchingEngine, setFetchingEngine] = useState<number | null>(null);
    const [selectedMotorData, setSelectedMotorData] = useState<any>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const runRpa = async () => {
        setIsRunning(true);
        setResults(null);
        setToast(null);
        
        try {
            let res;
            if (selectedFile) {
                const formData = new FormData();
                formData.append('simulate_date', simulateDate);
                formData.append('file', selectedFile);
                
                res = await fetch('/api/rpa/execute', {
                    method: 'POST',
                    body: formData
                });
            } else {
                res = await fetch('/api/rpa/execute', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ simulate_date: simulateDate })
                });
            }
            
            const data = await res.json();
            if (res.ok) {
                setResults(data);
                showToast("Triagem concluída com sucesso! Excel gerado.", "success");
            } else {
                showToast(data.message || "Erro na execução da automação.", "error");
            }
        } catch (e) {
            showToast("Falha de conexão com o robô.", "error");
        }
        
        setIsRunning(false);
    };

    const showToast = (message: string, type: 'success'|'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 5000);
    };

    const fetchMotorDetails = async (datasetId: number, unit: number, cycle: number) => {
        setFetchingEngine(unit);
        try {
            const res = await fetch(`/api/cmapss/query?dataset_id=${datasetId}&unit=${unit}&cycle=${cycle}`);
            const data = await res.json();
            if (res.ok && data.status === 'success') {
                setSelectedMotorData({ ...data.data, dataset_id: datasetId });
            } else {
                showToast(data.message || "Erro ao buscar telemetria do motor.", "error");
            }
        } catch (e) {
            showToast("Falha de comunicação com o simulador.", "error");
        }
        setFetchingEngine(null);
    };

    return (
        <div className="w-full h-full p-8 text-white overflow-y-auto">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        <Bot className="w-8 h-8 text-[var(--theme-primary)]" />
                        Automação RPA
                    </h1>
                    <p className="text-sm text-white/50 uppercase tracking-widest mt-1">
                        Torre de Controle · Triagem Preditiva
                    </p>
                </div>
            </div>

            {/* Config & Trigger */}
            {!selectedMotorData && (
                <div className="p-8 bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-md mb-8">
                    <div className="absolute top-0 right-0 p-32 bg-[var(--theme-primary)]/5 rounded-full blur-[100px] pointer-events-none" />
                    
                    <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
                        <Database className="w-5 h-5 text-[var(--theme-primary)]" />
                        Parâmetros da Missão (simulado)
                    </h2>
                    
                    <div className="flex flex-col md:flex-row gap-6 items-end">
                        <div className="flex-1 w-full">
                            <label className="block text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2">
                                Data Simulada de Auditoria
                            </label>
                            <input 
                                type="date" 
                                value={simulateDate}
                                onChange={(e) => setSimulateDate(e.target.value)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none transition-all font-mono"
                            />
                        </div>

                        <div className="flex-1 w-full">
                            <label className="block text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-2">
                                Upload de Novos Dados (CSV/XLSX)
                            </label>
                            <input 
                                type="file" 
                                accept=".csv,.xlsx,.xls"
                                onChange={(e) => setSelectedFile(e.target.files?.[0] || null)}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-[11px] text-white focus:border-[var(--theme-primary)] focus:ring-1 focus:ring-[var(--theme-primary)] outline-none transition-all font-mono text-xs file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-xs file:font-bold file:bg-[var(--theme-primary)] file:text-black hover:file:bg-white"
                            />
                        </div>
                        
                        <button 
                            onClick={runRpa}
                            disabled={isRunning || (!simulateDate && !selectedFile)}
                            className={`px-8 py-4 rounded-xl font-bold uppercase tracking-widest text-xs flex items-center gap-3 transition-all ${
                                isRunning 
                                ? 'bg-white/10 text-white/50 cursor-not-allowed'
                                : 'bg-[var(--theme-primary)] text-black hover:bg-white hover:text-black'
                            }`}
                        >
                            {isRunning ? (
                                <Activity className="w-5 h-5 animate-spin" />
                            ) : (
                                <Play className="w-5 h-5" />
                            )}
                            {isRunning ? 'Processando Lote...' : (selectedFile ? 'Upload & Triagem' : 'Executar Triagem Automática')}
                        </button>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center gap-4 text-xs font-medium">
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">
                            Ambiente: NASA C-MAPSS
                        </span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">
                            Motores: Turbofan
                        </span>
                        <span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-white/60">
                            Dataset: FD001 a FD004
                        </span>
                    </div>
                </div>
            )}

            {/* Results Grid */}
            <AnimatePresence>
                {results && !selectedMotorData && (
                    <motion.div 
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="space-y-8"
                    >
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            {/* Ativos */}
                            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
                                <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] text-center">Total de Motores Ativos</span>
                                <span className="text-4xl font-black text-white tracking-tighter font-mono">{results.total_active}</span>
                            </div>

                            {/* Falhas */}
                            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
                                <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] text-center">Total de Baixas (Falhas)</span>
                                <span className="text-4xl font-black text-red-500 tracking-tighter font-mono">{results.total_failed}</span>
                            </div>

                            {/* RUL Médio */}
                            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
                                <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] text-center">RUL Médio da Frota</span>
                                <span className="text-4xl font-black text-[var(--theme-primary)] tracking-tighter font-mono">{results.avg_rul} <span className="text-sm">ciclos</span></span>
                            </div>
                            
                            {/* Processamento */}
                            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-2 shadow-inner">
                                <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] text-center">Tempo de Processamento</span>
                                <span className="text-4xl font-black text-white/80 tracking-tighter font-mono">{results.processing_time} <span className="text-sm">seg</span></span>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* Matriz de Risco */}
                            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl">
                                <h3 className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-6">Distribuição de Risco (RUL)</h3>
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-green-500/10 border border-green-500/20">
                                        <span className="text-green-500 font-bold">Operacional</span>
                                        <span className="font-mono text-xl">{results.risk_distribution.operacional}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                                        <span className="text-yellow-500 font-bold">Alerta</span>
                                        <span className="font-mono text-xl">{results.risk_distribution.alerta}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-orange-500/10 border border-orange-500/20">
                                        <span className="text-orange-500 font-bold">Manutenção Iminente</span>
                                        <span className="font-mono text-xl">{results.risk_distribution.manutencao_iminente}</span>
                                    </div>
                                    <div className="flex justify-between items-center p-3 rounded-lg bg-red-500/10 border border-red-500/20">
                                        <span className="text-red-500 font-bold">Risco Crítico</span>
                                        <span className="font-mono text-xl">{results.risk_distribution.risco_critico}</span>
                                    </div>
                                </div>
                            </div>
                            
                            {/* Ações */}
                            <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex flex-col">
                                <h3 className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] mb-6">Artefatos e Ações</h3>
                                <div className="flex-1 flex flex-col justify-center items-center gap-6">
                                    <div className="flex items-center gap-3 text-white/70">
                                        <CheckCircle className="w-5 h-5 text-[var(--theme-primary)]" />
                                        <span>Auditoria salva em <b>rpa_audit_trail.log</b></span>
                                    </div>
                                    <div className="flex items-center gap-3 text-white/70">
                                        <CheckCircle className="w-5 h-5 text-[var(--theme-primary)]" />
                                        <span>Ordens de Serviço Disparadas: <b>{results.risk_distribution.risco_critico + results.risk_distribution.manutencao_iminente}</b></span>
                                    </div>
                                    
                                    <a 
                                        href={`/reports/${results.report_file}`} 
                                        download
                                        className="mt-4 w-full py-4 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 transition-all"
                                    >
                                        <Download className="w-5 h-5" />
                                        Baixar Planilha Consolidada
                                    </a>
                                    
                                    {results.dossier_file && (
                                        <a 
                                            href={`/reports/${results.dossier_file}`} 
                                            download
                                            className="w-full py-4 bg-[var(--theme-primary)] text-black hover:bg-white border border-white/10 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)]"
                                        >
                                            <Download className="w-5 h-5" />
                                            Dossiê Executivo (PDF + IA)
                                        </a>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Monitoramento de Frotas */}
                        {results.details && (
                            <div className="mt-8 space-y-4">
                                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-6">Monitoramento de Frotas</h3>
                                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-8">
                                    {['TRAIN_FD001', 'TRAIN_FD002', 'TRAIN_FD003', 'TRAIN_FD004'].map(f => {
                                        const motors = results.details.filter((d:any) => d.Frota === f);
                                        if (motors.length === 0) return null;
                                        
                                        const countCrit = motors.filter((m:any) => m.Status === 'Risco Crítico').length;
                                        const countImin = motors.filter((m:any) => m.Status === 'Manutenção Iminente').length;
                                        const countAlert = motors.filter((m:any) => m.Status === 'Alerta').length;
                                        const countOper = motors.filter((m:any) => m.Status === 'Operacional').length;
                                        
                                        const pieData = [
                                            { name: 'Operacional', value: countOper, color: '#22c55e' },
                                            { name: 'Alerta', value: countAlert, color: '#eab308' },
                                            { name: 'Iminente', value: countImin, color: '#f97316' },
                                            { name: 'Crítico', value: countCrit, color: '#ef4444' }
                                        ].filter(d => d.value > 0);

                                        let worstStatus = { text: 'Operacional', border: 'border-green-500/20' };
                                        if (countCrit > 0) worstStatus = { text: 'Risco Crítico', border: 'border-rose-500/20' };
                                        else if (countImin > 0) worstStatus = { text: 'Manutenção Iminente', border: 'border-orange-500/20' };
                                        else if (countAlert > 0) worstStatus = { text: 'Alerta', border: 'border-yellow-500/20' };

                                        return (
                                            <div 
                                                key={f} 
                                                onClick={() => {
                                                    const fleetMotors = results.details.filter((d:any) => d.Frota === f);
                                                    if (fleetMotors.length > 0) {
                                                        const firstMotor = fleetMotors[0];
                                                        fetchMotorDetails(firstMotor.dataset_id, firstMotor['Motor ID'], firstMotor.cycle);
                                                    }
                                                }}
                                                className={`group relative bg-white/5 border ${worstStatus.border} p-8 rounded-[2.5rem] hover:bg-white/[0.08] transition-all cursor-pointer shadow-2xl flex flex-col justify-between`}
                                            >
                                                <div>
                                                    <div className="flex justify-between items-start mb-8">
                                                        <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[var(--theme-primary)] group-hover:scale-110 transition-transform">
                                                            <Zap size={28} />
                                                        </div>
                                                        <div className="w-16 h-16 flex-shrink-0 relative group-hover:scale-110 transition-transform">
                                                            <ResponsiveContainer width="100%" height="100%">
                                                                <PieChart>
                                                                    <Pie
                                                                        data={pieData}
                                                                        innerRadius="60%"
                                                                        outerRadius="100%"
                                                                        dataKey="value"
                                                                        stroke="none"
                                                                    >
                                                                        {pieData.map((entry, index) => (
                                                                            <Cell key={`cell-${index}`} fill={entry.color} />
                                                                        ))}
                                                                    </Pie>
                                                                    <RechartsTooltip 
                                                                        contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px', fontSize: '10px' }}
                                                                        itemStyle={{ color: '#fff', fontSize: '12px', fontWeight: 'bold' }}
                                                                    />
                                                                </PieChart>
                                                            </ResponsiveContainer>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-2 mb-8">
                                                        <h3 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-[var(--theme-primary)] transition-colors">
                                                            FROTA {f.replace('TRAIN_', '')}
                                                        </h3>
                                                        <div className="flex items-center gap-2 text-white/40">
                                                            <MapPin size={12} />
                                                            <span className="text-[10px] font-bold uppercase tracking-widest">DATASET: {f}</span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-auto pt-6 border-t border-white/5 flex items-center justify-between">
                                                    <div className="flex flex-col">
                                                        <span className="text-[9px] font-black text-white/30 uppercase tracking-widest">Total</span>
                                                        <span className="text-lg font-black text-white">{motors.length}</span>
                                                    </div>
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[9px] font-black text-rose-500/50 uppercase tracking-widest">Críticos/Iminentes</span>
                                                        <span className="text-lg font-black text-rose-500">{countCrit + countImin}</span>
                                                    </div>
                                                </div>
                                                
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}

                        {/* Card do Relatório do Agente IA */}
                        {results.agent_report && (
                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: 0.3 }}
                                className="mt-8"
                            >
                                <div className="p-8 bg-black/40 border border-white/5 rounded-2xl relative overflow-hidden backdrop-blur-md">
                                    <div className="absolute top-0 right-0 w-64 h-64 bg-[var(--theme-primary)]/5 rounded-full blur-[120px] pointer-events-none" />
                                    
                                    <div className="flex items-center justify-between mb-6">
                                        <div className="flex items-center gap-3">
                                            <div className="p-2.5 bg-[var(--theme-primary)]/10 rounded-xl border border-[var(--theme-primary)]/20">
                                                <FileText className="w-5 h-5 text-[var(--theme-primary)]" />
                                            </div>
                                            <div>
                                                <h3 className="text-sm font-black uppercase tracking-widest text-white">
                                                    Parecer do Agente (IA Generativa)
                                                </h3>
                                                <p className="text-[10px] text-white/30 uppercase tracking-widest mt-0.5">
                                                    Análise técnica automatizada
                                                </p>
                                            </div>
                                        </div>
                                        <span className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--theme-primary)]/10 border border-[var(--theme-primary)]/20 rounded-full">
                                            <span className="w-1.5 h-1.5 bg-[var(--theme-primary)] rounded-full animate-pulse" />
                                            <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--theme-primary)]">
                                                IA
                                            </span>
                                        </span>
                                    </div>

                                    <div 
                                        className="max-h-[400px] overflow-y-auto pr-4"
                                        style={{
                                            scrollbarWidth: 'thin',
                                            scrollbarColor: 'rgba(0,255,204,0.3) transparent'
                                        }}
                                    >
                                        {results.agent_report.split('\n').map((rawLine: string, idx: number) => {
                                            const line = rawLine.trimEnd();

                                            if (!line.trim()) return <div key={idx} className="h-3" />;

                                            if (/^---+$/.test(line.trim())) {
                                                return <hr key={idx} className="border-white/10 my-4" />;
                                            }

                                            if (/^#{1,6}\s/.test(line.trim())) {
                                                const headerText = line.replace(/^#{1,6}\s*/, '').replace(/\*\*/g, '');
                                                return (
                                                    <p key={idx} className="text-white font-bold text-base mt-5 mb-2 uppercase tracking-wide border-l-2 border-[var(--theme-primary)] pl-3">
                                                        {headerText}
                                                    </p>
                                                );
                                            }

                                            if (/^\d+\.\s+[A-ZÁÉÍÓÚÃÕÊÂ]/.test(line.trim())) {
                                                const headerText = line.replace(/\*\*/g, '');
                                                return (
                                                    <p key={idx} className="text-white font-bold text-base mt-5 mb-2 uppercase tracking-wide border-l-2 border-[var(--theme-primary)] pl-3">
                                                        {headerText}
                                                    </p>
                                                );
                                            }

                                            const isBullet = /^\s*[-*•]\s/.test(line);
                                            if (isBullet) {
                                                const bulletText = line.replace(/^\s*[-*•]\s+/, '');
                                                const renderInline = (text: string) => {
                                                    const parts = text.split(/(\*\*.+?\*\*)/g);
                                                    return parts.map((part, i) => {
                                                        if (part.startsWith('**') && part.endsWith('**')) {
                                                            return <span key={i} className="text-white font-semibold">{part.slice(2, -2)}</span>;
                                                        }
                                                        return <span key={i}>{part}</span>;
                                                    });
                                                };
                                                return (
                                                    <div key={idx} className="flex items-start gap-3 mb-2 ml-2 text-[15px] text-white/70 leading-relaxed">
                                                        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-[var(--theme-primary)] flex-shrink-0" />
                                                        <span>{renderInline(bulletText)}</span>
                                                    </div>
                                                );
                                            }

                                            const renderInlineText = (text: string) => {
                                                const parts = text.split(/(\*\*.+?\*\*)/g);
                                                return parts.map((part, i) => {
                                                    if (part.startsWith('**') && part.endsWith('**')) {
                                                        return <span key={i} className="text-white font-semibold">{part.slice(2, -2)}</span>;
                                                    }
                                                    return <span key={i}>{part}</span>;
                                                });
                                            };

                                            return (
                                                <p key={idx} className="text-[15px] text-white/70 leading-relaxed mb-2">
                                                    {renderInlineText(line)}
                                                </p>
                                            );
                                        })}
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Modal de Detalhe da Frota (Tela Cheia) */}


            {/* Modal Time Machine (Digital Twin) */}
            <AnimatePresence>
                {selectedMotorData && (
                    <EngineSchematic 
                        engineData={selectedMotorData} 
                        datasetId={selectedMotorData.dataset_id} 
                        onClose={() => setSelectedMotorData(null)} 
                        onMotorChange={(newMotorId) => fetchMotorDetails(selectedMotorData.dataset_id, newMotorId, selectedMotorData.cycle)}
                    />
                )}
            </AnimatePresence>

            {/* In-App Toast Notification */}
            <AnimatePresence>
                {toast && (
                    <motion.div 
                        initial={{ opacity: 0, y: 50, x: '-50%' }}
                        animate={{ opacity: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, y: 50, x: '-50%' }}
                        className={`fixed bottom-8 left-1/2 px-6 py-4 rounded-xl border shadow-2xl flex items-center gap-3 ${
                            toast.type === 'success' 
                            ? 'bg-black/90 border-[var(--theme-primary)]/50 text-white' 
                            : 'bg-red-950 border-red-500/50 text-white'
                        }`}
                        style={{ backdropFilter: 'blur(10px)', zIndex: 9999 }}
                    >
                        {toast.type === 'success' ? <CheckCircle className="w-5 h-5 text-[var(--theme-primary)]" /> : <AlertTriangle className="w-5 h-5 text-red-500" />}
                        <span className="font-medium tracking-wide">{toast.message}</span>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default RpaPanel;
