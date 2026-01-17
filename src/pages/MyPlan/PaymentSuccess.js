import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './PaymentSuccess.css';
import { useTranslation } from 'react-i18next';

function PaymentSuccess() {
    const [status, setStatus] = useState('loading');
    const [error, setError] = useState(null);
    const location = useLocation();
    const navigate = useNavigate();
    const { t } = useTranslation();

    useEffect(() => {
        const verifyPayment = async () => {
            try {
                const sessionId = new URLSearchParams(location.search).get('session_id');
                if (!sessionId) {
                    setError(t('No session ID found'));
                    return;
                }

                const token = localStorage.getItem('token');
                const response = await axios.post(
                    '/api/verify-payment',
                    { sessionId },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                        },
                    }
                );

                if (response.data.success) {
                    setStatus('success');
                    setTimeout(() => {
                        navigate('/chat');
                    }, 5000);
                } else {
                    setError(t('Payment verification failed'));
                }
            } catch (error) {
                setError(error.response?.data?.error || t('An error occurred'));
            }
        };

        verifyPayment();
    }, [location, navigate, t]);

    if (error) {
        return (
            <div className="payment-result error">
                <div className="payment-content">
                    <div className="icon-wrapper error">
                        ❌
                    </div>
                    <h1>{t('Payment Failed')}</h1>
                    <p>{error}</p>
                    <button onClick={() => navigate('/myplan')} className="return-button">
                        {t('Return to Plans')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="payment-result success">
            <div className="payment-content">
                <div className="icon-wrapper success">
                    ✓
                </div>
                <h1>{t('Payment Successful!')}</h1>
                <p className="status-message">
                    {status === 'loading' ? t('Verifying your payment...') : t('Your subscription is now active!')}
                </p>
                <p className="redirect-message">
                    {t('You will be redirected to the dashboard in 5 seconds...')}
                </p>
                <button onClick={() => navigate('/chat')} className="return-button">
                    {t('Go to Dashboard Now')}
                </button>
            </div>
        </div>
    );
}

export default PaymentSuccess;
