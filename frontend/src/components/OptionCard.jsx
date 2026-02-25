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
        <div className={`option-card ${type}`} style={{ height: 'auto', minHeight: 'auto', display: 'flex', flexDirection: 'column' }}>
            <div className="card-header">
                <div className="strike-container">
                    <span className="strike-label">Strike</span>
                    <span style={{ fontSize: '15px', fontWeight: 700, color: '#f1f5f9', letterSpacing: '-0.3px' }}>R$ {option.strike}</span>
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
                        <span>Venc:</span>
                        <span style={{ color: '#cbd5e1' }}>{option.expiration ? option.expiration.split('-').reverse().join('/') : '-'}</span>
                    </div>
                )}

                {/* Action Button Area - If provided */}
                {option.onAction && (
                    <button
                        onClick={(e) => { e.stopPropagation(); option.onAction(option); }}
                        style={{
                            width: '100%',
                            marginTop: '10px',
                            padding: '8px',
                            background: 'rgba(255, 255, 255, 0.06)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            color: '#cbd5e1',
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            transition: 'all 0.2s',
                            letterSpacing: '0.2px'
                        }}
                    >
                        Ver Operação
                    </button>
                )}

                {hasGreeks && (
                    <div style={{ marginTop: '10px', paddingTop: '10px', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', fontSize: '0.73rem' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Prob. Sucesso</span>
                                <span style={{ color: '#38bdf8', fontWeight: 700 }}>{option.prob_success}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Delta</span>
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>{option.delta_val}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Preço Justo (BS)</span>
                                <span style={{ color: '#94a3b8', fontWeight: 500 }}>{option.bs_price_val}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <span style={{ color: '#475569', fontSize: '0.62rem', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Edge Teórico</span>
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
