import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { UserPlus, Mail, Lock, User, Smartphone, ShieldCheck, Eye, EyeOff, CheckCircle, Copy, Upload, FileText, ScanLine, X } from 'lucide-react';
import toast from 'react-hot-toast';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';

// Set worker source for PDF.js - Use unpkg to match installed version precisely
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

import LoadingSpinner from '../components/LoadingSpinner';

const RegisterPage = () => {
    const [otp, setOtp] = useState('');
    const [step, setStep] = useState(1);
    const { register, completeRegistration, logout } = useAuth(); // Use new completeRegistration
    const navigate = useNavigate();

    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const [mobile, setMobile] = useState('');
    const [alternativePhone, setAlternativePhone] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [registrationToken, setRegistrationToken] = useState(null); // New State
    const [touristId, setTouristId] = useState(null);
    const [createdRole, setCreatedRole] = useState(null);

    // Aadhaar State
    const [aadhaarNumber, setAadhaarNumber] = useState('');
    const [isScanning, setIsScanning] = useState(false);
    const [aadhaarFile, setAadhaarFile] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, scanning, verified, failed

    const preprocessImage = async (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);

                // Image Processing (Grayscale + Binarization)
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    // Increase contrast strongly for text detection
                    const color = avg > 110 ? 255 : 0;
                    data[i] = color;
                    data[i + 1] = color;
                    data[i + 2] = color;
                }
                ctx.putImageData(imageData, 0, 0);

                canvas.toBlob(resolve, 'image/png');
            };
            img.onerror = reject;
            img.src = URL.createObjectURL(file);
        });
    };

    const convertPdfToImage = async (file) => {
        try {
            const arrayBuffer = await file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            const page = await pdf.getPage(1);
            // Scale 3.0 for better quality
            const viewport = page.getViewport({ scale: 3.0 });

            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            await page.render({ canvasContext: context, viewport: viewport }).promise;

            // Image Processing
            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
                const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                // Threshold
                const color = avg > 110 ? 255 : 0;
                data[i] = color;
                data[i + 1] = color;
                data[i + 2] = color;
            }
            context.putImageData(imageData, 0, 0);

            return new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });
        } catch (error) {
            console.error("PDF Conversion Error:", error);
            throw new Error("Failed to process PDF");
        }
    };

    const [detectedNumber, setDetectedNumber] = useState(''); // New State for storing OCR result

    // ... Inside RegisterPage component

    const processAadhaar = async (file) => {
        if (!file) return;
        setAadhaarFile(file);
        setDetectedNumber(''); // Reset previous detection

        setIsScanning(true);
        setVerificationStatus('scanning');

        // Validation: File Type Check
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setVerificationStatus('failed'); // Red Icon
            setIsScanning(false);
            toast.error("Invalid file type. Please upload an Image or PDF.");
            setAadhaarFile(null); // Remove invalid file
            return;
        }

        try {
            let processedBlob = file;

            // Handle PDF or Image
            if (file.type === 'application/pdf') {
                try {
                    toast('Processing PDF...', { icon: '📄' });
                    processedBlob = await convertPdfToImage(file);
                } catch (pdfErr) {
                    console.error(pdfErr);
                    toast.error('Could not read PDF. Please enter manually.');
                    setIsScanning(false);
                    return;
                }
            } else if (file.type.startsWith('image/')) {
                // Preprocess Image for consistency
                processedBlob = await preprocessImage(file);
            }

            const result = await Tesseract.recognize(processedBlob, 'eng');
            const text = result.data.text;
            const aadhaarRegex = /[2-9][0-9]{3}[\s\n]?[0-9]{4}[\s\n]?[0-9]{4}/;
            const match = text.match(aadhaarRegex);

            if (match) {
                const cleanedNumber = match[0].replace(/[\s\n]/g, '');
                if (cleanedNumber.length === 12) {
                    setDetectedNumber(cleanedNumber);
                    setVerificationStatus('verified');
                    toast.success('Aadhaar Detected! Please verify the number matches.');
                } else {
                    setVerificationStatus('failed');
                }
            } else {
                setVerificationStatus('failed');
                // Warn but allow manual override
                toast.error('Could not detect number. If the file is correct, enter Aadhaar manually.');
            }
        } catch (err) {
            console.error(err);
            setVerificationStatus('failed');
            toast.error('Processing failed. Please enter manually.');
        } finally {
            setIsScanning(false);
        }
    };

    const handleRegister = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Validation: Email Format
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!email || !emailRegex.test(email)) {
                toast.error("Please enter a valid email address");
                setLoading(false);
                return;
            }

            if (password !== confirmPassword) {
                toast.error("Passwords do not match!");
                setLoading(false);
                return;
            }

            // Validation: Identity Document is Mandatory
            if (!aadhaarFile) {
                toast.error("Identity Verification Document is required!");
                setError("Please upload Identity Verification Document.");
                setLoading(false);
                return;
            }

            // Validation: Aadhaar Match (Only if auto-detection worked)
            if (detectedNumber && aadhaarNumber !== detectedNumber) {
                toast.error("Entered Aadhaar Number does not match the scanned document.");
                setError("Mismatch: The number you entered does not match the auto-detected number from the file.");
                setLoading(false);
                return;
            }

            // If no number detected, we allow manual entry + file upload. 
            // The verificationStatus will remain 'pending' or 'none' effectively.

            // Step 1: Request OTP - Returns Token
            const res = await register({ name, email, password, mobile, alternativePhone, aadhaarNumber });

            if (res.registrationToken) {
                setRegistrationToken(res.registrationToken);
                toast.success('Registration initiated. OTP sent to email!');
                setStep(2);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Registration failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            // Step 2: Complete Registration with OTP + Token
            const res = await completeRegistration(otp, registrationToken);
            if (res.token) {
                // Step 2.5: If Aadhaar File exists, upload it immediately
                if (aadhaarFile && aadhaarNumber) {
                    try {
                        const formData = new FormData();
                        formData.append('aadhaarNumber', aadhaarNumber);
                        formData.append('documentFile', aadhaarFile);

                        await api.post('/auth/submit-verification', formData, {
                            headers: {
                                'Content-Type': 'multipart/form-data',
                                // Auth header is handled by interceptor or we ensure token is in storage
                                'Authorization': `Bearer ${res.token}`
                            }
                        });
                        toast.success('Documents uploaded for verification!');
                    } catch (uploadErr) {
                        console.error('Upload failed', uploadErr);
                        toast.error('Registered, but document upload failed. User profile to retry.');
                    }
                }

                toast.success(res.message || 'Registration Successful!');
                setTouristId(res.touristId);
                setCreatedRole(res.role);
                setStep(3);
            }
        } catch (err) {
            const msg = err.response?.data?.message || 'Verification failed';
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    }

    // ... (Inside Return)
    // If Step 1 -> Show Registration Form
    // If Step 2 -> Show OTP Form

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 relative overflow-hidden px-4 sm:px-6 font-sans">
            {/* Clean Background - Subtle Blue Gradient */ }
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-blue-100/40 via-slate-50 to-slate-50"></div>

            <div className="fixed top-8 left-8 z-20 cursor-pointer" onClick={ () => navigate('/') }>
                <div className="flex items-center gap-3 group">
                    <div className="w-10 h-10 bg-white shadow-lg shadow-blue-500/5 rounded-xl flex items-center justify-center text-blue-600 border border-slate-100 group-hover:scale-110 transition-transform duration-300">
                        <UserPlus size={ 20 } strokeWidth={ 2.5 } />
                    </div>
                    <span className="text-xl font-black text-slate-800 tracking-tight group-hover:text-blue-600 transition-colors">AI<span className="text-blue-600">Tourism</span></span>
                </div>
            </div>

            <motion.div
                initial={ { opacity: 0, y: 20 } }
                animate={ { opacity: 1, y: 0 } }
                transition={ { duration: 0.5, ease: "easeOut" } }
                className="w-full max-w-[800px] relative z-10 bg-white/80 backdrop-blur-3xl p-4 sm:p-6 rounded-[2rem] shadow-[0_30px_60px_-15px_rgba(0,0,0,0.1)] border border-white/60 ring-1 ring-slate-100"
            >
                <div className="text-center mb-10">
                    <motion.div
                        whileHover={ { scale: 1.05, rotate: 5 } }
                        className="w-16 h-16 mx-auto rounded-2xl flex items-center justify-center mb-6 text-white shadow-lg shadow-blue-500/20 bg-blue-600"
                    >
                        { step === 1 ? <UserPlus size={ 28 } strokeWidth={ 2 } /> : <ShieldCheck size={ 28 } strokeWidth={ 2 } /> }
                    </motion.div>

                    <h2 className="text-3xl font-black mb-2 text-slate-800 tracking-tight">
                        { step === 1 ? 'Create Account' : step === 2 ? 'Verify Email' : 'Welcome!' }
                    </h2>
                    <p className="text-sm font-semibold text-slate-400">
                        { step === 1 ? 'Start your AI-secured journey today' : step === 2 ? `Enter OTP sent to ${email} ` : 'Your account has been created successfully' }
                    </p>
                </div>

                { error && (
                    <motion.div initial={ { opacity: 0, height: 0 } } animate={ { opacity: 1, height: 'auto' } } className="p-4 rounded-xl mb-6 text-center text-xs font-bold bg-rose-50 border border-rose-100 text-rose-600 flex items-center justify-center gap-2">
                        <ShieldCheck size={ 14 } /> { error }
                    </motion.div>
                ) }

                { step === 1 && (
                    <form onSubmit={ handleRegister } className="space-y-5">
                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Full Name</label>
                            <div className="relative group">
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                <input
                                    type="text"
                                    value={ name }
                                    onChange={ (e) => setName(e.target.value) }
                                    className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                    placeholder="John Doe"
                                    required
                                    autoComplete="name"
                                />
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Email Address</label>
                            <div className="relative group">
                                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                <input
                                    type="email"
                                    value={ email }
                                    onChange={ (e) => setEmail(e.target.value) }
                                    className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                    placeholder="name@company.com"
                                    required
                                    autoComplete="email"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Mobile</label>
                                <div className="relative group">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                    <input
                                        type="tel"
                                        value={ mobile }
                                        onChange={ (e) => setMobile(e.target.value) }
                                        className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
                                        placeholder="1234567890"
                                        required
                                        autoComplete="tel"
                                    />
                                </div>
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Alt. Phone</label>
                                <div className="relative group">
                                    <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                    <input
                                        type="tel"
                                        value={ alternativePhone }
                                        onChange={ (e) => setAlternativePhone(e.target.value) }
                                        className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
                                        placeholder="(Optional) Eg: 9876543210"
                                        autoComplete="tel"
                                    />
                                </div>
                            </div>
                        </div>


                        {/* Aadhaar Verification Section - Grid Layout */ }
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                            {/* Col 1: Aadhaar Input */ }
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Aadhaar Number</label>
                                <div className="relative group">
                                    <ScanLine className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                    <input
                                        type="text"
                                        value={ aadhaarNumber }
                                        onChange={ (e) => setAadhaarNumber(e.target.value.replace(/[^0-9]/g, '')) }
                                        className="w-full h-[58px] border-none bg-slate-50 rounded-xl pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
                                        placeholder="Enter 12-digit Number"
                                        maxLength={ 12 }
                                        autoComplete="off"
                                        required
                                    />
                                </div>
                            </div>

                            {/* Col 2: Verification Upload */ }
                            <div className="space-y-1.5">
                                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500 flex justify-between">
                                    <span>Identity Document</span>
                                    { isScanning && <span className="text-blue-600 animate-pulse text-[10px] font-bold">Scanning...</span> }
                                </label>
                                <div className="relative group">
                                    <div className="flex items-center gap-2 h-[58px] bg-slate-50 rounded-xl px-2 border border-transparent focus-within:bg-white focus-within:ring-2 focus-within:ring-blue-500/20 transition-all">
                                        <input
                                            type="file"
                                            accept="image/*,application/pdf"
                                            onChange={ (e) => processAadhaar(e.target.files[0]) }
                                            onClick={ (e) => (e.target.value = null) } // Allow re-selecting same file
                                            className="hidden"
                                            id="aadhaar-upload"
                                        />
                                        <label htmlFor="aadhaar-upload" className="cursor-pointer h-10 flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm active:scale-95 shrink-0">
                                            <Upload size={ 16 } />
                                            <span className="text-xs font-bold whitespace-nowrap">Upload ID</span>
                                        </label>

                                        { aadhaarFile ? (
                                            <div className="flex-1 min-w-0 flex items-center gap-2 bg-blue-100/50 px-3 py-2 rounded-md text-blue-700 h-10">
                                                <FileText size={ 14 } className="shrink-0" />
                                                <span className="text-xs font-bold truncate max-w-[100px]">{ aadhaarFile.name }</span>
                                                <button onClick={ (e) => { e.preventDefault(); setAadhaarFile(null); setDetectedNumber(''); setVerificationStatus('pending'); } } className="ml-auto hover:text-red-500 shrink-0"><X size={ 14 } /></button>
                                            </div>
                                        ) : (
                                            <span className="text-[10px] text-slate-400 font-medium ml-1 truncate">Required for verification</span>
                                        ) }
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Detected Result - Full Width */ }
                        <div className="relative">
                            <AnimatePresence>
                                { detectedNumber && (
                                    <motion.div
                                        initial={ { opacity: 0, height: 0, marginTop: 0 } }
                                        animate={ { opacity: 1, height: 'auto', marginTop: 8 } }
                                        exit={ { opacity: 0, height: 0, marginTop: 0 } }
                                        className={ `w-full p-4 rounded-xl border-l-[6px] shadow-sm ${detectedNumber === aadhaarNumber ? 'bg-emerald-50 border-white border-l-emerald-500' : 'bg-rose-50 border-white border-l-rose-500'}` }
                                    >
                                        <div className="flex items-center justify-between select-none">
                                            <div className="flex flex-col">
                                                <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Detected Number</span>
                                                <span className="text-xl font-mono font-black tracking-widest">{ detectedNumber }</span>
                                            </div>

                                            <div className="text-right">
                                                { detectedNumber === aadhaarNumber ? (
                                                    <div className="flex items-center gap-2 text-emerald-700 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                                                        <CheckCircle size={ 18 } className="fill-current" />
                                                        <span className="text-xs font-bold">Matched Successfully</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-rose-700 bg-white px-3 py-1.5 rounded-lg shadow-sm">
                                                        <X size={ 18 } />
                                                        <span className="text-xs font-bold">Mismatch Detected</span>
                                                    </div>
                                                ) }
                                            </div>
                                        </div>
                                        { detectedNumber !== aadhaarNumber && (
                                            <p className="text-[11px] font-semibold text-rose-600 mt-2 text-right">
                                                The document number does not match your entered number.<br />Please correct the input or upload a clearer image.
                                            </p>
                                        ) }
                                    </motion.div>
                                ) }
                            </AnimatePresence>
                        </div>


                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                <input
                                    type={ showPassword ? "text" : "password" }
                                    value={ password }
                                    onChange={ (e) => setPassword(e.target.value) }
                                    className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-12 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={ () => setShowPassword(!showPassword) }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                >
                                    { showPassword ? <EyeOff size={ 18 } strokeWidth={ 2.5 } /> : <Eye size={ 18 } strokeWidth={ 2.5 } /> }
                                </button>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Confirm Password</label>
                            <div className="relative group">
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                <input
                                    type={ showConfirmPassword ? "text" : "password" }
                                    value={ confirmPassword }
                                    onChange={ (e) => setConfirmPassword(e.target.value) }
                                    className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-12 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                    placeholder="••••••••"
                                    required
                                    autoComplete="new-password"
                                />
                                <button
                                    type="button"
                                    onClick={ () => setShowConfirmPassword(!showConfirmPassword) }
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600 transition-colors focus:outline-none"
                                >
                                    { showConfirmPassword ? <EyeOff size={ 18 } strokeWidth={ 2.5 } /> : <Eye size={ 18 } strokeWidth={ 2.5 } /> }
                                </button>
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={ loading }
                            className="w-full font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 mt-4 transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                        >
                            { loading ? <LoadingSpinner size={ 20 } color="border-white" /> : 'Create Account' }
                        </button>
                    </form >
                ) }

                {
                    step === 2 && (
                        <form onSubmit={ handleVerify } className="space-y-6">
                            <div className="space-y-2 text-center">
                                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-400">One-Time Password</label>
                                <input
                                    type="text"
                                    value={ otp }
                                    onChange={ (e) => setOtp(e.target.value) }
                                    className="w-full border-none bg-slate-50 rounded-xl py-5 text-center text-3xl font-black tracking-[1em] text-slate-800 placeholder-slate-200 focus:outline-none focus:ring-4 focus:ring-blue-500/10 focus:bg-white transition-all"
                                    placeholder="000000"
                                    maxLength={ 6 }
                                    required
                                    autoComplete="one-time-code"
                                />
                            </div>
                            <button type="submit" disabled={ loading } className="w-full font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white">
                                { loading ? <LoadingSpinner size={ 20 } color="border-white" /> : 'Verify & Continue' }
                            </button>
                        </form>
                    )
                }

                {
                    step === 3 && (
                        <div className="space-y-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-2xl p-6 text-center">
                                <p className="text-xs font-bold text-blue-500 uppercase tracking-wider mb-2">Your Tourist ID</p>
                                <div className="flex items-center justify-center gap-2">
                                    <span className="text-2xl sm:text-3xl font-black text-blue-900 tracking-widest">{ touristId || 'TRST-PENDING' }</span>
                                    <button
                                        onClick={ () => {
                                            navigator.clipboard.writeText(touristId);
                                            toast.success('Tourist ID Copied!');
                                        } }
                                        className="p-2 hover:bg-blue-100 rounded-full text-blue-500 transition-colors"
                                    >
                                        <Copy size={ 18 } />
                                    </button>
                                </div>
                                <p className="text-xs font-medium text-slate-400 mt-2">Please save this ID for future reference.</p>
                            </div>

                            <button
                                onClick={ () => { logout(); navigate('/login'); } }
                                className="w-full font-bold py-4 rounded-xl shadow-lg shadow-blue-500/30 transition-all hover:-translate-y-1 active:scale-[0.98] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white"
                            >
                                Continue to Login
                            </button>
                        </div>
                    )
                }


                <div className="mt-8 text-center">
                    <p className="text-sm font-semibold text-slate-400">
                        Already have an account?{ ' ' }
                        <Link to="/login" className="font-bold transition-colors text-blue-600 hover:text-blue-700 hover:underline decoration-2 underline-offset-4">
                            Login
                        </Link>
                    </p>
                </div>

            </motion.div >
        </div >
    );

};

export default RegisterPage;
