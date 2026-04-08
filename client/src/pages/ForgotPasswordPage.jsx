
import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, ArrowLeft } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const ForgotPasswordPage = () => {
    const { forgotPassword } = useAuth();
    const navigate = useNavigate();

    const [email, setEmail] = useState('');
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setMessage('');
        setLoading(true);
        try {
            const res = await forgotPassword(email);
            setMessage(res.message || 'If an account exists, a reset link has been sent.');
        } catch (err) {
            setError(err.response?.data?.message || 'Request failed');
        } finally {
            setLoading(false);
        }
    };

    return (

        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4 sm:px-6 font-sans">

            {/* Animated Background */ }
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-100/50 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-blob"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-indigo-100/30 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Brand Logo - Absolute Top Left */ }
            <div className="absolute top-6 left-6 z-20 cursor-pointer" onClick={ () => navigate('/') }>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <Mail size={ 18 } className="sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">AI<span className="text-blue-600">Tourism</span></span>
                </div>
            </div>

            <motion.div
                initial={ { opacity: 0, scale: 0.95 } }
                animate={ { opacity: 1, scale: 1 } }
                transition={ { duration: 0.5, ease: "easeOut" } }
                className="w-full max-w-[400px] relative z-10 bg-white/80 backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border border-white/50"
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={ { scale: 0 } }
                        animate={ { scale: 1 } }
                        className="w-16 h-16 mx-auto rounded-3xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center mb-6 text-white shadow-lg shadow-amber-500/30"
                    >
                        <Mail size={ 28 } />
                    </motion.div>

                    <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
                        Forgot Password?
                    </h2>
                    <p className="text-sm font-medium text-slate-500">
                        No worries, we'll send you reset instructions.
                    </p>
                </div>

                { error && (
                    <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: 'auto' } } className="bg-red-50/50 border border-red-100 text-red-600 p-3 rounded-xl mb-6 text-center text-xs font-semibold">
                        { error }
                    </motion.div>
                ) }

                { message && (
                    <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: 'auto' } } className="bg-emerald-50/50 border border-emerald-100 text-emerald-600 p-3 rounded-xl mb-6 text-center text-xs font-semibold">
                        { message }
                    </motion.div>
                ) }

                <form onSubmit={ handleSubmit } className="space-y-6">
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email Address</label>
                        <div className="relative group">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-amber-500 transition-colors" size={ 18 } />
                            <input
                                type="email"
                                value={ email }
                                onChange={ (e) => setEmail(e.target.value) }
                                className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-slate-900 font-medium focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all"
                                placeholder="name@company.com"
                                required
                                autoComplete="email"
                            />
                        </div>
                    </div>

                    <button
                        type="submit"
                        disabled={ loading }
                        className="w-full bg-slate-900 hover:bg-slate-800 text-white font-bold py-4 rounded-2xl shadow-xl shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                    >
                        { loading ? <LoadingSpinner size={ 20 } color="border-white" /> : 'Send Reset Link' }
                    </button>
                </form>

                <div className="mt-8 text-center bg-slate-50/50 p-4 rounded-2xl border border-slate-100">
                    <Link to="/login" className="text-slate-500 hover:text-slate-800 font-bold text-sm inline-flex items-center gap-2 transition-colors group">
                        <ArrowLeft size={ 16 } className="group-hover:-translate-x-1 transition-transform" /> Back to Login
                    </Link>
                </div>
            </motion.div>
        </div>
    );
};

export default ForgotPasswordPage;
