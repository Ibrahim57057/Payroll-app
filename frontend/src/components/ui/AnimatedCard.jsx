import { motion } from 'framer-motion';

const AnimatedCard = ({ children, className = '', delay = 0, ...props }) => {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay, ease: "easeOut" }}
            className={`bg-white dark:bg-[#252540] rounded-xl border border-[#E8E8E8] dark:border-[#404060] shadow-sm hover:shadow-md transition-all duration-300 ${className}`}
            {...props}
        >
            {children}
        </motion.div>
    );
};

export default AnimatedCard;