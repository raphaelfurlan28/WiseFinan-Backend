import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Users, Search, Phone, Mail, Calendar,
    CheckCircle, Clock, AlertTriangle, MessageSquare,
    RefreshCw, Edit3, Save
} from 'lucide-react';
import { getApiUrl } from '../services/api';
import './LeadBoard.css';

const PAYMENT_STATUSES = {
    pending: { label: 'Pendente', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    approved: { label: 'Aprovado', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    failed: { label: 'Falhou', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' },
    refunded: { label: 'Reembolsado', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' }
};

const CRM_STATUSES = {
    new: { label: 'Novo', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' },
    contacted: { label: 'Contatado', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
    negotiating: { label: 'Negociando', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
    converted: { label: 'Convertido', color: '#4ade80', bg: 'rgba(74,222,128,0.12)' },
    lost: { label: 'Perdido', color: '#ef4444', bg: 'rgba(239,68,68,0.12)' }
};

const PLAN_COLORS = { 'Mensal': '#3b82f6', 'Semestral': '#a855f7', 'Anual': '#4ade80' };

const LeadBoard = () => {
    const [leads, setLeads] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterPayment, setFilterPayment] = useState('all');
    const [filterCRM, setFilterCRM] = useState('all');
    const [editingNotes, setEditingNotes] = useState(null);
    const [notesValue, setNotesValue] = useState('');
    const [updating, setUpdating] = useState(null);

    const fetchLeads = async () => {
        setLoading(true);
        try {
            const res = await fetch(getApiUrl('/api/admin/leads'));
            const data = await res.json();
            setLeads(Array.isArray(data) ? data : []);
        } catch (err) {
            console.error('Error fetching leads:', err);
            setLeads([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchLeads(); }, []);

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

    const handleSaveNotes = async (leadId) => {
        await handleStatusChange(leadId, 'notes', notesValue);
        setEditingNotes(null);
    };

    const openWhatsApp = (phone, name) => {
        const clean = phone.replace(/\D/g, '');
        const full = clean.startsWith('55') ? clean : `55${clean}`;
        const msg = encodeURIComponent(`Olá ${name}! Sou da equipe WiseFinan. Vi que você se interessou pelo nosso plano. Posso te ajudar? 😊`);
        window.open(`https://wa.me/${full}?text=${msg}`, '_blank');
    };

    const filteredLeads = leads.filter(lead => {
        const s = searchTerm.toLowerCase();
        const matchSearch = !s || (lead.name || '').toLowerCase().includes(s) || (lead.email || '').toLowerCase().includes(s) || (lead.phone || '').includes(searchTerm);
        const matchPay = filterPayment === 'all' || lead.payment_status === filterPayment;
        const matchCrm = filterCRM === 'all' || lead.crm_status === filterCRM;
        return matchSearch && matchPay && matchCrm;
    });

    const stats = {
        total: leads.length,
        new: leads.filter(l => l.crm_status === 'new').length,
        pending: leads.filter(l => l.payment_status === 'pending').length,
        converted: leads.filter(l => l.crm_status === 'converted').length
    };

    return (
        <div className="leadboard-container">
            {/* Header */}
            <div className="leadboard-header">
                <div>
                    <h1><Users size={28} /> CRM Leads</h1>
                    <p>Gerencie seus leads e acompanhe o funil de vendas</p>
                </div>
                <button className="leadboard-refresh-btn" onClick={fetchLeads}>
                    <RefreshCw size={16} className={loading ? 'lead-spin' : ''} />
                    Atualizar Lista
                </button>
            </div>

            {/* Stats */}
            <div className="leadboard-stats">
                {[
                    { label: 'Total', value: stats.total, color: '#3b82f6', Icon: Users },
                    { label: 'Novos', value: stats.new, color: '#f59e0b', Icon: AlertTriangle },
                    { label: 'Pendentes', value: stats.pending, color: '#ef4444', Icon: Clock },
                    { label: 'Convertidos', value: stats.converted, color: '#4ade80', Icon: CheckCircle }
                ].map((s, i) => (
                    <div className="leadboard-stat-card" key={i}>
                        <div className="leadboard-stat-icon" style={{ background: `${s.color}15`, color: s.color }}>
                            <s.Icon size={20} />
                        </div>
                        <div className="leadboard-stat-content">
                            <div className="leadboard-stat-value" style={{ color: s.color }}>{s.value}</div>
                            <div className="leadboard-stat-label">{s.label}</div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Filters */}
            <div className="leadboard-filters">
                <div className="leadboard-search">
                    <Search size={16} className="leadboard-search-icon" />
                    <input
                        type="text"
                        placeholder="Buscar por nome, email ou telefone..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="leadboard-filter-selects">
                    <select className="leadboard-filter-select" value={filterPayment} onChange={e => setFilterPayment(e.target.value)}>
                        <option value="all">💳 Todos Pagamentos</option>
                        {Object.entries(PAYMENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                    <select className="leadboard-filter-select" value={filterCRM} onChange={e => setFilterCRM(e.target.value)}>
                        <option value="all">📊 Todos Status</option>
                        {Object.entries(CRM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                    </select>
                </div>
            </div>

            <div className="leadboard-count">
                Exibindo {filteredLeads.length} de {leads.length} leads
            </div>

            {/* Content */}
            {loading ? (
                <div className="leadboard-loading">
                    <RefreshCw size={28} className="lead-spin" />
                    <p>Carregando leads...</p>
                </div>
            ) : filteredLeads.length === 0 ? (
                <div className="leadboard-empty">
                    <Users size={40} style={{ opacity: 0.25 }} />
                    <p>Nenhum lead encontrado</p>
                </div>
            ) : (
                <div className="leadboard-list">
                    <AnimatePresence>
                        {filteredLeads.map((lead, idx) => {
                            const pay = PAYMENT_STATUSES[lead.payment_status] || PAYMENT_STATUSES.pending;
                            const crm = CRM_STATUSES[lead.crm_status] || CRM_STATUSES.new;
                            const planColor = PLAN_COLORS[lead.plan] || '#94a3b8';
                            const isEditing = editingNotes === lead.id;
                            const isUpdating = updating === lead.id;

                            return (
                                <motion.div
                                    key={lead.id}
                                    className={`leadboard-card ${isUpdating ? 'updating' : ''}`}
                                    initial={{ opacity: 0, y: 8 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ delay: idx * 0.025 }}
                                >
                                    {/* Top */}
                                    <div className="lead-card-top">
                                        <div className="lead-card-name">{lead.name || 'Sem nome'}</div>
                                        <div className="lead-card-meta">
                                            <span className="lead-plan-badge" style={{ background: `${planColor}18`, color: planColor }}>
                                                {lead.plan || 'N/A'}
                                            </span>
                                            <span className="lead-date">
                                                <Calendar size={11} /> {lead.created_at || '—'}
                                            </span>
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className="lead-card-contact">
                                        <div className="lead-contact-item">
                                            <Mail size={14} color="#64748b" />
                                            <span>{lead.email || '—'}</span>
                                        </div>
                                        <div className="lead-contact-item">
                                            <Phone size={14} color="#64748b" />
                                            <span>{lead.phone || '—'}</span>
                                            {lead.phone && (
                                                <button className="lead-whatsapp-btn" onClick={() => openWhatsApp(lead.phone, lead.name)}>
                                                    <MessageSquare size={12} /> WhatsApp
                                                </button>
                                            )}
                                        </div>
                                    </div>

                                    {/* Statuses */}
                                    <div className="lead-card-statuses">
                                        <div className="lead-status-group">
                                            <span className="lead-status-label">Pagamento:</span>
                                            <select
                                                className="lead-status-select"
                                                value={lead.payment_status || 'pending'}
                                                onChange={e => handleStatusChange(lead.id, 'payment_status', e.target.value)}
                                                disabled={isUpdating}
                                                style={{ background: pay.bg, border: `1px solid ${pay.color}30`, color: pay.color }}
                                            >
                                                {Object.entries(PAYMENT_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                            </select>
                                        </div>
                                        <div className="lead-status-group">
                                            <span className="lead-status-label">CRM:</span>
                                            <select
                                                className="lead-status-select"
                                                value={lead.crm_status || 'new'}
                                                onChange={e => handleStatusChange(lead.id, 'crm_status', e.target.value)}
                                                disabled={isUpdating}
                                                style={{ background: crm.bg, border: `1px solid ${crm.color}30`, color: crm.color }}
                                            >
                                                {Object.entries(CRM_STATUSES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Notes */}
                                    <div className="lead-notes-row">
                                        {isEditing ? (
                                            <>
                                                <input
                                                    className="lead-notes-input"
                                                    type="text"
                                                    value={notesValue}
                                                    onChange={e => setNotesValue(e.target.value)}
                                                    placeholder="Adicionar nota..."
                                                    autoFocus
                                                    onKeyDown={e => e.key === 'Enter' && handleSaveNotes(lead.id)}
                                                />
                                                <button className="lead-notes-save-btn" onClick={() => handleSaveNotes(lead.id)}>
                                                    <Save size={14} />
                                                </button>
                                            </>
                                        ) : (
                                            <button
                                                className={`lead-notes-btn ${lead.notes ? 'has-note' : ''}`}
                                                onClick={() => { setEditingNotes(lead.id); setNotesValue(lead.notes || ''); }}
                                            >
                                                <Edit3 size={12} />
                                                {lead.notes || 'Adicionar nota...'}
                                            </button>
                                        )}
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}
        </div>
    );
};

export default LeadBoard;
