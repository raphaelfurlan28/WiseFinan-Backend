import React, { useState, useEffect } from 'react';
import { Layers, Search, TrendingUp, DollarSign, ChevronDown, Check, X } from 'lucide-react';
import ModernLoader from './ModernLoader';
import ModernSpinner from './ModernSpinner';
import { getApiUrl } from '../services/api';
import { ResponsiveContainer } from 'recharts';
import './FixedIncome.css';

const OptionsCalculator = () => {
    // State
    const [searchTerm, setSearchTerm] = useState('');
    const [options, setOptions] = useState([]);
    const [selectedOption, setSelectedOption] = useState(null);
    const [isDropdownOpen, setIsDropdownOpen] = useState(false);
    const [isLoading, setIsLoading] = useState(false);

    // Simulation State
    const [quantity, setQuantity] = useState(100);
    const [action, setAction] = useState('buy'); // 'buy' or 'sell'
    const [targetPrice, setTargetPrice] = useState(''); // Target exit price (user input)
    const [manualPrice, setManualPrice] = useState(''); // User input for execution price

    // Fetch Options on Search
    useEffect(() => {
        const fetchOptions = async () => {
            if (!searchTerm || searchTerm.length < 4) return;
            setIsLoading(true);
            try {
                // Fetch options for the typed ticker (e.g. PETR4, POMO4, or underlying like PETR)
                const res = await fetch(getApiUrl(`/api/stocks/${searchTerm}/options`));
                const data = await res.json();

                if (Array.isArray(data)) {
                    setOptions(data);

                    // Auto-select if exact match found
                    const exactMatch = data.find(opt => opt.ticker.toUpperCase() === searchTerm.toUpperCase());
                    if (exactMatch) {
                        handleSelectOption(exactMatch);
                    } else {
                        setIsDropdownOpen(true);
                    }
                } else {
                    setOptions([]);
                }
            } catch (err) {
                console.error("Error fetching options", err);
            } finally {
                setIsLoading(false);
            }
        };

        // Debounce search
        const timeoutId = setTimeout(() => {
            if (searchTerm) fetchOptions();
        }, 800);

        return () => clearTimeout(timeoutId);
    }, [searchTerm]);

    const handleSelectOption = (opt) => {
        setSelectedOption(opt);
        setSearchTerm(opt.ticker); // Set input to the selected option ticker
        setIsDropdownOpen(false);
        // Initialize manual price with current market price
        if (opt.price_val) {
            setManualPrice(opt.price_val.toLocaleString('pt-BR', { minimumFractionDigits: 2 }));
        } else {
            setManualPrice('');
        }
    };

    const handlePriceChange = (e) => {
        let value = e.target.value;
        // Remove non-digits
        value = value.replace(/\D/g, "");

        if (value) {
            // Divide by 100 to get decimals
            value = (parseInt(value, 10) / 100).toLocaleString('pt-BR', { minimumFractionDigits: 2 });
        }
        setManualPrice(value);
    };

    // Calculations
    const getPrice = () => {
        if (manualPrice) {
            // Parse local string "1.000,00" -> float
            // Remove dots (thousands) and replace comma with dot
            const raw = manualPrice.replace(/\./g, '').replace(',', '.');
            return parseFloat(raw) || 0;
        }
        if (!selectedOption) return 0;
        // Check 'price_val' (Last Trade) or fallback
        // The API returns 'price' (string) and 'price_val' (float)
        return selectedOption.price_val || 0;
    };

    const price = getPrice();
    const totalValue = price * quantity;

    // Parse Strike for Guarantee Calculation
    const getStrike = () => {
        if (!selectedOption || !selectedOption.strike) return 0;
        try {
            // Remove R$, spaces, normalize decimal
            let s = selectedOption.strike.toString();
            s = s.replace('R$', '').trim();
            if (s.includes(',') && s.includes('.')) {
                s = s.replace(/\./g, '').replace(',', '.'); // Brazilian format 1.000,00 -> 1000.00
            } else {
                s = s.replace(',', '.');
            }
            return parseFloat(s) || 0;
        } catch (e) {
            return 0;
        }
    };
    const strikeVal = getStrike();
    const guaranteeVal = strikeVal * quantity;

    // Logic: 
    // Buy (Compra) -> Debit (You pay). Value leaves account. (Negative representation or Red)
    // Sell (Venda) -> Credit (You receive premium). Value enters account. (Positive or Green)

    return (
        <div className="rf-container">
            {/* Header */}
            {/* Loader Overlay for Search */}
            {isLoading && <ModernLoader text={`Buscando ${searchTerm || 'opções'}...`} />}

            <header className="rf-header" style={{ marginBottom: '24px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                    <Layers size={20} color="#94a3b8" />
                    <h1 style={{ margin: 0, fontSize: '1.25rem', color: '#94a3b8', fontWeight: 600 }}>Simulador de Opções</h1>
                </div>
                <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent)' }}></div>
            </header>

            {/* Responsive Styles (Copied from Calculator.jsx) */}
            <style>{`
                .calc-grid {
                    display: grid;
                    grid-template-columns: 350px 1fr;
                    gap: 24px;
                }
                @media (max-width: 1024px) {
                    .calc-grid {
                        grid-template-columns: 1fr;
                    }
                }
                .calc-results-grid {
                    display: grid;
                    grid-template-columns: repeat(2, 1fr); /* 2 Columns for Options Results */
                    gap: 16px;
                }
                @media (max-width: 768px) {
                    .calc-results-grid {
                        grid-template-columns: 1fr;
                    }
                }
            `}</style>

            <div className="calc-grid">

                {/* Left Panel: Parameters */}
                <div className="rf-card glass-card" style={{ padding: '16px' }}>
                    <div className="rf-card-header" style={{
                        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                        borderRadius: '16px 16px 0 0',
                        padding: '12px 16px',
                        margin: '-16px -16px 16px -16px',
                        display: 'flex', alignItems: 'center', gap: '12px'
                    }}>
                        <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                            <Search size={20} color="#000000" />
                        </div>
                        <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>Parâmetros</h3>
                    </div>

                    <div className="rf-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        {/* Ticker Search */}
                        <div style={{ position: 'relative' }}>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Ativo (Opção ou Subjacente)</label>
                            <div style={{ position: 'relative' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px 12px'
                                }}>
                                    <Search size={18} color="#94a3b8" style={{ marginRight: '8px' }} />
                                    <input
                                        type="text"
                                        placeholder="Ex: PETR4, BOVA11..."
                                        value={searchTerm}
                                        onChange={(e) => {
                                            setSearchTerm(e.target.value.toUpperCase());
                                            setIsDropdownOpen(true);
                                        }}
                                        onFocus={() => setIsDropdownOpen(true)}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            width: '100%',
                                            outline: 'none',
                                            fontSize: '1rem'
                                        }}
                                    />
                                    {isDropdownOpen && <ChevronDown size={18} color="#94a3b8" onClick={() => setIsDropdownOpen(false)} style={{ cursor: 'pointer' }} />}
                                </div>

                                {isDropdownOpen && searchTerm.length >= 3 && (
                                    <div style={{
                                        position: 'absolute', top: '100%', left: 0, right: 0,
                                        maxHeight: '200px', overflowY: 'auto',
                                        background: '#1e293b', border: '1px solid #333',
                                        borderRadius: '8px', zIndex: 100, marginTop: '4px',
                                        padding: '4px'
                                    }}>
                                        {isLoading ? (
                                            <div style={{ padding: '12px', color: '#94a3b8', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                                                <ModernSpinner size={20} />
                                                Buscando {searchTerm}...
                                            </div>
                                        ) : options.length > 0 ? (
                                            options.map((opt, idx) => (
                                                <div key={idx}
                                                    onClick={() => handleSelectOption(opt)}
                                                    style={{
                                                        padding: '10px 12px',
                                                        cursor: 'pointer',
                                                        color: '#e2e8f0',
                                                        fontSize: '0.9rem',
                                                        borderBottom: '1px solid rgba(255,255,255,0.05)',
                                                        display: 'flex', justifyContent: 'space-between'
                                                    }}
                                                    onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                                                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                                                >
                                                    <span>{opt.ticker}</span>
                                                    <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Ex: {opt.expiration} | {opt.type}</span>
                                                </div>
                                            ))
                                        ) : (
                                            <div style={{ padding: '8px', color: '#666', textAlign: 'center' }}>Nenhuma opção encontrada</div>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Action Selection */}
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Operação</label>
                            <div style={{ display: 'flex', gap: '12px' }}>
                                <button
                                    onClick={() => setAction('buy')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: action === 'buy' ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                                        background: action === 'buy' ? '#ffffff' : 'transparent',
                                        color: action === 'buy' ? '#000000' : '#64748b',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Compra (Débito)
                                </button>
                                <button
                                    onClick={() => setAction('sell')}
                                    style={{
                                        flex: 1,
                                        padding: '10px',
                                        borderRadius: '8px',
                                        border: action === 'sell' ? '1px solid #ffffff' : '1px solid rgba(255,255,255,0.1)',
                                        background: action === 'sell' ? '#ffffff' : 'transparent',
                                        color: action === 'sell' ? '#000000' : '#64748b',
                                        cursor: 'pointer',
                                        fontWeight: '600',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    Venda (Crédito)
                                </button>
                            </div>
                        </div>

                        {/* Quantity Input */}
                        <div>
                            <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Quantidade (Lote Mín. 100)</label>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px'
                            }}>
                                <button
                                    onClick={() => setQuantity(Math.max(100, quantity - 100))}
                                    style={{
                                        minWidth: '44px', width: '44px', height: '44px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        padding: 0,
                                        lineHeight: 1
                                    }}
                                >
                                    −
                                </button>
                                <input
                                    type="number"
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    step={100}
                                    min={100}
                                    style={{
                                        flex: 1, background: 'rgba(30, 41, 59, 0.6)',
                                        border: '1px solid rgba(255,255,255,0.1)', color: '#fff',
                                        padding: '12px', borderRadius: '8px', fontSize: '1rem',
                                        textAlign: 'center', minWidth: '80px'
                                    }}
                                />
                                <button
                                    onClick={() => setQuantity(quantity + 100)}
                                    style={{
                                        minWidth: '44px', width: '44px', height: '44px',
                                        background: 'rgba(255,255,255,0.1)',
                                        border: '1px solid rgba(255,255,255,0.1)',
                                        borderRadius: '8px',
                                        color: '#fff',
                                        fontSize: '1.5rem',
                                        fontWeight: 'bold',
                                        cursor: 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        flexShrink: 0,
                                        padding: 0,
                                        lineHeight: 1
                                    }}
                                >
                                    +
                                </button>
                            </div>

                            {/* Execution Price Input (NEW) */}
                            <div style={{ marginTop: '16px', marginBottom: '16px' }}>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Preço de Execução (Unitário)</label>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px 12px'
                                }}>
                                    <span style={{ color: '#94a3b8', marginRight: '8px' }}>R$</span>
                                    <input
                                        type="text"
                                        placeholder="0,00"
                                        value={manualPrice}
                                        onChange={handlePriceChange}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            width: '100%',
                                            outline: 'none',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            </div>

                            {/* Target Price (Saída) */}
                            <div>
                                <label style={{ display: 'block', color: '#94a3b8', fontSize: '0.9rem', marginBottom: '8px' }}>Preço Alvo / Saída (Opcional)</label>
                                <div style={{
                                    display: 'flex', alignItems: 'center',
                                    background: 'rgba(30, 41, 59, 0.6)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px 12px'
                                }}>
                                    <span style={{ color: '#94a3b8', marginRight: '8px' }}>R$</span>
                                    <input
                                        type="number"
                                        placeholder="0,00"
                                        value={targetPrice}
                                        onChange={(e) => setTargetPrice(e.target.value)}
                                        step={0.01}
                                        style={{
                                            background: 'transparent',
                                            border: 'none',
                                            color: '#fff',
                                            width: '100%',
                                            outline: 'none',
                                            fontSize: '1rem'
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                    </div>
                </div>

                {/* Right Panel: Results */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>

                    {/* Summary */}
                    <div className="rf-card glass-card" style={{ padding: '16px', flex: 1 }}>
                        <div className="rf-card-header" style={{
                            background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.35), transparent)',
                            borderRadius: '16px 16px 0 0',
                            padding: '12px 16px',
                            margin: '-16px -16px 16px -16px',
                            display: 'flex', alignItems: 'center', gap: '12px'
                        }}>
                            <div style={{ background: '#ffffff', padding: '6px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                                <DollarSign size={20} color="#000000" />
                            </div>
                            <h3 style={{ margin: 0, color: '#fff', fontSize: '1rem', fontWeight: 600 }}>
                                {selectedOption ? selectedOption.ticker : 'Selecione uma Opção'}
                            </h3>
                        </div>

                        <div className="rf-card-content" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {!selectedOption ? (
                                <div style={{ color: '#64748b', textAlign: 'center', padding: '24px' }}>
                                    Busque e selecione uma opção para ver a simulação.
                                </div>
                            ) : (
                                <>
                                    {/* Details Grid */}
                                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Último Preço (Prêmio)</span>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                                                R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Strike</span>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                                                R$ {selectedOption.strike ? parseFloat(selectedOption.strike.replace(',', '.')).toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '-'}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Vencimento</span>
                                            <div style={{ fontSize: '1rem', color: '#e2e8f0' }}>
                                                {selectedOption.expiration.split('-').reverse().join('/')}
                                            </div>
                                        </div>
                                        <div>
                                            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>Tipo</span>
                                            <div style={{ fontSize: '1rem', color: selectedOption.type === 'CALL' ? '#4ade80' : '#f87171' }}>
                                                {selectedOption.type}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Result Block */}
                                    <div style={{
                                        background: action === 'buy' ? 'rgba(239, 68, 68, 0.1)' : 'rgba(74, 222, 128, 0.1)',
                                        border: action === 'buy' ? '1px solid rgba(239, 68, 68, 0.2)' : '1px solid rgba(74, 222, 128, 0.2)',
                                        borderRadius: '12px', padding: '16px'
                                    }}>
                                        <span style={{ fontSize: '0.9rem', color: action === 'buy' ? '#f87171' : '#4ade80', display: 'block', marginBottom: '4px' }}>
                                            {action === 'buy' ? 'Débito Estimado (Saída)' : 'Crédito Estimado (Entrada)'}
                                        </span>
                                        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: action === 'buy' ? '#f87171' : '#4ade80' }}>
                                            {action === 'buy' ? '-' : '+'} R$ {totalValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            {action === 'sell' && guaranteeVal > 0 && (
                                                <span style={{ fontSize: '1.2rem', marginLeft: '8px', color: '#86efac', fontWeight: 'normal' }}>
                                                    ({((totalValue / guaranteeVal) * 100).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                                                </span>
                                            )}
                                        </div>
                                        <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>
                                            {quantity} ações x R$ {price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>

                                        {/* Projected Return Block (if Target Price is set) */}
                                        {targetPrice && !isNaN(parseFloat(targetPrice.replace(',', '.'))) && (
                                            <div style={{
                                                background: 'rgba(255, 255, 255, 0.05)',
                                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                                borderRadius: '12px', padding: '16px'
                                            }}>
                                                <span style={{ fontSize: '0.9rem', color: '#cbd5e1', display: 'block', marginBottom: '4px' }}>
                                                    Resultado Estimado (na Saída)
                                                </span>
                                                {(() => {
                                                    const exitP = parseFloat(targetPrice.replace(',', '.'));
                                                    const totalEntry = totalValue; // Total paid/received initially
                                                    const totalExit = exitP * quantity;

                                                    // Profit Calculation:
                                                    // If BUY: Exit (Credit) - Entry (Debit)
                                                    // If SELL: Entry (Credit) - Exit (Debit)
                                                    let profit = 0;
                                                    if (action === 'buy') {
                                                        profit = totalExit - totalEntry;
                                                    } else {
                                                        profit = totalEntry - totalExit;
                                                    }

                                                    const isProfit = profit >= 0;
                                                    const roi = totalEntry > 0 ? (profit / totalEntry) * 100 : 0;

                                                    return (
                                                        <div>
                                                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                                                <div style={{ fontSize: '2rem', fontWeight: 'bold', color: isProfit ? '#4ade80' : '#f87171' }}>
                                                                    {isProfit ? '+' : ''} R$ {profit.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                                </div>
                                                                <div style={{ fontSize: '1.2rem', color: isProfit ? '#86efac' : '#fca5a5', fontWeight: 'normal', marginTop: '4px' }}>
                                                                    ({roi.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%)
                                                                </div>
                                                            </div>
                                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '8px' }}>
                                                                {action === 'buy'
                                                                    ? `Pagou R$ ${totalEntry.toFixed(2)} -> Vendeu por R$ ${totalExit.toFixed(2)}`
                                                                    : `Recebeu R$ ${totalEntry.toFixed(2)} -> Recomprou por R$ ${totalExit.toFixed(2)}`
                                                                }
                                                            </div>
                                                        </div>
                                                    );
                                                })()}
                                            </div>
                                        )}
                                    </div>

                                    {/* Guarantee Info for Sell */}
                                    {action === 'sell' && (
                                        <div style={{
                                            marginTop: '16px',
                                            padding: '12px',
                                            background: 'rgba(255, 255, 255, 0.05)',
                                            borderRadius: '12px',
                                            border: '1px dashed rgba(255,255,255,0.2)'
                                        }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                <span style={{ fontSize: '0.9rem', color: '#cbd5e1' }}>Garantia Operacional Estimada</span>
                                                <TrendingUp size={16} color="#cbd5e1" />
                                            </div>
                                            <div style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#fff' }}>
                                                R$ {guaranteeVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                            <div style={{ fontSize: '0.8rem', color: '#94a3b8', marginTop: '4px' }}>
                                                {quantity} ações x Strike (R$ {strikeVal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})
                                            </div>
                                            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '4px', fontStyle: 'italic' }}>
                                                * Valor bloqueado em garantia para venda coberta.
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div >
    );
};

export default OptionsCalculator;
