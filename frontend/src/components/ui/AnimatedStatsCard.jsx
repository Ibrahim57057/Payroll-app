import { motion } from 'framer-motion';
import { useEffect, useState } from 'react';

const AnimatedStatsCard = ({ icon, label, value, subtext, delay = 0, color = '#E65100' }) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        const numericValue = parseFloat(value.replace(/[^0-9.]/g, ''));
        if (isNaN(numericValue)) {
            setCount(value);
            return;
        }

        let start = 0;
        const duration = 1000;
        const step = Math.max(1, numericValue / 30);

        setTimeout(() => {
            const interval = setInterval(() => {
                start += step;
                if (start >= numericValue) {
                    setCount(value);
                    clearInterval(interval);
                } else {
                    setCount(Math.floor(start).toLocaleString());
                }
            }, duration / 30);
        }, delay * 1000 + 200);

        return () => clearInterval(interval);
    }, [value, delay]);

    return (
        <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="bg-white dark:bg-[#252540] p-4 rounded-xl border border-[#E8E8E8] dark:border-[#404060] border-t-4 transition-all duration-300"
            style={{ borderTopColor: color }}
        >
            <p className="text-sm text-[#4A4A5A] dark:text-[#B0B0B8]">
                {icon}
                {label}
            </p>
            <p className="text-2xl font-bold text-[#1A1A2E] dark:text-[#EDEDF0] mt-1">
                {count}
            </p>
            {subtext && (
                <p className="text-xs text-[#8A8A9A] dark:text-[#6B6B7B] mt-1">{subtext}</p>
            )}
        </motion.div>
    );
};

export default AnimatedStatsCard;