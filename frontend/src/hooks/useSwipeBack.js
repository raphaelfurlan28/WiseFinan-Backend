import { useEffect, useRef } from 'react';

/**
 * Custom hook to detect a "swipe back" gesture (left-to-right from the left edge).
 * @param {Function} onBack - Callback function to trigger when a valid back swipe is detected.
 * @param {number} threshold - Minimum distance (px) the user must swipe to trigger logic (default 100).
 * @param {number} edgeLimit - Max distance (px) from the left edge where the swipe must start (default 50).
 */
export function useSwipeBack(onBack, threshold = 100, edgeLimit = 50) {
    const touchStartRef = useRef(null);
    const touchMoveRef = useRef(null);

    useEffect(() => {
        const handleTouchStart = (e) => {
            const touch = e.touches[0];
            // Only consider swipes starting from the very left edge
            if (touch.clientX <= edgeLimit) {
                touchStartRef.current = { x: touch.clientX, y: touch.clientY };
            } else {
                touchStartRef.current = null;
            }
        };

        const handleTouchMove = (e) => {
            if (!touchStartRef.current) return;
            touchMoveRef.current = e.touches[0];
        };

        const handleTouchEnd = () => {
            if (!touchStartRef.current || !touchMoveRef.current) {
                // Reset
                touchStartRef.current = null;
                touchMoveRef.current = null;
                return;
            }

            const startX = touchStartRef.current.x;
            const startY = touchStartRef.current.y;
            const endX = touchMoveRef.current.clientX;
            const endY = touchMoveRef.current.clientY;

            const diffX = endX - startX;
            const diffY = Math.abs(endY - startY);

            // Logic:
            // 1. diffX > threshold (swiped right far enough)
            // 2. diffY < diffX (horizontal swipe, not diagonal/vertical scroll)
            if (diffX > threshold && diffX > diffY) {
                if (onBack) onBack();
            }

            // Reset
            touchStartRef.current = null;
            touchMoveRef.current = null;
        };

        // Add event listeners
        window.addEventListener('touchstart', handleTouchStart);
        window.addEventListener('touchmove', handleTouchMove);
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchstart', handleTouchStart);
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
        };
    }, [onBack, threshold, edgeLimit]);
}
