import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'

// 0. CSS PRECEDENCE
import './index.css'
import '@sarak/lib-ui-core/sarak.css'

// Imports Sarak v10.1 Sovereign
import {
    SarakUIProvider,
    SarakShell,
    registerLocalComponent
} from '@sarak/lib-ui-core';

// 1. DNA E COMPONENTES LOCAIS
import sarakManifest from './sarak.manifest.json';
import DigitalTwin from './pages/DigitalTwin';
import Catalogs from './pages/Catalogs';
import History from './pages/History';
import Knowledge from './pages/Knowledge';
import RpaPanel from './pages/RpaPanel';

const SYSTEM_ID = "DigitalTwin";
const SYSTEM_VISUAL_NAME = sarakManifest.system.name;

// Injeção de Identidade Global
(window as any).__SARAK_SYSTEM__ = SYSTEM_ID;

// 2. REGISTRO INDUSTRIAL (Plug & Play)
// Vinculamos os componentes locais aos IDs definidos no sarak.manifest.json
registerLocalComponent('digital_twin', DigitalTwin);
registerLocalComponent('catalogs', Catalogs);
registerLocalComponent('history', History);
registerLocalComponent('knowledge', Knowledge);
registerLocalComponent('rpa_panel', RpaPanel);

// 3. MOCK DE AUTENTICAÇÃO E CONTEXTO
const AuthProvider = ({ children }: any) => <>{children}</>;
const ProtectedRoute = ({ children }: any) => <>{children}</>;

const SarakApp = () => {
    return (
        <SarakShell
            brand={{
                name: SYSTEM_VISUAL_NAME,
                logo: 'https://img.icons8.com/neon/96/engine.png'
            }}
            user={{ id: 'admin', name: 'Operator', role: 'admin' }}
            token={import.meta.env.VITE_AUTH_TOKEN || ""}
            layout="sovereign"
            mode="sovereign"
        />
    );
};

const AppContent = () => {
    // Garantir que o modo soberano seja aplicado ao body
    React.useEffect(() => {
        document.body.classList.add('dark', 'sarak-sovereign');
        document.documentElement.setAttribute('data-sarak-theme', sarakManifest.design.theme);
        document.documentElement.setAttribute('data-sarak-layout', 'sovereign');
        
        // Forçar o título da página
        document.title = 'GS-RPA';
        const titleObserver = new MutationObserver(() => {
            if (document.title !== 'GS-RPA') {
                document.title = 'GS-RPA';
            }
        });
        const titleEl = document.querySelector('title');
        if (titleEl) {
            titleObserver.observe(titleEl, { childList: true, characterData: true, subtree: true });
        }

        // Vacina DOM: Forçar a ocultação da aba "Design Engine" que é nativa da lib e renomear SARAK UI
        const observer = new MutationObserver(() => {
            document.querySelectorAll('div, a, li, span').forEach(el => {
                if (el.textContent === 'Design Engine' && el.parentElement) {
                    let parent = el.closest('a') || el.closest('li') || el.parentElement;
                    if (parent) parent.style.display = 'none';
                }
                el.childNodes.forEach(node => {
                    if (node.nodeType === Node.TEXT_NODE && node.textContent) {
                        if (/SARAK UI/i.test(node.textContent)) {
                            node.textContent = node.textContent.replace(/SARAK UI/gi, 'GS-RPA');
                        }
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true, characterData: true });
        return () => observer.disconnect();
    }, []);

    return (
        <SarakUIProvider
            config={{
                systemId: SYSTEM_ID,
                design: sarakManifest.design,
                discovery: {
                    mode: 'local',
                    autoRegister: true
                }
            }}
            options={{
                manifest: sarakManifest,
                debug: true
            }}
        >
            <Routes>
                {/* Interceptar e redirecionar a rota nativa forçada pela lib */}
                <Route path="/mx-customization" element={<Navigate to="/rpa_panel" replace />} />
                <Route path="/*" element={<ProtectedRoute><SarakApp /></ProtectedRoute>} />
            </Routes>
        </SarakUIProvider>
    );
};

const App = () => {
    return (
        <BrowserRouter>
            <AuthProvider>
                <AppContent />
            </AuthProvider>
        </BrowserRouter>
    );
};

// Renderização Limpa e Única (Padrão Industrial)
const rootElement = document.getElementById('root');
if (rootElement) {
    ReactDOM.createRoot(rootElement).render(
        <React.StrictMode>
            <App />
        </React.StrictMode>,
    );
}
