import React from 'react';
import { motion } from 'framer-motion';
import { FileText, ExternalLink } from 'lucide-react';

const documents = [
    { id: 1, title: 'Damage Propagation Modeling', type: 'PDF', size: '434 KB', url: '/docs/Damage Propagation Modeling.pdf', description: 'Modelagem de propagação de danos (Dataset NASA C-MAPSS)' },
    { id: 2, title: 'README', type: 'TXT', size: '2 KB', url: '/docs/readme.txt', description: 'Informações gerais sobre o Dataset NASA C-MAPSS' }
];

const Catalogs = () => {
    return (
        <div className="p-8 space-y-8 max-w-[1400px] mx-auto">
            {/* Header */}
            <div className="flex justify-between items-end">
                <div>
                    <h1 className="text-4xl font-black text-white uppercase tracking-tighter">
                        Arquivos
                    </h1>
                    <p className="text-xs text-white/40 font-medium uppercase tracking-wider mt-1">
                        Base de Dados e Documentação Técnica do Projeto Sarak.
                    </p>
                </div>
            </div>

            {/* Document Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {documents.map((doc, index) => (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        key={doc.id}
                        className="group relative bg-black/40 border border-white/5 p-8 rounded-[2.5rem] hover:bg-white/[0.05] transition-all cursor-pointer overflow-hidden backdrop-blur-xl flex flex-col justify-between min-h-[280px]"
                        onClick={() => window.open(doc.url, '_blank')}
                    >
                        {/* Background Decoration */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-[var(--theme-primary)]/10 rounded-full blur-[50px] group-hover:bg-[var(--theme-primary)]/20 transition-all" />
                        
                        <div className="relative z-10 flex flex-col h-full justify-between flex-grow">
                            <div>
                                <div className="flex justify-between items-start mb-6">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 text-[var(--theme-primary)] group-hover:scale-110 transition-transform">
                                        <FileText size={28} />
                                    </div>
                                    <span className="px-3 py-1 bg-white/10 text-white text-[10px] font-black uppercase rounded-full border border-white/20">
                                        {doc.type}
                                    </span>
                                </div>

                                <h3 className="text-xl font-black text-white uppercase tracking-tighter mb-2 group-hover:text-[var(--theme-primary)] transition-colors">
                                    {doc.title}
                                </h3>
                                <p className="text-[10px] text-white/50 font-bold uppercase tracking-widest leading-relaxed line-clamp-3">
                                    {doc.description}
                                </p>
                            </div>

                            <div className="mt-8 pt-6 border-t border-white/5 flex items-center justify-between mt-auto">
                                <span className="text-xs font-black text-white/40 uppercase tracking-widest">{doc.size}</span>
                                <div className="flex gap-2">
                                    <button className="p-2 text-white/40 hover:text-white transition-colors" title="Visualizar Documento">
                                        <ExternalLink size={18} />
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                ))}
            </div>
        </div>
    );
};

export default Catalogs;
