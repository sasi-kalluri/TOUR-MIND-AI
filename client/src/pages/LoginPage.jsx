import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ShieldCheck, Mail, Lock, KeyRound, Eye, EyeOff, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';

import LoadingSpinner from '../components/LoadingSpinner';

const LoginPage = () => {
    const { login, verifyOTP, verifyAdminCode, verifyLogin2FA } = useAuth();
    const navigate = useNavigate();

    const [loading, setLoading] = useState(false);
    const [step, setStep] = useState(1); // 1: Creds, 2: OTP, 3: AdminCode, 4: 2FA
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [otp, setOtp] = useState('');
    const [adminCode, setAdminCode] = useState('');
    const [twoFACode, setTwoFACode] = useState('');
    const [tempToken, setTempToken] = useState('');
    const [error, setError] = useState('');
    const [isAdminLogin, setIsAdminLogin] = useState(false);

    // Auto-detect and Redirect if already logged in
    const { user } = useAuth();
    useEffect(() => {
        if (user) {
            if (user.role === 'admin') {
                navigate('/admin-dashboard');
            } else {
                navigate('/dashboard');
            }
        }
    }, [user, navigate]);

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await login(email, password, isAdminLogin);
            if (res.requireTwoFactor) {
                // Email OTP Required (Step 2)
                setStep(2);
                toast.success(res.message);
            } else if (res.token) {
                toast.success('Login Successful!');
                navigate('/dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Login failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyOTP = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await verifyOTP(email, otp);
            if (res.requireAdminCode) {
                setStep(3);
                toast.success(res.message);
            } else if (res.require2FA) {
                setTempToken(res.tempToken);
                setStep(4);
                toast.success(res.message);
            } else if (res.token) {
                toast.success('Authentication Successful!');
                navigate('/dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'OTP Verification failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAdminCode = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await verifyAdminCode(email, adminCode);
            if (res.require2FA) {
                setTempToken(res.tempToken);
                setStep(4);
                toast.success(res.message);
            } else if (res.token) {
                toast.success('Admin Dashboard Access Granted');
                navigate('/admin-dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Admin Code failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify2FA = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await verifyLogin2FA(tempToken, twoFACode);
            if (res.token) {
                toast.success('Login Successful!');
                if (res.role === 'admin') navigate('/admin-dashboard');
                else navigate('/dashboard');
            }
        } catch (err) {
            const msg = err.response?.data?.message || '2FA Verification failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={ `min-h-screen flex items-center justify-center relative overflow-hidden px-4 sm:px-6 font-sans transition-colors duration-500 ${step === 3 ? 'bg-slate-950' : 'bg-slate-50'}` }>

            {/* Animated Background */ }
            <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
                <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-100/50 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-blob"></div>
                <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-100/50 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-blob animation-delay-2000"></div>
                <div className="absolute top-[20%] left-[20%] w-[400px] h-[400px] bg-emerald-100/30 rounded-full blur-[100px] mix-blend-multiply opacity-70 animate-blob animation-delay-4000"></div>
            </div>

            {/* Brand Logo - Absolute Top Left */ }
            <div className="absolute top-6 left-6 z-20 cursor-pointer" onClick={ () => navigate('/') }>
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-tr from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                        <KeyRound size={ 18 } className="sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-lg font-bold text-slate-900 tracking-tight">AI<span className="text-blue-600">Tourism</span></span>
                </div>
            </div>

            <motion.div
                initial={ { opacity: 0, scale: 0.95 } }
                animate={ { opacity: 1, scale: 1 } }
                transition={ { duration: 0.5, ease: "easeOut" } }
                className={ `w-full max-w-[400px] relative z-10 transition-all duration-500 ${step === 3 ? 'bg-slate-900 border-slate-800' : 'bg-white/80 border-white/50'} backdrop-blur-2xl p-8 sm:p-10 rounded-[2.5rem] shadow-2xl border` }
            >
                <div className="text-center mb-8">
                    <motion.div
                        initial={ { scale: 0 } } animate={ { scale: 1 } }
                        className={ `w-16 h-16 mx-auto rounded-3xl flex items-center justify-center mb-6 shadow-xl transition-colors duration-500 ${step === 1 ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-blue-500/30' :
                            step === 2 ? 'bg-gradient-to-br from-emerald-400 to-emerald-600 text-white shadow-emerald-500/30' :
                                step === 3 ? 'bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-rose-500/30' :
                                    'bg-gradient-to-br from-amber-400 to-amber-600 text-white shadow-amber-500/30'
                            }` }
                    >
                        { step === 1 && <Lock size={ 28 } /> }
                        { step === 2 && <Mail size={ 28 } /> }
                        { step === 3 && <ShieldCheck size={ 28 } /> }
                        { step === 4 && <Smartphone size={ 28 } /> }
                    </motion.div>

                    <h2 className={ `text-2xl sm:text-3xl font-bold mb-2 transition-colors ${step === 3 ? 'text-white' : 'text-slate-900'}` }>
                        { step === 1 ? (isAdminLogin ? 'Admin Portal' : 'Welcome Back') :
                            step === 2 ? 'Verify Identity' :
                                step === 3 ? 'Admin Portal' : 'Two-Factor Auth' }
                    </h2>
                    <p className={ `text-sm font-medium transition-colors ${step === 3 ? 'text-slate-400' : 'text-slate-500'}` }>
                        { step === 1 ? 'Enter your credentials to continue' :
                            step === 2 ? `Enter the code sent to ${email}` :
                                step === 3 ? 'Restricted Area: Enter Security Code' :
                                    'Enter the code from your Authenticator App' }
                    </p>
                </div>

                { error && (
                    <motion.div initial={ { opacity: 0, y: -10 } } animate={ { opacity: 1, y: 0 } } className="bg-red-50/10 border border-red-500/20 text-red-500 p-3 rounded-xl mb-6 text-center text-xs font-semibold flex items-center justify-center gap-2">
                        <ShieldCheck size={ 14 } /> { error }
                    </motion.div>
                ) }

                <AnimatePresence mode='wait'>
                    { step === 1 && (
                        <motion.form key="step1" initial={ { opacity: 0, x: -20 } } animate={ { opacity: 1, x: 0 } } exit={ { opacity: 0, x: 20 } } onSubmit={ handleLogin } className="space-y-5">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Email or Mobile Number</label>
                                <div className="relative group">
                                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={ 18 } />
                                    <input
                                        type="text"
                                        value={ email }
                                        onChange={ (e) => setEmail(e.target.value) }
                                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-4 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                        placeholder="admin@example.com / 9876543210"
                                        required
                                        autoComplete="username"
                                    />
                                </div>
                            </div>

                            {/* Password Field - Only for Tourists */ }
                            { !isAdminLogin && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Password</label>
                                    <div className="relative group">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-blue-500 transition-colors" size={ 18 } />
                                        <input
                                            type={ showPassword ? "text" : "password" }
                                            value={ password }
                                            onChange={ (e) => setPassword(e.target.value) }
                                            className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-3.5 pl-11 pr-12 text-slate-900 font-medium focus:outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all"
                                            placeholder="••••••••"
                                            required={ !isAdminLogin }
                                            autoComplete="current-password"
                                        />
                                        <button
                                            type="button"
                                            onClick={ () => setShowPassword(!showPassword) }
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                        >
                                            { showPassword ? <EyeOff size={ 18 } /> : <Eye size={ 18 } /> }
                                        </button>
                                    </div>
                                    <div className="text-right">
                                        <button type="button" onClick={ () => navigate('/forgot-password') } className="text-xs font-bold text-blue-600 hover:text-blue-700 transition-colors">Forgot Password?</button>
                                    </div>
                                </div>
                            ) }

                            {/* Admin Toggle */ }
                            <div className="flex items-center gap-2 cursor-pointer mb-2" onClick={ () => setIsAdminLogin(!isAdminLogin) }>
                                <div className={ `w-10 h-6 rounded-full p-1 transition-colors duration-300 ${isAdminLogin ? 'bg-slate-900' : 'bg-slate-200'}` }>
                                    <div className={ `w-4 h-4 bg-white rounded-full shadow-sm transition-transform duration-300 ${isAdminLogin ? 'translate-x-4' : ''}` } />
                                </div>
                                <span className={ `text-xs font-bold uppercase tracking-wider transition-colors ${isAdminLogin ? 'text-slate-900' : 'text-slate-400'}` }>
                                    { isAdminLogin ? 'Logging in as Administrator' : 'Login as Administrator' }
                                </span>
                            </div>

                            <button type="submit" disabled={ loading } className={ `w-full font-bold py-4 rounded-2xl shadow-xl transition-all active:scale-[0.98] flex items-center justify-center gap-2 ${isAdminLogin ? 'bg-slate-900 hover:bg-slate-800 text-white shadow-slate-900/20' : 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-500/20'}` }>
                                { loading ? <LoadingSpinner size={ 20 } color="border-white" /> : (isAdminLogin ? 'Send Secure Code' : 'Sign In') }
                            </button>
                        </motion.form>
                    ) }

                    { step === 2 && (
                        <motion.form key="step2" initial={ { opacity: 0, x: 20 } } animate={ { opacity: 1, x: 0 } } exit={ { opacity: 0, x: -20 } } onSubmit={ handleVerifyOTP } className="space-y-6">
                            <div className="space-y-2 text-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">One-Time Password</label>
                                <input
                                    type="text"
                                    value={ otp }
                                    onChange={ (e) => setOtp(e.target.value) }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 text-center text-3xl font-bold tracking-[1rem] text-slate-900 focus:outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 transition-all"
                                    placeholder="000000"
                                    maxLength={ 6 }
                                    required
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <button type="submit" disabled={ loading } className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-4 rounded-2xl shadow-xl shadow-emerald-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                { loading ? <LoadingSpinner size={ 20 } color="border-white" /> : 'Verify Securely' }
                            </button>
                        </motion.form>
                    ) }

                    { step === 3 && (
                        <motion.form key="step3" initial={ { opacity: 0, scale: 0.9 } } animate={ { opacity: 1, scale: 1 } } exit={ { opacity: 0, scale: 0.9 } } onSubmit={ handleVerifyAdminCode } className="space-y-6">
                            <div className="space-y-4">
                                <div className="text-center">
                                    <label className="text-xs font-bold text-rose-300 uppercase tracking-[0.2em] mb-2 block">Authorized Personnel Only</label>
                                </div>
                                <div className="relative group">
                                    <KeyRound className="absolute left-5 top-1/2 -translate-y-1/2 text-rose-500 group-focus-within:text-rose-400 group-focus-within:animate-pulse transition-colors" size={ 24 } />
                                    <input
                                        type="password"
                                        value={ adminCode }
                                        onChange={ (e) => setAdminCode(e.target.value) }
                                        className="w-full bg-slate-900/50 border-2 border-slate-700/50 rounded-2xl py-5 pl-14 pr-4 text-white text-xl font-mono font-bold tracking-[0.5em] text-center focus:outline-none focus:border-rose-500 focus:shadow-[0_0_20px_rgba(244,63,94,0.3)] transition-all placeholder:text-slate-600 placeholder:tracking-normal placeholder:font-sans placeholder:text-sm"
                                        placeholder="ENTER SECURITY CODE"
                                        required
                                        autoComplete="off"
                                    />
                                </div>
                                <p className="text-center text-[10px] text-slate-500 font-mono">
                                    SESSION ID: { Math.random().toString(36).substr(2, 9).toUpperCase() }
                                </p>
                            </div>
                            <button type="submit" disabled={ loading } className="w-full bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold py-4 rounded-2xl shadow-xl shadow-rose-900/40 transition-all active:scale-[0.98] flex items-center justify-center gap-2">
                                { loading ? <LoadingSpinner size={ 20 } color="border-white" /> : 'Authenticate System' }
                            </button>
                        </motion.form>
                    ) }

                    { step === 4 && (
                        <motion.form key="step4" initial={ { opacity: 0, x: 20 } } animate={ { opacity: 1, x: 0 } } exit={ { opacity: 0, x: -20 } } onSubmit={ handleVerify2FA } className="space-y-6">
                            <div className="space-y-2 text-center">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Authenticator Code</label>
                                <input
                                    type="text"
                                    value={ twoFACode }
                                    onChange={ (e) => setTwoFACode(e.target.value.replace(/\D/g, '').slice(0, 6)) }
                                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl py-4 text-center text-3xl font-bold tracking-[1rem] text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/10 transition-all placeholder:text-slate-300"
                                    placeholder="000000"
                                    maxLength={ 6 }
                                    required
                                    autoComplete="one-time-code"
                                    autoFocus
                                />
                            </div>
                            <button type="submit" disabled={ loading || twoFACode.length !== 6 } className="w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-4 rounded-2xl shadow-xl shadow-amber-500/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 disabled:opacity-70 disabled:cursor-not-allowed">
                                { loading ? <LoadingSpinner size={ 20 } color="border-white" /> : 'Verify Login' }
                            </button>
                        </motion.form>
                    ) }
                </AnimatePresence>

                {
                    step === 1 && (
                        <div className="mt-8 text-center">
                            <p className="text-slate-500 text-sm font-medium">
                                Don't have an account? <Link to="/register" className="text-blue-600 hover:text-blue-700 font-bold transition-colors">Sign Up</Link>
                            </p>
                        </div>
                    )
                }
            </motion.div >
        </div >
    );
};

export default LoginPage;
