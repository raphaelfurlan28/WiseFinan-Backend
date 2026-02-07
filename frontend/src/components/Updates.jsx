import React, { useState } from 'react';
import { RefreshCw, CheckCircle, XCircle, Terminal } from 'lucide-react';
import { getApiUrl } from '../services/api';
import './Updates.css';

export default function Updates() {
    const [loadingOptions, setLoadingOptions] = useState(false);
    const [loadingRF, setLoadingRF] = useState(false);
    const [logs, setLogs] = useState([]);

    const addLog = (msg, type = 'info') => {
        const time = new Date().toLocaleTimeString();
        setLogs(prev => [`[${time}] ${msg} `, ...prev]);
    };

    const handleUpdateOptions = async () => {
        setLoadingOptions(true);
        addLog('Iniciando atualização de Opções...', 'info');
        try {
            const res = await fetch(getApiUrl('/api/update/options'), { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                addLog('Opções atualizadas com sucesso!', 'success');
                addLog(data.output || 'Sem output', 'debug');
            } else {
                // Better error display - show all available fields
                const errorMsg = data.output || data.error || data.message || JSON.stringify(data);
                addLog(`Erro ao atualizar Opções: ${errorMsg}`, 'error');
                if (data.traceback) {
                    addLog(`Traceback: ${data.traceback}`, 'debug');
                }
            }
        } catch (err) {
            addLog(`Erro de conexão: ${err.message}`, 'error');
        } finally {
            setLoadingOptions(false);
        }
    };

    const handleUpdateRF = async () => {
        setLoadingRF(true);
        addLog('Iniciando atualização de Renda Fixa...', 'info');
        try {
            const res = await fetch(getApiUrl('/api/update/rf'), { method: 'POST' });
            const data = await res.json();

            if (res.ok) {
                addLog('Renda Fixa atualizada com sucesso!', 'success');
                addLog(data.output, 'debug');
            } else {
                addLog(`Erro ao atualizar Renda Fixa: ${data.output || data.error} `, 'error');
            }
        } catch (err) {
            addLog(`Erro de conexão: ${err.message} `, 'error');
        } finally {
            setLoadingRF(false);
        }
    };

    return (
        <div className="updates-container">
            <header className="updates-header">
                <h1>Atualizações</h1>
                <p>Execute os scripts de sincronização manual.</p>
            </header>

            <div className="actions-grid">
                <div className="action-card">
                    <h3>Renda Variável (Opções)</h3>
                    <p>Executa <code>opcoes_to_sheets_rules.py</code></p>
                    <button
                        className={`update - btn ${loadingOptions ? 'loading' : ''} `}
                        onClick={handleUpdateOptions}
                        disabled={loadingOptions || loadingRF}
                    >
                        {loadingOptions ? <RefreshCw className="spin" /> : <RefreshCw />}
                        {loadingOptions ? 'Atualizando...' : 'Atualizar Opções'}
                    </button>
                </div>

                <div className="action-card">
                    <h3>Renda Fixa (Tesouro)</h3>
                    <p>Executa <code>td_to_sheets.py</code></p>
                    <button
                        className={`update - btn ${loadingRF ? 'loading' : ''} `}
                        onClick={handleUpdateRF}
                        disabled={loadingOptions || loadingRF}
                    >
                        {loadingRF ? <RefreshCw className="spin" /> : <RefreshCw />}
                        {loadingRF ? 'Atualizando...' : 'Atualizar R. Fixa'}
                    </button>
                </div>
            </div>

            <div className="console-output">
                <div className="console-header">
                    <Terminal size={16} />
                    <span>Console Log</span>
                </div>
                <div className="console-body">
                    {logs.length === 0 && <span className="placeholder">Aguardando execução...</span>}
                    {logs.map((log, idx) => (
                        <div key={idx} className="log-line">{log}</div>
                    ))}
                </div>
            </div>
        </div>
    );
}
