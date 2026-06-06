import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Activity, Thermometer, Zap, Gauge, AlertTriangle, ShieldCheck, Plus, Minus, Settings, MapPin, Save, Trash2, ChevronLeft, LayoutGrid, Box } from 'lucide-react';
import { SensorWidget } from '../components/SensorWidget';
import { getGlobalStatusInfo } from '../utils/status';
import { Sparkline } from '../components/Sparkline';

const DigitalTwin = () => {
    // Estados de Controle de Visualização: Gerencia a navegação entre Grid, Detalhes e Provisionamento
    const [viewMode, setViewMode] = useState<'grid' | 'detail' | 'provisioning'>('grid');
    const [selectedAsset, setSelectedAsset] = useState<any>(null);
    
    // Estados de Dados dos Ativos: Armazena a lista de ativos, telemetria em tempo real e histórico de 20 pontos
    const [assets, setAssets] = useState<any[]>([]);
    const [telemetry, setTelemetry] = useState<Record<string, any>>({});
    const [history, setHistory] = useState<Record<string, number[]>>({});
    const [isEditingThresholds, setIsEditingThresholds] = useState(false);
    const [editableThresholds, setEditableThresholds] = useState<Record<string, any>>({});
    
    // Estados do Time-Machine (C-MAPSS)
    const [manualUnit, setManualUnit] = useState<number>(1);
    const [manualCycle, setManualCycle] = useState<number>(15);
    const [manualRul, setManualRul] = useState<number>(0);
    const [manualStatus, setManualStatus] = useState<string>('Normal');
    const [isFetchingManual, setIsFetchingManual] = useState<boolean>(false);
    const [opSettings, setOpSettings] = useState<any>({ op1: 0, op2: 0, op3: 0 });
    
    // Estados do Formulário de Provisionamento: Dados necessários para cadastrar um novo Gêmeo Digital
    const [motorModels, setMotorModels] = useState<any[]>([]);
    const [variables, setVariables] = useState<any[]>([]);
    const [sensors, setSensors] = useState<any[]>([]);
    const [assetName, setAssetName] = useState('');
    const [location, setLocation] = useState('');
    const [selectedModelId, setSelectedModelId] = useState('');
    const [mappings, setMappings] = useState<any[]>([]);

    const fetchAssets = async () => {
        try {
            const res = await fetch('/api/assets/dashboard');
            if (res.ok) {
                setAssets(await res.json());
            } else {
                console.error("[ERROR] Falha ao carregar dashboard:", await res.text());
            }
        } catch (e) {
            console.error("[ERROR] Erro de conexão ao buscar dashboard:", e);
        }
    };

    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                const [modelsRes, varsRes, sensorsRes] = await Promise.all([
                    fetch('/api/assets/models'),
                    fetch('/api/assets/variables'),
                    fetch('/api/assets/sensors')
                ]);
                if (modelsRes.ok) setMotorModels(await modelsRes.json());
                if (varsRes.ok) setVariables(await varsRes.json());
                if (sensorsRes.ok) setSensors(await sensorsRes.json());
                await fetchAssets();
            } catch (err) {
                console.error("[ERROR] Erro no carregamento inicial de dados:", err);
            }
        };
        fetchInitialData();

        // Configuração do WebSocket: Conecta ao stream de telemetria em tempo real via protocolo seguro/inseguro
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        const wsUrl = `${protocol}//${window.location.host}/api/ws/telemetry`;
        let ws: WebSocket | null = null;

        const connectWS = () => {
            ws = new WebSocket(wsUrl);
            ws.onmessage = (event) => {
                try {
                    const data = JSON.parse(event.data);
                    const topicKey = data.topic;

                    if (topicKey) {
                        // Normalização do dado recebido (suporta múltiplos formatos de payload)
                        let val = 0;
                        if (data.value !== undefined) {
                            val = data.value;
                        } else if (data.payload && typeof data.payload === 'object' && data.payload.value !== undefined) {
                            val = data.payload.value;
                        } else {
                            val = parseFloat(data.payload) || 0;
                        }

                        // Atualiza telemetria atual e empilha novo ponto no histórico (limite de 20 pontos para performance)
                        setTelemetry(prev => ({ ...prev, [topicKey]: val }));
                        setHistory(prev => {
                            const newHistory = { ...prev };
                            const current = newHistory[topicKey] || [];
                            newHistory[topicKey] = [...current, val].slice(-20);
                            return newHistory;
                        });
                    }
                } catch (e) {}
            };
            // Reconexão automática caso o socket caia
            ws.onclose = () => setTimeout(connectWS, 3000);
        };

        connectWS();
        return () => ws?.close();
    }, []);

    // Auto-populate thresholds
    useEffect(() => {
        if (selectedModelId) {
            const model = motorModels.find(m => m.id === selectedModelId);
            if (model && model.default_thresholds) {
                const newMappings = Object.entries(model.default_thresholds).map(([varId, th]: [string, any]) => {
                    const variable = variables.find(v => v.id === varId || v.name.toLowerCase().includes(varId.toLowerCase()));
                    return {
                        variable_id: variable?.id || '',
                        sensor_id: '',
                        mqtt_topic: `telemetry/${model.model}/${varId}`,
                        nominal: th.nominal || '',
                        warning: th.warning || '',
                        critical: th.critical || ''
                    };
                });
                setMappings(newMappings);
            }
        }
    }, [selectedModelId, motorModels, variables]);

    const handleSaveAsset = async () => {
        if (!assetName || !selectedModelId) return alert("Preencha os campos obrigatórios");

        const appliedThresholds: Record<string, any> = {};
        mappings.forEach(m => {
            if (m.variable_id) {
                appliedThresholds[m.variable_id] = {
                    nominal: parseFloat(m.nominal) || null,
                    warning: parseFloat(m.warning) || null,
                    critical: parseFloat(m.critical) || null
                };
            }
        });

        try {
            const assetRes = await fetch('/api/assets/active', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name: assetName,
                    location: location,
                    motor_model_id: selectedModelId,
                    status: 'operational',
                    applied_thresholds: appliedThresholds
                })
            });

            if (assetRes.ok) {
                const newAsset = await assetRes.json();
                for (const m of mappings) {
                    await fetch('/api/assets/mappings', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            asset_id: newAsset.id,
                            variable_id: m.variable_id,
                            sensor_id: m.sensor_id,
                            mqtt_topic: m.mqtt_topic
                        })
                    });
                }
                alert("Gêmeo Digital comissionado com sucesso!");
                setViewMode('grid');
                setAssetName('');
                setLocation('');
                setSelectedModelId('');
                setMappings([]);
                fetchAssets();
            }
        } catch (err) {}
    };

    const handleDeleteAsset = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm("Tem certeza que deseja remover este Gêmeo Digital?")) return;
        try {
            const res = await fetch(`/api/assets/active/${id}`, { method: 'DELETE' });
            if (res.ok) {
                fetchAssets();
                if (selectedAsset?.id === id) setViewMode('grid');
            }
        } catch (e) {}
    };

    const fetchManualTelemetry = async () => {
        if (!selectedAsset) return;
        setIsFetchingManual(true);
        try {
            // Extrai o número do dataset a partir do nome (ex: "Frota FD003" -> 3)
            let datasetId = 1;
            const match = selectedAsset.name.match(/FD00(\d)/);
            if (match) datasetId = parseInt(match[1]);
            
            const res = await fetch(`/api/cmapss/query?dataset_id=${datasetId}&unit=${manualUnit}&cycle=${manualCycle}`);
            const data = await res.json();
            
            if (res.ok && data.status === 'success') {
                const newTelemetry = { ...telemetry };
                const newHistory = { ...history };
                // O payload data contém os sensores e status
                selectedAsset.sensors.forEach((s: any) => {
                    if (data.data[s.variable] !== undefined) {
                        newTelemetry[s.topic] = data.data[s.variable];
                        if (data.data.history && data.data.history[s.variable]) {
                            newHistory[s.topic] = data.data.history[s.variable];
                        }
                    }
                });
                setTelemetry(newTelemetry);
                setHistory(newHistory);
                setManualStatus(data.data.system_status);
                setManualRul(data.data.true_rul);
                setOpSettings({
                    op1: data.data.op_setting_1,
                    op2: data.data.op_setting_2,
                    op3: data.data.op_setting_3
                });
            } else {
                alert(data.message || "Erro ao buscar telemetria");
            }
        } catch (e) {
            console.error("Erro no fetch manual:", e);
            alert("Erro de conexão ao buscar telemetria manual");
        } finally {
            setIsFetchingManual(false);
        }
    };

    const handleUpdateThresholds = async () => {
        try {
            console.log("[DEBUG] Enviando thresholds:", editableThresholds);
            const res = await fetch(`/api/assets/active/${selectedAsset.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ applied_thresholds: editableThresholds })
            });

            if (res.ok) {
                const updatedAsset = await res.json();
                console.log("[DEBUG] Resposta do servidor:", updatedAsset);
                
                // 1. Atualiza o ativo na lista geral primeiro
                setAssets(prev => prev.map(a => a.id === updatedAsset.id ? { ...a, ...updatedAsset } : a));
                
                // 2. Atualiza o asset selecionado com os dados FRESCOS do servidor
                setSelectedAsset(prev => {
                    if (!prev || prev.id !== updatedAsset.id) return prev;
                    
                    // O backend no /dashboard retorna sensors com thresholds embutidos.
                    // O PATCH retorna o objeto ActiveAssetDB bruto (sem o join de sensors do dashboard).
                    // Então precisamos mesclar os novos applied_thresholds nos sensores atuais.
                    const newThresholdsMap = updatedAsset.applied_thresholds || {};
                    const updatedSensors = prev.sensors.map((s: any) => ({
                        ...s,
                        thresholds: newThresholdsMap[s.variable_id] || s.thresholds
                    }));

                    return { 
                        ...prev, 
                        ...updatedAsset,
                        sensors: updatedSensors
                    };
                });
                
                setIsEditingThresholds(false);
                
                // Feedback visual sutil (pode ser melhorado com toast futuramente)
                console.log("Configurações persistidas com sucesso!");
                
                // Recarrega os ativos para garantir paridade total
                setTimeout(() => fetchAssets(), 500);
            } else {
                const errorData = await res.json();
                alert(`Erro: ${errorData.detail || "Erro ao atualizar limites"}`);
            }
        } catch (err) {
            console.error("[DEBUG] Erro no PATCH:", err);
            alert("Erro de conexão com o servidor");
        }
    };

    const getStatusInfo = (val: number, thresholds: any) => {
        if (!thresholds) return { color: 'text-emerald-400', pulse: 'rgba(16, 185, 129, 0.2)', text: 'Normal', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' };
        
        const crit = thresholds.critical;
        const warn = thresholds.warning;
        
        if (crit !== undefined && val >= crit) {
            return { 
                color: 'text-rose-500', 
                pulse: 'rgba(244, 63, 94, 0.4)', 
                text: 'Perigo', 
                bg: 'bg-rose-500/10',
                border: 'border-rose-500/20'
            };
        }
        if (warn !== undefined && val >= warn) {
            return { 
                color: 'text-amber-400', 
                pulse: 'rgba(251, 191, 36, 0.3)', 
                text: 'Aviso', 
                bg: 'bg-amber-500/10',
                border: 'border-amber-500/20'
            };
        }
        return { 
            color: 'text-emerald-400', 
            pulse: 'rgba(16, 185, 129, 0.2)', 
            text: 'Normal', 
            bg: 'bg-emerald-500/10',
            border: 'border-emerald-500/20'
        };
    };

    return (
        <div className="p-8 space-y-8 max-w-[1600px] mx-auto w-full">
            {/* Dynamic Header */}
            <header className="flex justify-between items-end bg-black/20 border border-white/5 p-8 rounded-[2rem] backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                    <Box size={140} />
                </div>

                <div className="relative z-10">
                    <div className="flex items-center gap-3 mb-2">
                        <div className="w-2 h-2 rounded-full bg-[var(--theme-primary)] animate-pulse shadow-[0_0_10px_var(--theme-primary)]" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-[var(--theme-primary)]">Sovereign Asset Node</span>
                    </div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                        {viewMode === 'grid' && "Monitoramento de Gêmeos Digitais"}
                        {viewMode === 'detail' && `Gêmeo Digital: ${selectedAsset?.name}`}
                        {viewMode === 'provisioning' && "Provisionamento Industrial"}
                    </h1>
                </div>

                <div className="flex gap-4 relative z-10">
                    {viewMode !== 'grid' ? (
                        <button 
                            onClick={() => setViewMode('grid')}
                            className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all"
                        >
                            <ChevronLeft size={16} /> Voltar à Lista
                        </button>
                    ) : (
                        <button 
                            onClick={() => setViewMode('provisioning')}
                            className="flex items-center gap-3 bg-[var(--theme-primary)] hover:scale-105 active:scale-95 text-black px-8 py-4 rounded-xl text-xs font-black uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(0,255,204,0.3)]"
                        >
                            <Plus size={16} /> Novo Gêmeo Digital
                        </button>
                    )}
                </div>
            </header>

            <AnimatePresence mode="wait">
                {/* GRID VIEW */}
                {viewMode === 'grid' && (
                    <motion.div 
                        key="grid"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
                    >
                        {assets.map(asset => {
                            // Calcula o pior status entre todos os sensores do ativo (herdando lógica do Dashboard)
                            let worstStatus = { text: 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', icon: <Activity size={20} className="text-emerald-500" /> };
                            asset.sensors.forEach((s: any) => {
                                const val = telemetry[s.topic] || 0;
                                const info = getStatusInfo(val, s.thresholds);
                                if (info.text === 'Perigo') worstStatus = { ...info, icon: <Activity size={20} className="text-rose-500" /> };
                                else if (info.text === 'Aviso' && worstStatus.text !== 'Perigo') worstStatus = { ...info, icon: <Activity size={20} className="text-amber-500" /> };
                            });

                            return (
                                <div 
                                    key={asset.id} 
                                    onClick={() => { 
                                        setSelectedAsset(asset); 
                                        setEditableThresholds(asset.applied_thresholds || {});
                                        setViewMode('detail'); 
                                    }}
                                    className={`group relative bg-white/5 border ${worstStatus.border} p-8 rounded-[2.5rem] hover:bg-white/[0.08] transition-all cursor-pointer shadow-2xl flex flex-col justify-between`}
                                >
                                    <div>
                                        <div className="flex justify-between items-start mb-10">
                                            <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[var(--theme-primary)] group-hover:scale-110 transition-transform">
                                                <Zap size={28} />
                                            </div>
                                            <div className={`flex items-center gap-2 px-4 py-2 ${worstStatus.bg} rounded-full border ${worstStatus.border}`}>
                                                {worstStatus.icon}
                                                <span className={`text-[10px] font-black uppercase tracking-widest ${worstStatus.color}`}>
                                                    {worstStatus.text}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="space-y-2 mb-8">
                                            <h3 className="text-2xl font-black text-white uppercase tracking-tighter group-hover:text-[var(--theme-primary)] transition-colors">
                                                {asset.name}
                                            </h3>
                                            <div className="flex items-center gap-2 text-white/40">
                                                <MapPin size={12} />
                                                <span className="text-[10px] font-bold uppercase tracking-widest">{asset.location}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-8 border-t border-white/5 flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-black text-white/20 uppercase tracking-widest">Sensores Ativos</span>
                                            <span className="text-lg font-black text-white">{asset.sensors.length}</span>
                                        </div>
                                        
                                        <button 
                                            onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleDeleteAsset(asset.id, e);
                                            }}
                                            className="p-3 bg-red-500/10 hover:bg-red-500 text-red-500 hover:text-white rounded-xl transition-all border border-red-500/20"
                                            title="Remover Gêmeo Digital"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}

                        {assets.length === 0 && (
                            <div className="p-32 text-center border border-dashed border-white/10 bg-black/20 rounded-[3rem]">
                                <Activity size={48} className="mx-auto mb-6 text-white/10" />
                                <p className="text-white/20 uppercase font-black tracking-[0.3em] text-lg">Vácuo de Ativos Digitais</p>
                                <p className="text-white/10 text-[10px] mt-4 uppercase font-bold tracking-widest">Inicie o comissionamento industrial para gerar gêmeos digitais</p>
                            </div>
                        )}
                    </motion.div>
                )}

                {/* DETAIL VIEW (SVG MOTOR) */}
                {viewMode === 'detail' && selectedAsset && (
                    <motion.div 
                        key="detail"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.05 }}
                        className="grid grid-cols-1 lg:grid-cols-12 gap-8"
                    >
                        <div className="lg:col-span-8 bg-black/40 rounded-[3rem] border border-white/5 p-8 pb-32 relative overflow-hidden flex flex-col min-h-[700px] backdrop-blur-2xl">
                            <div className="absolute inset-0 bg-gradient-to-br from-[var(--theme-primary)]/5 via-transparent to-transparent opacity-50" />
                            

                                
                                {/* Time-Machine Control Panel */}
                                <div className="absolute bottom-12 left-1/2 -translate-x-1/2 z-30 bg-black/60 border border-white/10 p-4 rounded-[2rem] backdrop-blur-md flex items-center gap-6 shadow-2xl">
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[8px] text-white/40 font-black uppercase tracking-widest ml-2">Unidade do Motor</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={manualUnit} 
                                            onChange={(e) => setManualUnit(parseInt(e.target.value) || 1)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-24 text-white text-sm font-black outline-none focus:border-[var(--theme-primary)]"
                                        />
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <label className="text-[8px] text-white/40 font-black uppercase tracking-widest ml-2">Ciclo de Tempo</label>
                                        <input 
                                            type="number" 
                                            min="1"
                                            value={manualCycle} 
                                            onChange={(e) => setManualCycle(parseInt(e.target.value) || 1)}
                                            className="bg-white/5 border border-white/10 rounded-xl px-4 py-2 w-28 text-white text-sm font-black outline-none focus:border-[var(--theme-primary)]"
                                        />
                                    </div>
                                    <button 
                                        onClick={fetchManualTelemetry}
                                        disabled={isFetchingManual}
                                        className="bg-[var(--theme-primary)] text-black px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest hover:scale-105 transition-all shadow-[0_0_15px_rgba(0,255,204,0.3)] disabled:opacity-50 mt-4"
                                    >
                                        {isFetchingManual ? 'Buscando...' : 'Carregar Ciclo'}
                                    </button>
                                </div>
                            <div className="w-full h-full relative z-10 grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 overflow-y-auto custom-scrollbar pr-4">
                                {selectedAsset.sensors.map((s: any, i: number) => {
                                    const val = telemetry[s.topic] || 0;
                                    const hist = history[s.topic] || [];
                                    const globalStatus = getGlobalStatusInfo(manualStatus || 'Operacional');
                                    
                                    const minVal = hist.length > 0 ? Math.min(...hist) : 0;
                                    const maxVal = hist.length > 0 ? Math.max(...hist) : 1;
                                    const range = maxVal === minVal ? 1 : maxVal - minVal;
                                    const percentage = Math.max(0, Math.min(100, ((val - minVal) / range) * 100));
                                    
                                    return (
                                        <div key={i} className={`bg-black/60 backdrop-blur-md border border-white/5 p-5 rounded-2xl flex flex-col justify-between ${globalStatus.bg} shadow-md hover:scale-[1.02] transition-transform`}>
                                            <div className="flex justify-between items-start mb-4">
                                                <span className="text-[11px] text-white/60 font-black uppercase tracking-widest leading-none">{s.variable}</span>
                                            </div>

                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-end gap-2">
                                                    <span className={`text-3xl font-black leading-none ${globalStatus.color}`}>
                                                        {val.toFixed(2)}
                                                    </span>
                                                    <span className="text-[10px] text-white/30 font-bold mb-1">{s.unit}</span>
                                                </div>
                                                
                                                {/* Horizontal Load Bar */}
                                                <div className="w-16 h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 flex-shrink-0">
                                                    <motion.div 
                                                        className="h-full rounded-full"
                                                        initial={{ width: 0 }}
                                                        animate={{ width: `${percentage}%` }}
                                                        style={{ backgroundColor: globalStatus.pulse.replace(/[\d.]+\)$/g, '1)') }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="mt-auto">
                                                <Sparkline data={hist} color={globalStatus.pulse.replace(/[\d.]+\)$/g, '1)')} />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>

                        <div className="lg:col-span-4 space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl">
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2 text-[var(--theme-primary)]">
                                    <Zap size={14} /> Ficha de Ativo
                                </h3>
                                <div className="space-y-5">
                                    {[
                                        { label: 'Fabricante', val: selectedAsset.motor_model?.brand || 'GENERIC' },
                                        { label: 'Modelo', val: selectedAsset.motor_model?.model || '--' },
                                        { label: 'Potência', val: `${selectedAsset.motor_model?.power_hp} HP` },
                                        { label: 'Ingestão', val: 'Simulador Local C-MAPSS' },
                                    ].map((row, idx) => (
                                        <div key={idx} className="flex justify-between border-b border-white/5 pb-4">
                                            <span className="text-[11px] text-white/40 uppercase font-bold">{row.label}</span>
                                            <span className="text-xs text-white font-black uppercase">{row.val}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                            
                            {/* Global Asset Status (Moved from charts) */}
                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-10 backdrop-blur-xl">
                                <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-6 flex items-center gap-2 text-[var(--theme-primary)]">
                                    <Activity size={14} /> Status Global
                                </h3>
                                {(() => {
                                    let worst = { text: 'Normal', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', pulse: 'rgba(16, 185, 129, 0.4)' };
                                    selectedAsset.sensors.forEach((s: any) => {
                                        const val = telemetry[s.topic] || 0;
                                        const info = getStatusInfo(val, s.thresholds);
                                        if (info.text === 'Perigo') worst = { ...info, pulse: 'rgba(244, 63, 94, 0.4)' };
                                        else if (info.text === 'Aviso' && worst.text !== 'Perigo') worst = { ...info, pulse: 'rgba(249, 115, 22, 0.4)' };
                                    });
                                    const displayStatus = manualStatus !== 'Normal' ? getGlobalStatusInfo(manualStatus) : worst;
                                    
                                    return (
                                        <div className={`p-6 ${displayStatus.bg} border ${displayStatus.border} rounded-2xl flex items-center gap-4`}>
                                            <div className={`w-3 h-3 rounded-full ${displayStatus.color.replace('text-', 'bg-')} animate-pulse`} style={{ boxShadow: `0 0 15px ${displayStatus.pulse}` }} />
                                            <div className="flex flex-col">
                                                <span className="text-[10px] text-white/50 font-black uppercase tracking-widest mb-1">Diagnóstico do Ativo</span>
                                                <span className={`text-xl font-black ${displayStatus.color} uppercase tracking-tighter leading-none`}>
                                                    {displayStatus.text}
                                                </span>
                                            </div>
                                        </div>
                                    );
                                })()}
                                
                                {/* Current Batch/Cycle Info & RUL */}
                                <div className="mt-6 grid grid-cols-2 gap-4">
                                    <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-inner relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                                        <span className="text-[8px] text-white/40 font-black uppercase tracking-[0.2em] z-10 text-center">Ciclo Atual</span>
                                        <span className="text-3xl font-black text-white tracking-tighter z-10 font-mono">
                                            {String(manualCycle).padStart(3, '0')}
                                        </span>
                                    </div>
                                    
                                    <div className="p-6 bg-black/40 border border-white/5 rounded-2xl flex flex-col items-center justify-center gap-1 shadow-inner relative overflow-hidden">
                                        <div className="absolute inset-0 bg-gradient-to-bl from-[var(--theme-primary)]/10 to-transparent pointer-events-none" />
                                        <span className="text-[8px] text-[var(--theme-primary)] opacity-80 font-black uppercase tracking-[0.2em] z-10 text-center">Vida Útil Restante</span>
                                        <span className="text-3xl font-black text-[var(--theme-primary)] tracking-tighter z-10 font-mono">
                                            {manualRul}
                                        </span>
                                    </div>
                                </div>

                                {/* Operational Settings */}
                                <div className="mt-6 bg-black/40 border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden flex flex-col gap-4">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[var(--theme-primary)]/5 to-transparent pointer-events-none" />
                                    <span className="text-[10px] text-white/40 font-black uppercase tracking-[0.2em] z-10 text-center">Condições Operacionais de Voo</span>
                                    
                                    <div className="grid grid-cols-3 gap-4 z-10">
                                        <div className="flex flex-col items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Altitude</span>
                                            <span className="text-lg font-black text-white font-mono">{opSettings.op1}</span>
                                        </div>
                                        <div className="flex flex-col items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">Mach</span>
                                            <span className="text-lg font-black text-white font-mono">{opSettings.op2}</span>
                                        </div>
                                        <div className="flex flex-col items-center bg-white/5 p-3 rounded-xl border border-white/5">
                                            <span className="text-[8px] text-white/30 uppercase font-black tracking-widest mb-1">TRA (Potência)</span>
                                            <span className="text-lg font-black text-white font-mono">{opSettings.op3}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* PROVISIONING VIEW */}
                {viewMode === 'provisioning' && (
                    <motion.div 
                        key="provisioning"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 1.02 }}
                        className="grid grid-cols-1 lg:grid-cols-2 gap-10"
                    >
                        <div className="bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-xl flex flex-col gap-10 shadow-2xl">
                            <div className="flex items-center gap-5">
                                <div className="p-5 bg-[var(--theme-primary)]/10 rounded-[1.5rem] text-[var(--theme-primary)]">
                                    <Zap size={32} />
                                </div>
                                <div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">DNA do Ativo</h3>
                                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Identidade e Localização Física</p>
                                </div>
                            </div>

                            <div className="space-y-8">
                                <div className="flex flex-col gap-3">
                                    <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Tag de Identificação</label>
                                    <input 
                                        value={assetName}
                                        onChange={(e) => setAssetName(e.target.value)}
                                        className="bg-black/40 border border-white/5 p-6 rounded-[1.2rem] text-white text-lg font-bold outline-none focus:border-[var(--theme-primary)] focus:bg-black/60 transition-all placeholder:text-white/10"
                                        placeholder="Ex: MOTOR_001"
                                    />
                                </div>
                                <div className="flex flex-col gap-3">
                                    <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Ponto de Instalação</label>
                                    <div className="relative group">
                                        <MapPin className="absolute left-6 top-1/2 -translate-y-1/2 text-white/20 group-focus-within:text-[var(--theme-primary)] transition-colors" size={24} />
                                        <input 
                                            value={location}
                                            onChange={(e) => setLocation(e.target.value)}
                                            className="w-full bg-black/40 border border-white/5 p-6 pl-16 rounded-[1.2rem] text-white font-bold outline-none focus:border-[var(--theme-primary)] focus:bg-black/60 transition-all placeholder:text-white/10"
                                            placeholder="Setor / Ala / Pavimento"
                                        />
                                    </div>
                                </div>
                                <div className="flex flex-col gap-3">
                                    <label className="text-[11px] font-black text-white/30 uppercase tracking-[0.2em] ml-2">Modelo do Catálogo</label>
                                    <select 
                                        value={selectedModelId}
                                        onChange={(e) => setSelectedModelId(e.target.value)}
                                        className="w-full bg-black/40 border border-white/5 p-6 rounded-[1.2rem] text-white font-bold outline-none focus:border-[var(--theme-primary)] focus:bg-black/60 transition-all appearance-none"
                                    >
                                        <option value="" className="bg-zinc-900">Selecione o Hardware...</option>
                                        {motorModels.map(m => (
                                            <option key={m.id} value={m.id} className="bg-zinc-900">{m.brand} {m.model} ({m.power_hp} HP)</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className={`bg-white/5 border border-white/10 p-12 rounded-[3rem] backdrop-blur-xl flex flex-col gap-8 shadow-2xl transition-all ${!selectedModelId ? 'opacity-30 blur-[2px] pointer-events-none' : ''}`}>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-5">
                                    <div className="p-5 bg-blue-500/10 rounded-[1.5rem] text-blue-400">
                                        <Settings size={32} />
                                    </div>
                                    <div>
                                        <h3 className="text-2xl font-black text-white uppercase tracking-tight">IOT Mapping</h3>
                                        <p className="text-[10px] text-white/40 font-bold uppercase tracking-[0.2em]">Canais de Telemetria e Limites</p>
                                    </div>
                                </div>
                                <button 
                                    onClick={() => setMappings([...mappings, { variable_id: '', sensor_id: '', mqtt_topic: '', nominal: '', warning: '', critical: '' }])}
                                    className="p-4 bg-white/5 hover:bg-white/10 text-white rounded-[1.2rem] transition-all border border-white/5"
                                >
                                    <Plus size={24} />
                                </button>
                            </div>

                            <div className="flex flex-col gap-6 overflow-y-auto max-h-[500px] pr-4 custom-scrollbar">
                                {mappings.map((m, i) => (
                                    <div key={i} className="bg-black/40 border border-white/5 p-8 rounded-[2rem] flex flex-col gap-6 hover:border-white/10 transition-all">
                                        <div className="grid grid-cols-2 gap-4">
                                            <select 
                                                value={m.variable_id}
                                                onChange={(e) => {
                                                    const newM = [...mappings];
                                                    newM[i].variable_id = e.target.value;
                                                    setMappings(newM);
                                                }}
                                                className="bg-black/60 border border-white/5 p-4 rounded-xl text-[10px] text-white font-black uppercase outline-none focus:border-[var(--theme-primary)]"
                                            >
                                                <option value="">Variável</option>
                                                {variables.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
                                            </select>
                                            <select 
                                                value={m.sensor_id}
                                                onChange={(e) => {
                                                    const newM = [...mappings];
                                                    newM[i].sensor_id = e.target.value;
                                                    setMappings(newM);
                                                }}
                                                className="bg-black/60 border border-white/5 p-4 rounded-xl text-[10px] text-white font-black uppercase outline-none focus:border-[var(--theme-primary)]"
                                            >
                                                <option value="">Hardware</option>
                                                {sensors.map(s => <option key={s.id} value={s.id}>{s.model_name}</option>)}
                                            </select>
                                        </div>
                                        
                                        <input 
                                            value={m.mqtt_topic}
                                            onChange={(e) => {
                                                const newM = [...mappings];
                                                newM[i].mqtt_topic = e.target.value;
                                                setMappings(newM);
                                            }}
                                            className="bg-black/60 border border-white/5 p-4 rounded-xl text-[10px] text-[var(--theme-primary)] font-black outline-none placeholder:text-white/10"
                                            placeholder="Tópico de Dados"
                                        />

                                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                            {[
                                                { l: 'Nominal', f: 'nominal', c: 'text-emerald-400', bg: 'bg-emerald-500/5' },
                                                { l: 'Atenção', f: 'warning', c: 'text-amber-400', bg: 'bg-amber-500/5' },
                                                { l: 'Crítico', f: 'critical', c: 'text-rose-500', bg: 'bg-rose-500/5' }
                                            ].map(field => (
                                                <div key={field.f} className={`p-3 rounded-xl ${field.bg} border border-white/5`}>
                                                    <label className="text-[8px] font-black text-white/20 uppercase tracking-widest block text-center mb-2">{field.l}</label>
                                                    <div className="flex items-center justify-between gap-1">
                                                        <motion.button
                                                            whileTap={{ scale: 0.8 }}
                                                            onClick={() => {
                                                                const newM = [...mappings];
                                                                const val = parseFloat(newM[i][field.f]) || 0;
                                                                newM[i][field.f] = Math.max(0, val - 1).toString();
                                                                setMappings(newM);
                                                            }}
                                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/20 hover:text-white transition-colors"
                                                        >
                                                            <Minus size={10} />
                                                        </motion.button>

                                                        <input 
                                                            value={m[field.f]}
                                                            onChange={(e) => {
                                                                const newM = [...mappings];
                                                                newM[i][field.f] = e.target.value;
                                                                setMappings(newM);
                                                            }}
                                                            type="number"
                                                            className={`w-full bg-transparent text-center text-[10px] ${field.c} font-black outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none`}
                                                        />

                                                        <motion.button
                                                            whileTap={{ scale: 0.8 }}
                                                            onClick={() => {
                                                                const newM = [...mappings];
                                                                const val = parseFloat(newM[i][field.f]) || 0;
                                                                newM[i][field.f] = (val + 1).toString();
                                                                setMappings(newM);
                                                            }}
                                                            className="p-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-white/20 hover:text-white transition-colors"
                                                        >
                                                            <Plus size={10} />
                                                        </motion.button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            <button 
                                disabled={!selectedModelId || !assetName}
                                onClick={handleSaveAsset}
                                className="w-full mt-auto flex items-center justify-center gap-4 bg-[var(--theme-primary)] hover:shadow-[0_0_30px_rgba(0,255,204,0.3)] active:scale-[0.98] text-black p-6 rounded-[1.5rem] text-sm font-black uppercase tracking-[0.2em] transition-all disabled:opacity-10"
                            >
                                <Save size={20} /> Comissionar Gêmeo Digital
                            </button>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default DigitalTwin;
