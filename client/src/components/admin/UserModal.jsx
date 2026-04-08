import React, { useState, useEffect } from 'react';
import { X, User, UserPlus, Mail, Shield, Phone, Lock, CheckCircle, Upload, FileText, ScanLine, Smartphone, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import Tesseract from 'tesseract.js';
import * as pdfjsLib from 'pdfjs-dist';
import api from '../../services/api';
import toast from 'react-hot-toast';

// PDF Worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;

const UserModal = ({ isOpen, onClose, onEdit, onRegister, onVerify, user = null }) => {
    // Basic Form State
    const [formData, setFormData] = useState({
        name: '', email: '', role: 'user', mobile: '', alternativePhone: '', aadhaarNumber: '', password: '', confirmPassword: ''
    });

    // Flow State
    const [step, setStep] = useState('details'); // 'details' | 'verify'
    const [otp, setOtp] = useState('');
    const [regToken, setRegToken] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);

    // Aadhaar State
    const [isScanning, setIsScanning] = useState(false);
    const [aadhaarFile, setAadhaarFile] = useState(null);
    const [verificationStatus, setVerificationStatus] = useState('pending'); // pending, scanning, verified, failed
    const [detectedNumber, setDetectedNumber] = useState('');

    // Initialize
    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || '',
                role: user.role || 'user',
                mobile: user.mobile || user.phoneNumber || '',
                alternativePhone: user.alternativePhone || '',
                aadhaarNumber: user.aadhaarNumber || '',
                password: '',
                confirmPassword: ''
            });
            setStep('details');
            setVerificationStatus(user.isAadhaarVerified ? 'verified' : 'pending');
        } else {
            setFormData({
                name: '', email: '', role: 'user', mobile: '', alternativePhone: '',
                aadhaarNumber: '', password: '', confirmPassword: ''
            });
            setStep('details');
            setOtp('');
            setRegToken(null);
            setAadhaarFile(null);
            setDetectedNumber('');
            setVerificationStatus('pending');
        }
    }, [user, isOpen]);

    // --- Aadhaar Helpers (From RegisterPage) ---
    const preprocessImage = async (file) => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                const ctx = canvas.getContext('2d');
                canvas.width = img.width;
                canvas.height = img.height;
                ctx.drawImage(img, 0, 0);
                const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
                const data = imageData.data;
                for (let i = 0; i < data.length; i += 4) {
                    const avg = (data[i] + data[i + 1] + data[i + 2]) / 3;
                    const color = avg > 110 ? 255 : 0;
                    data[i] = color; data[i + 1] = color; data[i + 2] = color;
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
            const viewport = page.getViewport({ scale: 3.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;
            await page.render({ canvasContext: context, viewport: viewport }).promise;
            return new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
        } catch (error) {
            throw new Error("Failed to process PDF");
        }
    };

    const processAadhaar = async (file) => {
        if (!file) return;
        setAadhaarFile(file);
        setDetectedNumber('');
        setIsScanning(true);
        setVerificationStatus('scanning');

        // Validation: File Type Check
        if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
            setVerificationStatus('failed');
            setIsScanning(false);
            toast.error("Invalid file type. Please upload an Image or PDF.");
            setAadhaarFile(null); // Auto-remove invalid file
            return;
        }

        try {
            let processedBlob = file;
            if (file.type === 'application/pdf') {
                processedBlob = await convertPdfToImage(file);
            } else if (file.type.startsWith('image/')) {
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
                    setVerificationStatus('verified'); // OCR Success
                    toast.success('Aadhaar Detected! Please verify the number matches.');
                } else {
                    setVerificationStatus('failed'); // Found something but length wrong?
                }
            } else {
                setVerificationStatus('failed');
                // Don't auto-remove file, user might want to manual verify. 
                // But warn clearly.
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            // Validation: Common for both
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!formData.email || !emailRegex.test(formData.email)) {
                toast.error("Please enter a valid email address");
                setIsLoading(false);
                return;
            }

            if (step === 'details') {

                // Validation: New User Logic Mirrors Registration
                if (!user) {
                    if (formData.password !== formData.confirmPassword) {
                        toast.error("Passwords do not match");
                        setIsLoading(false);
                        return;
                    }
                    if (!aadhaarFile) {
                        toast.error("Identity Verification Document is required!");
                        setIsLoading(false);
                        return;
                    }
                    if (detectedNumber && formData.aadhaarNumber !== detectedNumber) {
                        toast.error("Entered Aadhaar Number does not match the scanned document.");
                        setIsLoading(false);
                        return;
                    }
                }

                if (user) {
                    // Update Existing User
                    await onEdit(formData, user._id);
                    onClose();
                } else {
                    // Register Step 1
                    const token = await onRegister(formData);
                    if (token) {
                        setRegToken(token);
                        setStep('verify');
                    }
                }
            } else {
                // Verify Step (Register Final)
                const registeredUser = await onVerify(otp, regToken);

                if (registeredUser && registeredUser._id) {
                    // Success! Now, if Admin added this contextually with verified docs, we update the status.
                    // Since Admin just performed verification via OCR/Eyes, we can set it to Verified.

                    if (formData.aadhaarNumber) {
                        try {
                            await api.put(`/auth/users/${registeredUser._id}`, {
                                aadhaarNumber: formData.aadhaarNumber,
                                verificationStatus: 'verified',
                                // Optional: If we had a file URL we'd send it too, but we skipped upload endpoint
                            });
                            toast.success("User Verification Status Updated!");
                        } catch (updateErr) {
                            console.error("Failed to update status", updateErr);
                            toast.error("User created but Verification Status update failed.");
                        }
                    }

                    onClose();
                }
            }
        } catch (e) {
            console.error(e);
            // Enhanced Error Handling
            const msg = e.response?.data?.message || e.message || "An error occurred";
            toast.error(msg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in fade-in duration-300">
            <motion.div
                initial={ { opacity: 0, scale: 0.95, y: 20 } }
                animate={ { opacity: 1, scale: 1, y: 0 } }
                exit={ { opacity: 0, scale: 0.95, y: 20 } }
                className="bg-white rounded-[2rem] w-full max-w-2xl shadow-2xl relative overflow-hidden flex flex-col max-h-[90vh]"
            >
                {/* Header */ }
                <div className="px-8 py-6 bg-white border-b border-slate-100 flex justify-between items-center sticky top-0 z-10">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2 tracking-tight">
                            { user ? <Edit2Icon /> : (step === 'verify' ? <ShieldCheck className="text-blue-600" /> : <UserPlusIcon />) }
                            { user ? 'Edit User Profile' : (step === 'verify' ? 'Verification Required' : 'Register New User') }
                        </h2>
                        <p className="text-slate-500 font-bold text-xs uppercase tracking-wider mt-1 ml-1">
                            { user ? 'Update account details' : (step === 'verify' ? 'Enter OTP to confirm' : 'Enter user details safely') }
                        </p>
                    </div>
                    <button onClick={ onClose } className="p-2 bg-slate-50 border border-slate-200 rounded-full text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all shadow-sm">
                        <X size={ 20 } />
                    </button>
                </div>

                {/* Scrollable Content */ }
                <div className="p-8 overflow-y-auto custom-scrollbar bg-white">
                    <form onSubmit={ handleSubmit } className="space-y-6" autoComplete="off">
                        {/* Fake fields */ }
                        <input type="text" style={ { display: 'none' } } />
                        <input type="password" style={ { display: 'none' } } />

                        <AnimatePresence mode="wait">
                            { step === 'details' ? (
                                <motion.div
                                    key="details"
                                    initial={ { opacity: 0, x: -20 } }
                                    animate={ { opacity: 1, x: 0 } }
                                    exit={ { opacity: 0, x: -20 } }
                                    className="space-y-5"
                                >
                                    {/* Personal Info Group */ }
                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Full Name</label>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                            <input
                                                type="text"
                                                className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                                value={ formData.name }
                                                onChange={ e => setFormData({ ...formData, name: e.target.value }) }
                                                placeholder="John Doe"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Email Address</label>
                                        <div className="relative group">
                                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                            <input
                                                type="email"
                                                className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                                value={ formData.email }
                                                onChange={ e => setFormData({ ...formData, email: e.target.value }) }
                                                placeholder="name@company.com"
                                                autoComplete="off"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Mobile</label>
                                            <div className="relative group">
                                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                                <input
                                                    type="text"
                                                    className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                                    value={ formData.mobile }
                                                    onChange={ e => setFormData({ ...formData, mobile: e.target.value }) }
                                                    placeholder="1234567890"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Alt. Phone</label>
                                            <div className="relative group">
                                                <Smartphone className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                                <input
                                                    type="text"
                                                    className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                                    value={ formData.alternativePhone }
                                                    onChange={ e => setFormData({ ...formData, alternativePhone: e.target.value }) }
                                                    placeholder="(Optional)"
                                                    autoComplete="off"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Passwords (Only for New Users) */ }
                                    { !user && (
                                        <div className="space-y-4 pt-2">
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Password</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                                    <input
                                                        type={ showPassword ? "text" : "password" }
                                                        className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-12 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                                        placeholder="••••••••"
                                                        value={ formData.password }
                                                        onChange={ e => setFormData({ ...formData, password: e.target.value }) }
                                                        autoComplete="new-password"
                                                    />
                                                    <button type="button" onClick={ () => setShowPassword(!showPassword) } className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                                                        { showPassword ? <EyeOff size={ 18 } /> : <Eye size={ 18 } /> }
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="space-y-1.5">
                                                <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Confirm Password</label>
                                                <div className="relative group">
                                                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 transition-colors text-slate-400 group-focus-within:text-blue-600" size={ 18 } strokeWidth={ 2.5 } />
                                                    <input
                                                        type={ showConfirmPassword ? "text" : "password" }
                                                        className="w-full border-none bg-slate-50 rounded-xl py-4 pl-11 pr-12 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all"
                                                        placeholder="••••••••"
                                                        value={ formData.confirmPassword }
                                                        onChange={ e => setFormData({ ...formData, confirmPassword: e.target.value }) }
                                                        autoComplete="new-password"
                                                    />
                                                    <button type="button" onClick={ () => setShowConfirmPassword(!showConfirmPassword) } className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-blue-600">
                                                        { showConfirmPassword ? <EyeOff size={ 18 } /> : <Eye size={ 18 } /> }
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    ) }

                                    {/* Aadhaar Verification Section - Grid Layout */ }
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
                                        {/* Col 1: Aadhaar Input */ }
                                        <div className="space-y-1.5">
                                            <label className="text-[11px] font-bold uppercase tracking-wider ml-1 text-slate-500">Aadhaar Number</label>
                                            <div className="relative group">
                                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400">
                                                    <FileText size={ 18 } strokeWidth={ 2.5 } />
                                                </div>
                                                <input
                                                    type="text"
                                                    value={ formData.aadhaarNumber }
                                                    onChange={ (e) => setFormData({ ...formData, aadhaarNumber: e.target.value.replace(/[^0-9]/g, '') }) }
                                                    className="w-full h-[58px] border-none bg-slate-50 rounded-xl pl-12 pr-4 font-semibold text-slate-700 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:bg-white transition-all text-sm"
                                                    placeholder="Enter 12-digit Number"
                                                    maxLength={ 12 }
                                                    autoComplete="off"
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
                                                        id="admin-aadhaar-upload"
                                                    />
                                                    <label htmlFor="admin-aadhaar-upload" className="cursor-pointer h-10 flex items-center justify-center gap-2 bg-white border border-slate-200 px-4 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-all shadow-sm active:scale-95 shrink-0">
                                                        <Upload size={ 16 } />
                                                        <span className="text-xs font-bold whitespace-nowrap">Upload ID</span>
                                                    </label>

                                                    { aadhaarFile ? (
                                                        <div className="flex-1 min-w-0 flex items-center gap-2 bg-blue-100/50 px-3 py-2 rounded-md text-blue-700 h-10">
                                                            <FileText size={ 14 } className="shrink-0" />
                                                            <span className="text-xs font-bold truncate max-w-[100px]">{ aadhaarFile.name }</span>
                                                            <button
                                                                type="button"
                                                                onClick={ (e) => { e.preventDefault(); setAadhaarFile(null); setDetectedNumber(''); setVerificationStatus('pending'); } }
                                                                className="ml-auto hover:text-red-500 shrink-0"
                                                            >
                                                                <X size={ 14 } />
                                                            </button>
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
                                                    className={ `w-full p-4 rounded-xl border-l-[6px] shadow-sm ${detectedNumber === formData.aadhaarNumber ? 'bg-emerald-50 border-white border-l-emerald-500' : 'bg-rose-50 border-white border-l-rose-500'}` }
                                                >
                                                    <div className="flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <span className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">Detected Number</span>
                                                            <span className="text-xl font-mono font-black tracking-widest">{ detectedNumber }</span>
                                                        </div>

                                                        <div className="text-right">
                                                            { detectedNumber === formData.aadhaarNumber ? (
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
                                                    { detectedNumber !== formData.aadhaarNumber && (
                                                        <p className="text-[11px] font-semibold text-rose-600 mt-2 text-right">
                                                            The document number does not match your entered number.<br />Please correct the input or upload a clearer image.
                                                        </p>
                                                    ) }
                                                </motion.div>
                                            ) }
                                        </AnimatePresence>
                                    </div>

                                    {/* Role Selection */ }
                                    <div>
                                        <label className="text-[11px] font-bold tracking-wider ml-1 mb-2 block text-slate-500 uppercase">Account Role</label>
                                        <div className="flex gap-4">
                                            { ['user', 'admin'].map(r => (
                                                <label key={ r } className={ `flex-1 cursor-pointer relative p-4 rounded-xl border-2 transition-all ${formData.role === r ? 'border-blue-500 bg-blue-50/50' : 'border-slate-100 bg-slate-50 hover:bg-slate-100'}` }>
                                                    <input type="radio" className="hidden" name="role" value={ r } checked={ formData.role === r } onChange={ () => setFormData({ ...formData, role: r }) } />
                                                    <div className="text-center">
                                                        <span className={ `block text-xs font-black uppercase tracking-wider ${formData.role === r ? 'text-blue-700' : 'text-slate-500'}` }>{ r }</span>
                                                    </div>
                                                    { formData.role === r && <div className="absolute top-2 right-2 text-blue-500"><CheckCircle size={ 14 } fill="currentColor" className="text-blue-50" /></div> }
                                                </label>
                                            )) }
                                        </div>
                                    </div>
                                </motion.div>
                            ) : (
                                <motion.div
                                    key="verify"
                                    initial={ { opacity: 0, x: 20 } }
                                    animate={ { opacity: 1, x: 0 } }
                                    exit={ { opacity: 0, x: 20 } }
                                    className="py-10 flex flex-col items-center justify-center text-center"
                                >
                                    <div className="w-24 h-24 bg-blue-100 rounded-3xl flex items-center justify-center mb-6 text-blue-600 shadow-inner">
                                        <Mail size={ 40 } />
                                    </div>
                                    <h3 className="text-2xl font-black text-slate-800 mb-2">Verification Sent</h3>
                                    <p className="text-slate-500 font-medium max-w-sm mx-auto mb-8">
                                        We've sent a 6-digit confirmation code to <br />
                                        <span className="text-slate-800 font-bold bg-slate-100 px-2 py-0.5 rounded">{ formData.email }</span>
                                    </p>

                                    <div className="w-full max-w-xs space-y-4">
                                        <label className="text-xs font-black text-slate-400 uppercase tracking-wider block">Enter OTP Code</label>
                                        <input
                                            className="w-full text-center text-3xl tracking-[0.5em] font-black border-2 border-slate-200 rounded-2xl py-5 focus:ring-4 focus:ring-blue-50 focus:border-blue-500 outline-none text-slate-800 placeholder:text-slate-200 transition-all bg-white shadow-sm"
                                            value={ otp }
                                            onChange={ e => setOtp(e.target.value.replace(/[^0-9]/g, '')) }
                                            placeholder="000000"
                                            maxLength={ 6 }
                                            autoFocus
                                        />
                                    </div>
                                </motion.div>
                            ) }
                        </AnimatePresence>
                    </form>
                </div>

                {/* Footer Buttons */ }
                <div className="p-6 bg-white border-t border-slate-100 flex gap-4">
                    { step === 'verify' && (
                        <button
                            type="button"
                            onClick={ () => setStep('details') }
                            className="flex-1 py-4 text-slate-500 font-bold rounded-xl hover:bg-slate-50 transition border border-transparent"
                        >
                            Back
                        </button>
                    ) }
                    <button
                        onClick={ handleSubmit }
                        disabled={ isLoading }
                        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-wider shadow-lg shadow-blue-200 active:scale-95 transition-all disabled:opacity-70 disabled:grayscale flex items-center justify-center gap-2"
                    >
                        { isLoading ? <span className="animate-spin w-5 h-5 border-2 border-white/30 border-t-white rounded-full"></span> : (step === 'details' ? (user ? 'Save Changes' : 'Create Account') : 'Verify & Finish') }
                    </button>
                </div>
            </motion.div>
        </div>
    );
};

const UserPlusIcon = () => <UserPlus size={ 24 } className="text-blue-500" />;
const Edit2Icon = () => <User size={ 24 } className="text-indigo-500" />;

// Placeholder icons if not already imported (Need to ensure they are available)
export { UserModal };
export default UserModal;
