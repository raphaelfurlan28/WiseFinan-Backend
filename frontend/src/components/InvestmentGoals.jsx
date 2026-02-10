import React, { useState, useEffect } from 'react';
import { Target, Plus, Trash2, Calendar, DollarSign, TrendingUp, Calculator } from 'lucide-react';
import { db } from '../services/firebaseConfig';
import { collection, addDoc, query, where, onSnapshot, deleteDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import ModernSpinner from './ModernSpinner';

const InvestmentGoals = () => {
    const { user } = useAuth();
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);
    const [newGoal, setNewGoal] = useState({
        name: '',
        targetValue: '',
        deadline: '',
        initialAmount: '',
        annualRate: '' // custom annual rate
    });

    // Default annual interest rate assumption (10% a.a) - Used only if no custom rate provided
    const DEFAULT_ANNUAL_RATE = 0.10;

    useEffect(() => {
        if (!user?.uid) return;

        const q = query(
            collection(db, "user_goals"),
            where("userId", "==", user.uid)
        );

        const unsubscribe = onSnapshot(q, (querySnapshot) => {
            const goalsData = [];
            querySnapshot.forEach((doc) => {
                goalsData.push({ id: doc.id, ...doc.data() });
            });
            // Sort by createdAt or name
            goalsData.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
            setGoals(goalsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching goals:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user?.uid]);

    const calculateMonthlyInvestment = (target, initial, deadlineDate, customAnnualRate) => {
        const now = new Date();
        const end = new Date(deadlineDate);

        // Calculate months difference
        let months = (end.getFullYear() - now.getFullYear()) * 12;
        months -= now.getMonth();
        months += end.getMonth();

        // Ensure at least 1 month to avoid division by zero or negative time
        if (months <= 0) months = 0; // or handle as immediate

        if (months <= 0) return { monthly: 0, months: 0 };

        // Determine Annual Rate
        const annualRate = customAnnualRate !== undefined && customAnnualRate !== null && !isNaN(customAnnualRate)
            ? customAnnualRate
            : DEFAULT_ANNUAL_RATE;

        let monthlyRate;

        // Logic: < 12 months = Proportional, >= 12 months = Compound
        if (months < 12) {
            monthlyRate = annualRate / 12;
        } else {
            monthlyRate = Math.pow(1 + annualRate, 1 / 12) - 1;
        }

        // Future Value of Initial Amount: FV = PV * (1 + i)^n
        const fvInitial = initial * Math.pow(1 + monthlyRate, months);

        // Remaining target to cover with monthly contributions
        const remainingTarget = target - fvInitial;

        if (remainingTarget <= 0) return { monthly: 0, months };

        // PMT Formula for Future Value: PMT = FV * i / ((1 + i)^n - 1)
        const pmt = remainingTarget * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);

        return { monthly: pmt, months };
    };

    const handleAddGoal = async (e) => {
        e.preventDefault();

        if (!user?.uid) {
            alert("Faça login para salvar suas metas.");
            return;
        }

        // Basic validation
        if (!newGoal.name || !newGoal.targetValue || !newGoal.deadline) return;

        const target = parseFloat(newGoal.targetValue.replace(/[^\d,]/g, '').replace(',', '.'));
        const initial = newGoal.initialAmount ? parseFloat(newGoal.initialAmount.replace(/[^\d,]/g, '').replace(',', '.')) : 0;

        // Parse Annual Rate (input as "12,00", convert to 0.12)
        let rate = null;
        if (newGoal.annualRate) {
            const rateVal = parseFloat(newGoal.annualRate.replace(/[^\d,]/g, '').replace(',', '.'));
            if (!isNaN(rateVal)) {
                rate = rateVal / 100;
            }
        }

        const { monthly, months } = calculateMonthlyInvestment(target, initial, newGoal.deadline, rate);

        try {
            await addDoc(collection(db, "user_goals"), {
                userId: user.uid,
                name: newGoal.name,
                targetValue: target,
                initialAmount: initial,
                deadline: newGoal.deadline,
                annualRate: rate,
                monthlyInvestment: monthly,
                monthsRemaining: months,
                createdAt: serverTimestamp()
            });

            setNewGoal({ name: '', targetValue: '', deadline: '', initialAmount: '', annualRate: '' });
            setShowForm(false);
        } catch (error) {
            console.error("Error adding goal:", error);
            alert("Erro ao salvar meta. Verifique sua conexão.");
        }
    };

    const handleDeleteGoal = async (id) => {
        if (!window.confirm("Deseja realmente excluir esta meta?")) return;

        try {
            await deleteDoc(doc(db, "user_goals", id));
        } catch (error) {
            console.error("Error deleting goal:", error);
            alert("Erro ao excluir meta.");
        }
    };

    const formatCurrency = (value) => {
        return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    };

    const handleCurrencyInput = (e, field) => {
        let value = e.target.value.replace(/\D/g, "");
        if (value === "") {
            setNewGoal({ ...newGoal, [field]: "" });
            return;
        }
        const floatValue = parseFloat(value) / 100;
        const formatted = floatValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        setNewGoal({ ...newGoal, [field]: formatted });
    };

    if (loading) {
        return (
            <div className="rf-container" style={{ marginTop: '40px', display: 'flex', justifyContent: 'center' }}>
                <ModernSpinner />
            </div>
        );
    }

    return (
        <div className="rf-container" style={{ marginTop: '40px' }}>
            {/* Header */}
            <div className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Target size={20} color="#fcd34d" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#fcd34d', fontWeight: 600 }}>Metas Financeiras</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </div>

            {/* Content */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Goals List */}
                <div className="responsive-card-grid" style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '20px'
                }}>
                    {/* Add Goal Button Card */}
                    <div
                        onClick={() => setShowForm(true)}
                        className="glass-card"
                        style={{
                            minHeight: '200px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: '2px dashed rgba(255,255,255,0.1)',
                            transition: 'all 0.3s ease'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#fcd34d';
                            e.currentTarget.style.background = 'rgba(252, 211, 77, 0.05)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)';
                            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.03)';
                        }}
                    >
                        <div style={{
                            width: '50px', height: '50px', borderRadius: '50%',
                            background: 'rgba(252, 211, 77, 0.1)', display: 'flex',
                            alignItems: 'center', justifyContent: 'center', marginBottom: '12px'
                        }}>
                            <Plus size={24} color="#fcd34d" />
                        </div>
                        <span style={{ color: '#fff', fontWeight: 500 }}>Nova Meta</span>
                    </div>

                    {/* Existing Goals */}
                    {goals.map(goal => (
                        <div key={goal.id} className="glass-card" style={{ padding: '20px', position: 'relative' }}>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleDeleteGoal(goal.id); }}
                                style={{
                                    position: 'absolute', top: '15px', right: '15px',
                                    background: 'transparent', border: 'none', cursor: 'pointer',
                                    padding: '4px'
                                }}
                            >
                                <Trash2 size={16} color="#ef4444" style={{ opacity: 0.7 }} />
                            </button>

                            <h3 style={{ margin: '0 0 16px 0', fontSize: '1.1rem', color: '#fff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {goal.name}
                            </h3>

                            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Objetivo:</span>
                                    <span style={{ color: '#fff', fontWeight: 600 }}>{formatCurrency(goal.targetValue)}</span>
                                </div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                                    <span style={{ color: '#94a3b8' }}>Prazo:</span>
                                    <span style={{ color: '#fff' }}>{new Date(goal.deadline).toLocaleDateString()}</span>
                                </div>

                                <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }}></div>

                                <div>
                                    <span style={{ display: 'block', fontSize: '0.8rem', color: '#94a3b8', marginBottom: '4px' }}>
                                        Aporte Mensal Necessário
                                    </span>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <TrendingUp size={20} color="#fcd34d" />
                                        <span style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fcd34d' }}>
                                            {formatCurrency(goal.monthlyInvestment)}
                                        </span>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: '#64748b', display: 'block', marginTop: '4px' }}>
                                        Para atingir em {goal.monthsRemaining} meses
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Modal Form */}
            {showForm && (
                <div style={{
                    position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 1000
                }} onClick={() => setShowForm(false)}>
                    <div
                        onClick={e => e.stopPropagation()}
                        className="glass-card"
                        style={{ width: '90%', maxWidth: '500px', padding: '32px' }}
                    >
                        <h2 style={{ color: '#fff', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                            <Calculator size={24} color="#fcd34d" />
                            Adicionar Nova Meta
                        </h2>

                        <form onSubmit={handleAddGoal} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Nome da Meta</label>
                                <input
                                    type="text"
                                    placeholder="Ex: Carro Novo, Viagem, Aposentadoria"
                                    value={newGoal.name}
                                    onChange={e => setNewGoal({ ...newGoal, name: e.target.value })}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '8px',
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', outline: 'none'
                                    }}
                                    required
                                />
                            </div>


                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Rentabilidade Anual Esperada (%)</label>
                                <input
                                    type="text"
                                    placeholder="Ex: 10,00"
                                    value={newGoal.annualRate}
                                    onChange={e => handleCurrencyInput(e, 'annualRate')}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '8px',
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', outline: 'none'
                                    }}
                                />
                                <span style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', display: 'block' }}>
                                    (Opcional - Padrão: 10% a.a.)
                                </span>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Valor Alvo (R$)</label>
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={newGoal.targetValue}
                                        onChange={e => handleCurrencyInput(e, 'targetValue')}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '8px',
                                            background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff', outline: 'none'
                                        }}
                                        required
                                    />
                                </div>
                                <div>
                                    <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Já Tenho (R$)</label>
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={newGoal.initialAmount}
                                        onChange={e => handleCurrencyInput(e, 'initialAmount')}
                                        style={{
                                            width: '100%', padding: '12px', borderRadius: '8px',
                                            background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)',
                                            color: '#fff', outline: 'none'
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', marginBottom: '8px', fontSize: '0.9rem' }}>Data Limite</label>
                                <input
                                    type="date"
                                    value={newGoal.deadline}
                                    onChange={e => setNewGoal({ ...newGoal, deadline: e.target.value })}
                                    style={{
                                        width: '100%', padding: '12px', borderRadius: '8px',
                                        background: 'rgba(30, 41, 59, 0.5)', border: '1px solid rgba(255,255,255,0.1)',
                                        color: '#fff', outline: 'none'
                                    }}
                                    required
                                />
                            </div>

                            <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                                <button
                                    type="button"
                                    onClick={() => setShowForm(false)}
                                    style={{
                                        flex: 1, padding: '12px', borderRadius: '8px',
                                        background: 'transparent', border: '1px solid rgba(255,255,255,0.2)',
                                        color: '#fff', cursor: 'pointer'
                                    }}
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    style={{
                                        flex: 2, padding: '12px', borderRadius: '8px',
                                        background: '#fcd34d', border: 'none',
                                        color: '#000', fontWeight: 'bold', cursor: 'pointer'
                                    }}
                                >
                                    Calcular e Salvar
                                </button>
                            </div>
                        </form>
                    </div>
                </div >
            )}
        </div >
    );
};

export default InvestmentGoals;
