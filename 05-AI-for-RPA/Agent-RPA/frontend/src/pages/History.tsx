import React, { useState, useEffect } from 'react';
import { Database, Table as TableIcon } from 'lucide-react';

const History = () => {
    const [tables, setTables] = useState<string[]>([]);
    const [selectedTable, setSelectedTable] = useState<string>('');
    const [tableData, setTableData] = useState<any[]>([]);
    const [loadingTables, setLoadingTables] = useState(true);
    const [loadingData, setLoadingData] = useState(false);

    useEffect(() => {
        const fetchTables = async () => {
            try {
                const response = await fetch('/api/database/tables');
                const result = await response.json();
                if (result.tables && result.tables.length > 0) {
                    setTables(result.tables);
                    setSelectedTable(result.tables[0]);
                }
            } catch (e) {
                console.error("Erro ao buscar tabelas:", e);
            } finally {
                setLoadingTables(false);
            }
        };
        fetchTables();
    }, []);

    useEffect(() => {
        if (!selectedTable) return;
        
        const fetchTableData = async () => {
            setLoadingData(true);
            try {
                const response = await fetch(`/api/database/tables/${selectedTable}?limit=100`);
                const result = await response.json();
                if (result.data) {
                    setTableData(result.data);
                } else {
                    setTableData([]);
                }
            } catch (e) {
                console.error("Erro ao buscar dados da tabela:", e);
            } finally {
                setLoadingData(false);
            }
        };
        fetchTableData();
    }, [selectedTable]);

    const renderTable = () => {
        if (loadingData) {
            return <div className="py-20 text-center text-white/20 uppercase font-black tracking-[0.2em] text-xs">Carregando dados...</div>;
        }
        
        if (tableData.length === 0) {
            return <div className="py-20 text-center text-white/20 uppercase font-black tracking-[0.2em] text-xs">Nenhum dado encontrado ou tabela vazia.</div>;
        }

        const columns = Object.keys(tableData[0]);

        return (
            <div className="overflow-x-auto max-h-[500px]">
                <table className="w-full text-left border-collapse relative">
                    <thead className="sticky top-0 bg-[#0a0a0a] z-10 shadow-md">
                        <tr className="border-b border-white/5 text-[10px] font-black text-white/40 uppercase tracking-widest bg-black">
                            {columns.map(col => (
                                <th key={col} className="p-4 whitespace-nowrap bg-black">{col}</th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {tableData.map((row, i) => (
                            <tr key={i} className="border-b border-white/5 hover:bg-white/[0.05] transition-colors group">
                                {columns.map(col => (
                                    <td key={col} className="p-4 text-[11px] font-mono text-white/60 whitespace-nowrap">
                                        {row[col] !== null ? String(row[col]) : 'NULL'}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        );
    };

    return (
        <div className="flex flex-col gap-6 p-8 max-w-[1400px] mx-auto h-[calc(100vh-80px)]">
            <header className="flex justify-between items-center bg-theme-card border-theme p-6 rounded-theme shrink-0">
                <div>
                    <h1 className="text-2xl font-black text-white uppercase tracking-tighter flex items-center gap-3">
                        <Database className="text-[var(--theme-primary)]" />
                        Histórico Operacional
                    </h1>
                    <p className="text-xs text-white/40 uppercase font-bold tracking-widest mt-1">
                        Visualização de Tabelas: cmapss_dataset.sqlite
                    </p>
                </div>
                <div className="flex gap-3 items-center">
                    <span className="text-[10px] text-white/40 font-bold uppercase tracking-widest mr-2">Selecione a Tabela:</span>
                    <select 
                        className="bg-black/40 border border-white/10 text-white font-mono text-xs p-3 rounded-lg outline-none min-w-[200px]"
                        value={selectedTable}
                        onChange={(e) => setSelectedTable(e.target.value)}
                        disabled={loadingTables}
                    >
                        {loadingTables ? <option>Carregando...</option> : null}
                        {tables.map(t => (
                            <option key={t} value={t}>{t}</option>
                        ))}
                    </select>
                </div>
            </header>

            <div className="bg-theme-card border-theme rounded-[2.5rem] p-8 overflow-hidden shadow-2xl relative flex flex-col flex-1 min-h-0">
                <div className="absolute inset-0 bg-gradient-to-br from-white/[0.01] to-transparent pointer-events-none" />
                
                <div className="flex items-center gap-3 mb-6 shrink-0">
                    <TableIcon className="text-[var(--theme-primary)]" size={24} />
                    <h2 className="text-lg font-black text-white uppercase tracking-wider">
                        Explorador: <span className="text-white/70 ml-2 font-mono">{selectedTable || 'Nenhuma'}</span>
                    </h2>
                </div>

                <div className="bg-black/80 rounded-2xl border border-white/5 overflow-hidden flex-1 relative flex flex-col min-h-0">
                    {renderTable()}
                </div>
                
                <div className="mt-4 text-right shrink-0">
                    <span className="text-[9px] text-white/20 font-black uppercase tracking-widest">Exibindo os primeiros 100 registros para otimização</span>
                </div>
            </div>
        </div>
    );
};

export default History;
