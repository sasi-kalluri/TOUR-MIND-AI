
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Mail, CheckCircle, XCircle, ArrowRight } from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

const VerifyEmailPage = () => {
    const { verifyEmail } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    const token = searchParams.get('token');
    const emailHint = searchParams.get('email');

    const [status, setStatus] = useState(token ? 'verifying' : 'instruction'); // verifying, success, error, instruction
    const [message, setMessage] = useState('');

    useEffect(() => {
        if (!token) return;

        const verify = async () => {
            try {
                await verifyEmail(token);
                setStatus('success');
                setMessage('Email verified successfully! You can now log in.');
            } catch (err) {
                setStatus('error');
                setMessage(err.response?.data?.message || 'Verification failed. Token might be invalid or expired.');
            }
        };

        verify();
    }, [token, verifyEmail]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4">
            <motion.div
                initial={ { opacity: 0, scale: 0.95 } }
                animate={ { opacity: 1, scale: 1 } }
                className="w-full max-w-md bg-white p-10 rounded-3xl shadow-xl border border-slate-100 text-center"
            >
                { status === 'instruction' && (
                    <>
                        <div className="w-20 h-20 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <Mail size={ 40 } />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h2>
                        <p className="text-slate-500 mb-6">
                            We've sent a verification link to <span className="font-semibold text-slate-700">{ emailHint || 'your email' }</span>.
                            Please click the link to activate your account.
                        </p>
                        <button onClick={ () => navigate('/login') } className="text-indigo-600 font-medium hover:underline">
                            Back to Login
                        </button>
                    </>
                ) }

                { status === 'verifying' && (
                    <>
                        <div className="mx-auto mb-6 flex justify-center">
                            <LoadingSpinner size={ 60 } color="border-indigo-600" />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Verifying...</h2>
                        <p className="text-slate-500">Please wait while we verify your email address.</p>
                    </>
                ) }

                { status === 'success' && (
                    <>
                        <div className="w-20 h-20 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircle size={ 40 } />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Verified!</h2>
                        <p className="text-slate-500 mb-8">{ message }</p>
                        <button
                            onClick={ () => navigate('/login') }
                            className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2"
                        >
                            Continue to Login <ArrowRight size={ 18 } />
                        </button>
                    </>
                ) }

                { status === 'error' && (
                    <>
                        <div className="w-20 h-20 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <XCircle size={ 40 } />
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Verification Failed</h2>
                        <p className="text-slate-500 mb-8">{ message }</p>
                        <button
                            onClick={ () => navigate('/login') }
                            className="text-slate-600 font-medium hover:text-slate-900"
                        >
                            Return to Login
                        </button>
                    </>
                ) }
            </motion.div>
        </div>
    );
};

export default VerifyEmailPage;
