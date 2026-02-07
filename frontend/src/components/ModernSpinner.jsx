import React from 'react';
import { motion } from 'framer-motion';

const ModernSpinner = ({ size = 60 }) => {
    return (
        <div style={{ position: 'relative', width: size, height: size }}>
            <motion.div
                style={{
                    position: 'absolute', inset: 0,
                    border: '4px solid rgba(74, 222, 128, 0.2)',
                    borderRadius: '50%',
                }}
            />
            <motion.div
                style={{
                    position: 'absolute', inset: 0,
                    border: '4px solid transparent',
                    borderTopColor: '#4ade80',
                    borderRadius: '50%',
                }}
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            {/* Glow Effect only if size is large enough */}
            {size >= 40 && (
                <motion.div
                    style={{
                        position: 'absolute', inset: -10,
                        background: 'radial-gradient(circle, rgba(74, 222, 128, 0.2) 0%, transparent 70%)',
                        borderRadius: '50%',
                        zIndex: -1
                    }}
                    animate={{ scale: [1, 1.2, 1], opacity: [0.5, 0.8, 0.5] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                />
            )}
        </div>
    );
};

export default ModernSpinner;
