import { motion } from 'framer-motion';

const AnimatedButton = ({ children, onClick, variant = 'primary', className = '', ...props }) => {
    const variants = {
        idle: { scale: 1 },
        hover: { scale: 1.03 },
        tap: { scale: 0.97 }
    };

    const getVariantClasses = () => {
        const classes = {
            primary: 'bg-[#E65100] hover:bg-[#BF360C] text-white',
            secondary: 'bg-[#00843D] hover:bg-[#005A2C] text-white',
            outline: 'bg-transparent border-2 border-[#E65100] text-[#E65100] hover:bg-[#FFF3E0]',
            danger: 'bg-[#D32F2F] hover:bg-[#B71C1C] text-white',
        };
        return classes[variant] || classes.primary;
    };

    return (
        <motion.button
            variants={variants}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            onClick={onClick}
            className={`font-semibold py-2.5 px-6 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 min-h-[44px] ${getVariantClasses()} ${className}`}
            {...props}
        >
            {children}
        </motion.button>
    );
};

export default AnimatedButton;