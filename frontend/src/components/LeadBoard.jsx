import React, { useState, useEffect } from 'react';
import { Users, Search, RefreshCw, Trash2, Filter, AlertTriangle, CheckCircle, Clock, Archive } from 'lucide-react';
import { getApiUrl } from '../services/api';
import './LeadBoard.css';

const PAYMENT_STATUSES = {
    pending: { label: 'Pendente', color: '#f59e0b' },
    approved: { label: 'Aprovado', color: '#4ade80' },
    failed: { label: 'Falhou', color: '#ef4444' },
    refunded: { label: 'Estornado', color: '#94a3b8' }
};

const CRM_STATUSES = {
    new: { label: 'Novo', color: '#3b82f6' },
    contacted: { label: 'Em Contato', color: '#f59e0b' },
    negotiating: { label: 'Negociando', color: '#8b5cf6' },
    converted: { label: 'Convertido', color: '#10b981' },
    lost: { label: 'Perdido', color: '#ef4444' },
    archived: { label: 'Arquivado', color: '#64748b' }
};

const PLAN_PRICES = {
    'Mensal': 'R$ 49,90',
    'Semestral': 'R$ 239,40',
    'Anual': 'R$ 418,80'
};

const LeadBoard = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPayment, setFilterPayment] = useState('all');
    const [filterCRM, setFilterCRM] = useState('all');
    const [showArchived, setShowArchived] = useState(false);
    const [updating, setUpdating] = useState(null);
    const [manualEmail, setManualEmail] = useState('');

    useEffect(() => {
        fetchLeads();
    }, [showArchived]);

    const handleManualReset = async (e) => {
        e.preventDefault();
        if (!manualEmail) return;
        if (!window.confirm(`Deseja resetar o dispositivo vinculado para o usuário ${manualEmail}?`)) return;

        setUpdating('manual');
        try {
            const res = await fetch(getApiUrl('/api/admin/reset-device'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: manualEmail })
            });
            const data = await res.json();
            if (res.ok) {
                alert('Dispositivo resetado com sucesso!');
                setManualEmail('');
            } else {
                alert('Erro ao resetar: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (err) {
            console.error('Error resetting device:', err);
            alert('Erro de conexão.');
        } finally {
            setUpdating(null);
        }
    };

    const fetchLeads = async () => {
        setLoading(true);
        try {
            // Fetch leads with archived filter logic handled either by backend or client
            const res = await fetch(getApiUrl(`/api/admin/leads?include_archived=${showArchived}`));
            const data = await res.json();
            if (Array.isArray(data)) {
                // Client-side filtering as fallback if backend logic is transitional
                const filtered = showArchived
                    ? data
                    : data.filter(l => l.crm_status !== 'archived');
                setLeads(filtered);
            }
        } catch (error) {
            console.error('Error fetching leads:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleStatusChange = async (leadId, field, value) => {
        setUpdating(leadId);
        try {
            const res = await fetch(getApiUrl(`/api/admin/leads/${leadId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field, value })
            });
            const data = await res.json();
            if (data.success) {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, [field]: value } : l));
            }
        } catch (err) {
            console.error('Error updating lead:', err);
        } finally {
            setUpdating(null);
        }
    };

    const handleArchive = async (leadId) => {
        if (!window.confirm('Deseja arquivar este lead? Ele sairá da lista principal.')) return;

        setUpdating(leadId);
        try {
            const res = await fetch(getApiUrl(`/api/admin/leads/${leadId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: 'crm_status', value: 'archived' })
            });
            const data = await res.json();
            if (data.success) {
                // Remove from view smoothly
                setLeads(prev => prev.filter(l => l.id !== leadId));
            }
        } catch (err) {
            console.error('Error archiving lead:', err);
        } finally {
            setUpdating(null);
        }
    };

    const handleRestore = async (leadId) => {
        setUpdating(leadId);
        try {
            const res = await fetch(getApiUrl(`/api/admin/leads/${leadId}`), {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ field: 'crm_status', value: 'new' })
            });
            if (res.ok) {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, crm_status: 'new' } : l));
            }
        } finally {
            setUpdating(null);
        }
    };

    const handleDelete = async (leadId) => {
        if (!window.confirm('Tem certeza que deseja excluir permanentemente este lead?')) return;

        setUpdating(leadId);
        try {
            const res = await fetch(getApiUrl(`/api/admin/leads/${leadId}`), {
                method: 'DELETE'
            });
            const data = await res.json();
            if (data.success) {
                setLeads(prev => prev.filter(l => l.id !== leadId));
            } else {
                alert('Erro ao excluir: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error deleting lead:', err);
        } finally {
            setUpdating(null);
        }
    };

    const openWhatsApp = (phone, name) => {
        const clean = phone.replace(/\D/g, '');
        const full = clean.startsWith('55') ? clean : `55${clean}`;
        const msg = encodeURIComponent(`Olá ${name}! Sou da equipe WiseFinan. Vi que você se interessou pelo nosso plano. Posso te ajudar? 😊`);
        window.open(`https://wa.me/${full}?text=${msg}`, '_blank');
    };

    const handleGeneratePassword = async (leadId) => {
        setUpdating(leadId);
        try {
            const res = await fetch(getApiUrl(`/api/admin/leads/${leadId}/generate-password`), {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, generated_password: data.password } : l));
            } else {
                alert('Erro ao gerar senha: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error generating password:', err);
        } finally {
            setUpdating(null);
        }
    };

    const handleCreateUser = async (leadId) => {
        setUpdating(leadId);
        try {
            const res = await fetch(getApiUrl(`/api/admin/leads/${leadId}/create-user`), {
                method: 'POST'
            });
            const data = await res.json();
            if (data.success) {
                setLeads(prev => prev.map(l => l.id === leadId ? { ...l, is_active_user: true } : l));
            } else {
                alert('Erro ao criar usuário: ' + (data.error || 'Unknown error'));
            }
        } catch (err) {
            console.error('Error creating user:', err);
        } finally {
            setUpdating(null);
        }
    };

    const handleResetDevice = async (email) => {
        if (!window.confirm(`Deseja resetar o dispositivo vinculado para o usuário ${email}? Ele poderá logar em um novo aparelho.`)) return;

        // Find lead id for loading state visual feedback
        const lead = leads.find(l => l.email === email);
        if (lead) setUpdating(lead.id);

        try {
            const res = await fetch(getApiUrl('/api/admin/reset-device'), {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: email })
            });

            // Handle potential non-JSON responses gracefully
            const contentType = res.headers.get("content-type");
            let data = {};
            if (contentType && contentType.indexOf("application/json") !== -1) {
                data = await res.json();
            }

            if (res.ok) {
                alert('Dispositivo resetado com sucesso! O usuário já pode logar em um novo aparelho.');
            } else {
                alert('Erro ao resetar dispositivo: ' + (data.error || 'Erro desconhecido'));
            }
        } catch (err) {
            console.error('Error resetting device:', err);
            alert('Erro de conexão ao tentar resetar dispositivo.');
        } finally {
            setUpdating(null);
        }
    };

    const copyToClipboard = (text) => {
        navigator.clipboard.writeText(text);
        alert('Senha copiada!');
    };

    // Filter Logic
    const filteredLeads = leads.filter(lead => {
        const matchesSearch =
            lead.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
            lead.phone.includes(searchTerm);

        const matchesPayment = filterPayment === 'all' || lead.payment_status === filterPayment;
        const matchesCRM = filterCRM === 'all' || lead.crm_status === filterCRM;

        return matchesSearch && matchesPayment && matchesCRM;
    });

    // Stats Calculation
    const stats = {
        total: leads.length,
        new: leads.filter(l => l.crm_status === 'new').length,
        pending: leads.filter(l => l.payment_status === 'pending').length,
        converted: leads.filter(l => l.payment_status === 'approved').length
    };

    return (
        <div className="leadboard-container">
            {/* Header */}
            <div className="leadboard-header">
                <div>
                    <h1><Users size={28} /> CRM Leads</h1>
                    <p>Gerencie seus leads e acompanhe o funil de vendas</p>
                </div>

                <div className="leadboard-actions">
                    <button
                        className={`leadboard-archive-toggle ${showArchived ? 'active' : ''}`}
                        onClick={() => setShowArchived(!showArchived)}
                    >
                        <Archive size={16} />
                        {showArchived ? 'Ver Ativos' : 'Ver Arquivados'}
                    </button>

                    <button className="leadboard-refresh-btn" onClick={fetchLeads}>
                        <RefreshCw size={16} className={loading ? 'lead-spin' : ''} />
                        Atualizar
                    </button>
                </div>
            </div>

            {/* Stats */}
            <div className="leadboard-stats">
                <div className="leadboard-stat-card" style={{ color: '#3b82f6' }}>
                    <div className="leadboard-stat-icon" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
                        <Users size={20} />
                    </div>
                    <div className="leadboard-stat-content">
                        <div className="leadboard-stat-value">{stats.total}</div>
                        <div className="leadboard-stat-label">Total Leads</div>
                    </div>
                </div>

                <div className="leadboard-stat-card" style={{ color: '#f59e0b' }}>
                    <div className="leadboard-stat-icon" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
                        <AlertTriangle size={20} />
                    </div>
                    <div className="leadboard-stat-content">
                        <div className="leadboard-stat-value">{stats.new}</div>
                        <div className="leadboard-stat-label">Novos</div>
                    </div>
                </div>

                <div className="leadboard-stat-card" style={{ color: '#ef4444' }}>
                    <div className="leadboard-stat-icon" style={{ background: 'rgba(239, 68, 68, 0.15)' }}>
                        <Clock size={20} />
                    </div>
                    <div className="leadboard-stat-content">
                        <div className="leadboard-stat-value">{stats.pending}</div>
                        <div className="leadboard-stat-label">Pagamento Pendente</div>
                    </div>
                </div>

                <div className="leadboard-stat-card" style={{ color: '#10b981' }}>
                    <div className="leadboard-stat-icon" style={{ background: 'rgba(16, 185, 129, 0.15)' }}>
                        <CheckCircle size={20} />
                    </div>
                    <div className="leadboard-stat-content">
                        <div className="leadboard-stat-value">{stats.converted}</div>
                        <div className="leadboard-stat-label">Convertidos</div>
                    </div>
                </div>
            </div>

            {/* Admin Actions Panel */}
            <div style={{
                marginBottom: '20px',
                padding: '16px',
                background: 'rgba(30, 41, 59, 0.5)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                flexWrap: 'wrap'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#94a3b8', fontSize: '0.9rem', fontWeight: 600 }}>
                    <AlertTriangle size={18} color="#f59e0b" />
                    <span>Ações de Admin:</span>
                </div>
                <form onSubmit={handleManualReset} style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-start' }}>
                    <input
                        type="email"
                        placeholder="Email para reset..."
                        value={manualEmail}
                        onChange={e => setManualEmail(e.target.value)}
                        style={{
                            background: 'rgba(0,0,0,0.2)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '6px',
                            padding: '6px 10px',
                            fontSize: '0.9rem',
                            color: '#fff',
                            minWidth: '250px',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={!manualEmail || updating === 'manual'}
                        style={{
                            background: '#3b82f6',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            padding: '4px 10px',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            fontWeight: 600,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            opacity: (!manualEmail || updating === 'manual') ? 0.5 : 1,
                            height: '24px' // Enforce thinness
                        }}
                    >
                        <RefreshCw size={12} className={updating === 'manual' ? 'lead-spin' : ''} />
                        {updating === 'manual' ? 'Resetando...' : 'Resetar Device'}
                    </button>
                </form>
            </div>

            {/* Filters */}
            <div className="leadboard-filters">
                <div className="leadboard-search">
                    <Search size={18} className="leadboard-search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou telefone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="leadboard-filter-selects">
                    <select className="leadboard-filter-select" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                        <option value="all">Filtro: Pagamento</option>
                        {Object.entries(PAYMENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select className="leadboard-filter-select" value={filterCRM} onChange={e => setFilterCRM(e.target.value)}>
                        <option value="all">Filtro: Status CRM</option>
                        {Object.entries(CRM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="leadboard-list">
                {filteredLeads.length === 0 ? (
                    <div className="leadboard-empty">
                        <p>Nenhum lead encontrado.</p>
                    </div>
                ) : (
                    filteredLeads.map(lead => (
                        <div className={`leadboard-card ${updating === lead.id ? 'updating' : ''} ${lead.is_active_user ? 'active-user' : ''}`} key={lead.id}>
                            {/* Header Row */}
                            <div className="lead-card-header">
                                <div className="lead-info">
                                    <div className="lead-name">
                                        {lead.name}
                                        {lead.is_active_user && <span className="active-user-badge"><CheckCircle size={12} /> Ativo</span>}
                                    </div>
                                    <div className="lead-meta-row">
                                        <span className="lead-plan">{lead.plan || 'N/A'}</span>
                                        <span className="lead-date">
                                            <Clock size={10} /> {lead.created_at}
                                        </span>
                                    </div>
                                    <div className="lead-price" style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '2px' }}>
                                        Valor: <span style={{ color: '#e2e8f0', fontWeight: '500' }}>{PLAN_PRICES[lead.plan] || '---'}</span>
                                    </div>
                                </div>

                                {showArchived ? (
                                    <>
                                        <button
                                            className="lead-archive-btn"
                                            title="Restaurar Lead"
                                            onClick={() => handleRestore(lead.id)}
                                        >
                                            <RefreshCw size={18} />
                                        </button>
                                        <button
                                            className="lead-archive-btn delete-btn"
                                            title="Excluir Permanentemente"
                                            onClick={() => handleDelete(lead.id)}
                                            style={{ marginLeft: '8px', color: '#ef4444' }}
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </>
                                ) : (
                                    <button
                                        className="lead-archive-btn"
                                        title="Arquivar Lead"
                                        onClick={() => handleArchive(lead.id)}
                                    >
                                        <Archive size={18} />
                                    </button>
                                )}
                            </div>

                            {/* Contact Info */}
                            <div className="lead-contact-strip">
                                <div className="contact-row">
                                    <span>Email</span>
                                    <span className="contact-value">{lead.email}</span>
                                </div>
                                <div className="contact-row">
                                    <span>Telefone</span>
                                    <span className="contact-value" style={{ userSelect: 'all' }}>{lead.phone}</span>
                                </div>
                                <button className="lead-whatsapp-primary" onClick={() => openWhatsApp(lead.phone, lead.name)}>
                                    <span style={{ fontSize: '1.2em' }}>💬</span> Chamar no WhatsApp
                                </button>
                            </div>

                            {/* Action Grid */}
                            <div className="lead-actions-grid">
                                <div className="status-box">
                                    <span className="status-label">Pagamento</span>
                                    <select
                                        className="status-select"
                                        value={lead.payment_status}
                                        style={{ color: PAYMENT_STATUSES[lead.payment_status]?.color || '#fff' }}
                                        onChange={(e) => handleStatusChange(lead.id, 'payment_status', e.target.value)}
                                    >
                                        {Object.entries(PAYMENT_STATUSES).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="status-box">
                                    <span className="status-label">Status CRM</span>
                                    <select
                                        className="status-select"
                                        value={lead.crm_status}
                                        style={{ color: CRM_STATUSES[lead.crm_status]?.color || '#fff' }}
                                        onChange={(e) => handleStatusChange(lead.id, 'crm_status', e.target.value)}
                                    >
                                        {Object.entries(CRM_STATUSES).map(([k, v]) => (
                                            <option key={k} value={k}>{v.label}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>

                            {/* Notes */}
                            <textarea
                                className="lead-notes"
                                placeholder="Adicionar anotação..."
                                value={lead.notes || ''}
                                onChange={(e) => {
                                    /* Local update first for smoothness */
                                    setLeads(prev => prev.map(l => l.id === lead.id ? { ...l, notes: e.target.value } : l));
                                }}
                                onBlur={(e) => handleStatusChange(lead.id, 'notes', e.target.value)}
                            />

                            {/* Active User Actions */}
                            {lead.payment_status === 'approved' && lead.crm_status === 'converted' && lead.is_active_user && (
                                <div className="lead-user-actions" style={{ marginTop: '12px', borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '12px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <CheckCircle size={14} color="#10b981" />
                                            <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>Acesso Ativo</span>
                                        </div>

                                        <button
                                            className="btn-generate-password"
                                            style={{
                                                background: 'rgba(245, 158, 11, 0.15)',
                                                color: '#f59e0b',
                                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                fontSize: '0.8rem',
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer'
                                            }}
                                            onClick={() => handleResetDevice(lead.email)}
                                        >
                                            <RefreshCw size={14} />
                                            Resetar Dispositivo
                                        </button>
                                    </div>
                                </div>
                            )}

                            {/* Pending User Creation Section */}
                            {lead.payment_status === 'approved' && lead.crm_status === 'converted' && !lead.is_active_user && (
                                <div className="lead-user-actions">
                                    <div className="user-action-divider"></div>
                                    {!lead.generated_password ? (
                                        <button
                                            className="btn-generate-password"
                                            onClick={() => handleGeneratePassword(lead.id)}
                                        >
                                            🔑 Gerar Senha/Acesso
                                        </button>
                                    ) : (
                                        <div className="password-display-area">
                                            <div className="password-box">
                                                <span>Senha:</span>
                                                <code>{lead.generated_password}</code>
                                                <button onClick={() => copyToClipboard(lead.generated_password)} title="Copiar">📋</button>
                                            </div>
                                            <button
                                                className="btn-create-firebase"
                                                onClick={() => handleCreateUser(lead.id)}
                                            >
                                                🚀 Cadastrar no Firebase
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default LeadBoard;
