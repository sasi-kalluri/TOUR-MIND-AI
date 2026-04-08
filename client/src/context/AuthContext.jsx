import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [token, setToken] = useState(localStorage.getItem('token'));
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const checkUser = async () => {
            if (token) {
                try {
                    // Attach token to default headers (or use api interceptor if setup, but direct call is safer here for init)
                    const { data } = await api.get('/auth/me', {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    setUser(data);
                } catch (error) {
                    console.error("Session verification failed", error);
                    localStorage.removeItem('token');
                    setToken(null);
                    setUser(null);
                }
            }
            setLoading(false);
        };
        checkUser();
    }, [token]);

    const login = async (email, password, isAdminLogin = false) => {
        const { data } = await api.post('/auth/login', { email, password, isAdminLogin });
        if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data);
        }
        return data; // Return data for handling OTP steps
    };

    const register = async (userData) => {
        const { data } = await api.post('/auth/register', userData);
        return data;
    };

    const verifyOTP = async (email, otp) => {
        const { data } = await api.post('/auth/verify-otp', { email, otp });
        if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data);
        }
        return data;
    };

    const verifyAdminCode = async (email, adminCode) => {
        const { data } = await api.post('/auth/verify-admin-code', { email, adminCode });
        if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data);
        }
        return data;
    }

    const submitVerification = async (aadhaarNumber, documentUrl, documentFile) => {
        const { data } = await api.post('/auth/submit-verification', { aadhaarNumber, documentUrl, documentFile });
        // Update local user state
        setUser(prev => ({
            ...prev,
            aadhaarNumber,
            aadhaarDocumentUrl: documentUrl || prev.aadhaarDocumentUrl,
            aadhaarDocumentFile: documentFile || prev.aadhaarDocumentFile,
            verificationStatus: data.verificationStatus
        }));
        return data;
    };

    const verifyLogin2FA = async (tempToken, tokenCode) => {
        const { data } = await api.post('/auth/verify-login-2fa', { tempToken, token: tokenCode });
        if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data);
        }
        return data;
    };

    const forgotPassword = async (email) => {
        const { data } = await api.post('/auth/forgot-password', { email });
        return data;
    }

    const resetPassword = async (resetToken, password) => {
        const { data } = await api.put(`/auth/reset-password/${resetToken}`, { password });
        return data;
    }

    const verifyEmail = async (token) => {
        const { data } = await api.post('/auth/verify-email', { token });
        return data;
    }

    const logout = () => {
        localStorage.removeItem('token');
        setToken(null);
        setUser(null);
    };

    const completeRegistration = async (otp, registrationToken) => {
        const { data } = await api.post('/auth/complete-registration', { otp, registrationToken });
        if (data.token) {
            localStorage.setItem('token', data.token);
            setToken(data.token);
            setUser(data);
        }
        return data;
    }

    return (
        <AuthContext.Provider value={ { user, token, login, register, logout, verifyOTP, verifyAdminCode, verifyLogin2FA, submitVerification, completeRegistration, forgotPassword, resetPassword, verifyEmail, loading } }>
            { children }
        </AuthContext.Provider>
    );
};

export const useAuth = () => useContext(AuthContext);
