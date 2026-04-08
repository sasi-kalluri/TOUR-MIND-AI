
import { motion } from 'framer-motion';

const LoadingSpinner = ({ size = 24, color = "border-slate-900" }) => {
    return (
        <motion.div
            className={ `rounded-full border-2 border-t-transparent ${color}` }
            style={ { width: size, height: size } }
            animate={ { rotate: 360 } }
            transition={ { duration: 1, repeat: Infinity, ease: "linear" } }
        />
    );
};

export default LoadingSpinner;
