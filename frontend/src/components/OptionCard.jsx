import React from 'react';

export default function OptionCard({ option, type, showExpiration = true }) {
    // Helper to extract numeric value from string if needed
    const getVal = (v) => {
        if (typeof v === 'number') return v;
        if (typeof v === 'string') {
            return parseFloat(v.replace('R$', '').replace('%', '').replace(',', '.').trim()) || 0;
        }
        return 0;
    };

    const distVal = option.dist_val !== undefined ? option.dist_val : getVal(option.distance);
    const isDistPositive = distVal >= 0;

    // Check for advanced metrics (Pózinho feature)
    const hasGreeks = option.delta_val || option.prob_success;

    return (
        <div className={`option-card ${type}`} style={{ height: 'auto', minHeight: 'auto', display: 'flex', flexDirection: 'column', paddingBottom: '12px' }}>
            <div className="card-header">
                <div className="strike-container">
                    <span className="strike-label">Strike</span>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: '#f1f5f9' }}>R$ {option.strike}</span>
                    <div style={{
                        fontSize: '0.7rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px',
                        padding: '2px 6px', borderRadius: '4px', width: 'fit-content', marginTop: '4px',
                        background: 'rgba(0, 0, 0, 0.2)', color: isDistPositive ? '#4ade80' : '#f87171',
                        whiteSpace: 'nowrap'
                    }}>
                        {isDistPositive ? '▲' : '▼'} {option.distance || `${distVal.toFixed(2)}%`}
                    </div>
                </div>
                <span className="ticker">{option.ticker}</span>
            </div>

            <div className="separator-line"></div>

            <div className="card-body" style={{ flex: 1 }}>
                <div className="row">
                    <span>Preço:</span>
                    <strong>R$ {option.price || option.last_price || '0,00'}</strong>
                </div>
                {/* For Pózinho, Premium is same as Price usually, but let's keep compatibility */}
                {option.premium && (
                    <div className="row">
                        <span>Prêmio:</span>
                        <strong className="premium">{option.premium}</strong>
                    </div>
                )}

                <div className="row secondary">
                    <span>Vol: {option.volume || '-'}</span>
                    <span>Neg: {option.trades || '-'}</span>
                </div>

                {showExpiration && (
                    <div className="row secondary" style={{ marginTop: '4px' }}>
                        <span>Vencimento:</span>
                        <span style={{ color: '#cbd5e1' }}>{option.expiration ? option.expiration.split('-').reverse().join('/') : '-'}</span>
                    </div>
                )}

                {/* Action Button Area - If provided */}
                {option.onAction && (
                    <button
                        onClick={(e) => { e.stopPropagation(); option.onAction(option); }}
                        style={{
                            width: '100%',
                            marginTop: '12px',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.1)',
                            border: '1px solid rgba(255, 255, 255, 0.2)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s'
                        }}
                    >
                        Ver Operação
                    </button>
                )}

                {hasGreeks && (
                    <div style={{ marginTop: '12px', paddingTop: '8px', borderTop: '1px solid rgba(255,255,255,0.1)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '0.75rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Prob. Sucesso</span>
                                <span style={{ color: '#38bdf8', fontWeight: 'bold' }}>{option.prob_success}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Delta</span>
                                <span style={{ color: '#cbd5e1' }}>{option.delta_val}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Preço Justo (BS)</span>
                                <span style={{ color: '#cbd5e1' }}>{option.bs_price_val}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{ color: '#94a3b8', fontSize: '0.65rem' }}>Edge Teórico</span>
                                <span style={{
                                    color: Math.abs(getVal(option.edge_formatted)) > 500 ? '#64748b' : (getVal(option.edge_formatted) > 0 ? '#4ade80' : '#ef4444'),
                                    fontWeight: 'bold'
                                }}>
                                    {Math.abs(getVal(option.edge_formatted)) > 500 ? '-' : option.edge_formatted}
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Action Button - If passed directly as prop instead of inside option object */}
            {/* We can support both */}
        </div>
    )
}
