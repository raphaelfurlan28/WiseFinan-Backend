import React from 'react';
import { motion } from 'framer-motion';
import ModernSpinner from './ModernSpinner';

const ModernLoader = ({ text = "Carregando..." }) => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0, 0, 0, 0.4)', // Slightly dark for contrast, but transparent
            backdropFilter: 'blur(15px)', // Heavy blur as requested "embassado"
        }}>
            {/* Animated Circle */}
            <ModernSpinner size={60} />

            {/* Loading Text */}
            <motion.p
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                    marginTop: '24px',
                    fontSize: '1rem',
                    fontWeight: '500',
                    color: '#fff',
                    letterSpacing: '0.5px',
                    textShadow: '0 2px 4px rgba(0,0,0,0.5)'
                }}
            >
                {text}
            </motion.p>
        </div>
    );
};
export default ModernLoader;
