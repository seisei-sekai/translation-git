// src/Page2.js
import React, { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyPlan.css';
import { getGlobalState } from '../../globalState';
import Logout from '../Login/Logout';
import { useTranslation } from 'react-i18next';

// Initialize Stripe with your publishable key
// Set REACT_APP_STRIPE_PUBLISHABLE_KEY in your environment variables
const stripePromise = loadStripe(process.env.REACT_APP_STRIPE_PUBLISHABLE_KEY || "");



// const stripePromise = loadStripe("pk_test_..."); // For testing



// Initialize payment request after Stripe is loaded



const initializePaymentRequest = async () => {
    const stripe = await stripePromise;
    if (!stripe) return null;

    const paymentRequest = stripe.paymentRequest({
        country: 'US',
        currency: 'usd',
        total: {
            label: 'Total',
            amount: 999, // Amount in cents
        },
        requestPayerName: true,
        requestPayerEmail: true,
    });

    // Check if the payment request is available
    const canMakePayment = await paymentRequest.canMakePayment();
    if (canMakePayment) {
        console.log('Digital wallet payments supported');
        return paymentRequest;
    }
    return null;
};

function MyPlan() {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [userPlan, setUserPlan] = useState(null);
    const [subscription, setSubscription] = useState(null);
    const [paymentRequest, setPaymentRequest] = useState(null);
    const navigate = useNavigate();
    const [isMonthlyBilling, setIsMonthlyBilling] = useState(true);
    const [subscriptionInfo, setSubscriptionInfo] = useState(null);
    const [showPaymentMethodModal, setShowPaymentMethodModal] = useState(false);
    const [selectedPlanType, setSelectedPlanType] = useState(null);

    useEffect(() => {
        // Initialize payment request on component mount
        const setupPaymentRequest = async () => {
            const request = await initializePaymentRequest();
            setPaymentRequest(request);
        };
        setupPaymentRequest();
    }, []);

    // Fetch user's current plan on component mount
    useEffect(() => {
        fetchUserPlan();
    }, []);

    useEffect(() => {
        const fetchSubscriptionInfo = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get('/api/get_user_current_subscription_info', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setSubscriptionInfo(response.data);
            } catch (error) {
                console.error('Error fetching subscription info:', error);
            }
        };

        fetchSubscriptionInfo();
    }, []);

    const fetchUserPlan = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await axios.get('/api/user/plan', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setUserPlan(response.data.plan);
            setSubscription(response.data.subscription);
        } catch (error) {
            console.error('Error fetching user plan:', error);
        }
    };

    const handleSubscribe = async (planType) => {
        try {
            setLoading(true);
            setError(null);

            // Check login status using getGlobalState
            if (!getGlobalState('isLoggedIn')) {
                navigate('/login_page');
                return;
            }

            // Modify plan type based on billing mode
            let finalPlanType = planType;
            if (!isMonthlyBilling) {
                if (planType === 'monthly') {
                    finalPlanType = 'monthly_onetime';
                } else if (planType === 'annual') {
                    finalPlanType = 'annual_onetime';
                } else if (planType === 'basic') {
                    finalPlanType = 'basic';
                }
            }

            setSelectedPlanType(finalPlanType);
            setShowPaymentMethodModal(true);
        } catch (error) {
            console.error('Payment error:', error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Payment failed. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    };

    const handlePaymentMethodSelect = async (paymentMethod) => {
        setShowPaymentMethodModal(false);
        
        try {
            const token = localStorage.getItem('token');
            const response = await axios.post(
                '/api/create-checkout-session',
                { 
                    planType: selectedPlanType,
                    paymentMethodType: paymentMethod 
                },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                    },
                }
            );

            // Redirect to Stripe Checkout
            const stripe = await stripePromise;
            if (stripe) {
                const { error } = await stripe.redirectToCheckout({
                    sessionId: response.data.sessionId,
                });

                if (error) {
                    console.error('Stripe redirect error:', error);
                    if (response.data.url) {
                        window.location.href = response.data.url;
                        return;
                    }
                    setError(error.message);
                }
            } else {
                if (response.data.url) {
                    window.location.href = response.data.url;
                } else {
                    throw new Error('No redirect URL available');
                }
            }
        } catch (error) {
            console.error('Payment error:', error);
            setError(
                error.response?.data?.error || 
                error.message || 
                'Payment failed. Please try again.'
            );
        }
    };

    const handleCancelSubscription = async () => {
        try {
            setLoading(true);
            const token = localStorage.getItem('token');
            await axios.post('/api/cancel-subscription', {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            await fetchUserPlan();
        } catch (error) {
            setError(error.response?.data?.error || 'Failed to cancel subscription');
        } finally {
            setLoading(false);
        }
    };

    const renderSubscriptionStatus = () => {
        if (!subscription) return null;

        return (
            <div className="subscription-status">
                <h3>Current Subscription</h3>
                <p>Plan: {subscription.plan}</p>
                <p>Status: {subscription.status}</p>
                {subscription.end_date && (
                    <p>Expires: {new Date(subscription.end_date).toLocaleDateString()}</p>
                )}
                {subscription.status === 'active' && (
                    <button 
                        className="cancel-button"
                        onClick={handleCancelSubscription}
                        disabled={loading}
                    >
                        {loading ? 'Processing...' : 'Cancel Subscription'}
                    </button>
                )}
            </div>
        );
    };

    const PaymentMethodModal = ({ onClose }) => {
        return (
            <div className="payment-method-modal-purchase-plan">
                <div className="modal-content-purchase-plan">
                    <div className="modal-header-purchase-plan">
                        <h2>Select Payment Method</h2>
                        <button className="close-button-purchase-plan" onClick={onClose}>&times;</button>
                    </div>
                    {selectedPlanType !== 'token' && (
                        <p className="payment-note-purchase-plan">
                            {t('Note: Alipay require manual renewal for subscriptions.')}
                        </p>
                    )}
                    <div className="payment-options-purchase-plan">
                        <button 
                            className="payment-option-purchase-plan card"
                            onClick={() => handlePaymentMethodSelect('card')}
                        >
                            Visa Credit Card
                        </button>
                        {!isMonthlyBilling && (
                            <button 
                                className="payment-option-purchase-plan china"
                                onClick={() => handlePaymentMethodSelect('china')}
                            >
                               Alipay 
                            </button>
                        )}
                    </div>
                </div>
            </div>
        );
    };

    const showEnterpriseModal = () => {
        const modal = document.createElement('div');
        modal.className = 'payment-method-modal-purchase-plan enterprise-modal-purchase-plan';
        modal.innerHTML = `
            <div class="modal-content-purchase-plan">
                <div class="modal-header-purchase-plan">
                    <h2>Enterprise Options</h2>
                    <button class="close-button-purchase-plan">&times;</button>
                </div>
                <div class="enterprise-sections-purchase-plan">
                    <div class="enterprise-section-purchase-plan">
                        <h3>Enter Enterprise Code</h3>
                        <div class="code-input-group-purchase-plan">
                            <input 
                                type="password" 
                                id="enterprise-code" 
                                placeholder="Enter your code" 
                                class="enterprise-input-purchase-plan" 
                                autocomplete="off"
                                spellcheck="false"
                                data-form-type="other"
                            />
                            <button class="enterprise-submit-purchase-plan">Submit</button>
                        </div>
                        <p class="error-message-purchase-plan" style="display: none; color: red;"></p>
                        <p class="success-message-purchase-plan" style="display: none; color: green;"></p>
                    </div>
                    <div class="enterprise-section-purchase-plan">
                        <h3>Contact Sales</h3>
                        <div className="enterprise-description">
                          <p>${t('Get in touch with our sales team for custom enterprise solutions.')}</p>
                        </div>
                        <a href="mailto:askyoohi@gmail.com" class="contact-sales-link-purchase-plan">${t('Contact Sales Team')}</a>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);

        // Close modal function
        const closeModal = () => {
            document.body.removeChild(modal);
        };

        // Add click event for close button
        const closeButton = modal.querySelector('.close-button-purchase-plan');
        closeButton.addEventListener('click', closeModal);

        // Add click event for clicking outside the modal
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                closeModal();
            }
        });

        // Handle enterprise code submission
        const submitButton = modal.querySelector('.enterprise-submit-purchase-plan');
        const codeInput = modal.querySelector('.enterprise-input-purchase-plan');
        const errorMessage = modal.querySelector('.error-message-purchase-plan');
        const successMessage = modal.querySelector('.success-message-purchase-plan');

        submitButton.addEventListener('click', async () => {
            const code = codeInput.value.trim();
            if (!code) {
                errorMessage.textContent = 'Please enter a code';
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
                return;
            }

            try {
                const token = localStorage.getItem('token');
                const response = await axios.post('/api/enterprise_action', 
                    { code },
                    { headers: { 'Authorization': `Bearer ${token}` } }
                );

                if (response.data.success) {
                    successMessage.textContent = response.data.message;
                    successMessage.style.display = 'block';
                    errorMessage.style.display = 'none';
                    codeInput.value = '';
                    
                    // Refresh subscription info
                    setTimeout(() => {
                        navigate('/chat');
                    }, 2000);
                }
            } catch (error) {
                errorMessage.textContent = error.response?.data?.error || 'An error occurred';
                errorMessage.style.display = 'block';
                successMessage.style.display = 'none';
            }
        });
    };

    return (
        <div className="pricing-container">
            <h1>{t('Choose Your Yoohi Plan')}</h1>
            <p className="pricing-subtitle">{t('Start transcribing today with our flexible plans')}</p>
            
            <Logout />

            {error && (
                <div className="error-message">
                    <p>{error}</p>
                    <button onClick={() => setError(null)}>Dismiss</button>
                </div>
            )}

            {renderSubscriptionStatus()}

            <div className="billing-toggle">
                <button 
                    className={`toggle-button ${isMonthlyBilling ? 'active' : ''}`}
                    onClick={() => setIsMonthlyBilling(true)}
                >
                    {t('Monthly')}
                </button>
                <button 
                    className={`toggle-button ${!isMonthlyBilling ? 'active' : ''}`}
                    onClick={() => setIsMonthlyBilling(false)}
                >
                    {t('One-time')}
                </button>
            </div>

            <div className="pricing-grid">
                {/* Monthly Plan */}
                {isMonthlyBilling && (
                    <>
                        <div className="pricing-card popular">
                            <div className="popular-badge">Highest Value</div>
                            <div className="pricing-header">
                                <h2>Monthly Premium</h2>
                                <div className="price">
                                    ${isMonthlyBilling ? '10.99' : '15.99'}
                                    {isMonthlyBilling ? 
                                        <span>/month</span> : 
                                        <span className="one-time-label">one-time</span>
                                    }
                                </div>
                                <p>{t('For regular users')}</p>
                            </div>
                            <ul className="features-list">
                                <li>{t('Lifetime non-translated instant messaging')}</li>
                                <li>{t('1000 tokens monthly renewal')}</li>
                                <li>{t('~40 minutes streaming audio translation')}</li>
                                <li>{t('~1500 translated messages (20 words avg)')}</li>
                                <li>{t('Unused tokens roll over')}</li>
                            </ul>
                            <button 
                                className={`pricing-button ${loading ? 'loading' : ''}`}
                                onClick={() => handleSubscribe('monthly')}
                                disabled={loading || 
                                    (subscriptionInfo?.current_plan === 'monthly' && 
                                     subscriptionInfo?.is_subscription_active)}
                            >
                                {loading ? 'Processing...' : 
                                 (subscriptionInfo?.current_plan === 'monthly' && 
                                  subscriptionInfo?.is_subscription_active) ? 'Current Plan' : 'Select'}
                            </button>
                        </div>

                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h2>Yearly Premium</h2>
                                <div className="price">
                                    ${isMonthlyBilling ? '8.99' : '159.99'}
                                    {isMonthlyBilling ? 
                                        <span>/month</span> : 
                                        <span className="one-time-label">one-time</span>
                                    }
                                </div>
                                <p>{t('Best value')}</p>
                            </div>
                            <ul className="features-list">
                                <li>{t('Everything in Monthly')}</li>
                                <li>{t('Save 16%')}</li>
                                {/* <li>Premium support</li> */}
                            </ul>
                            <button 
                                className={`pricing-button ${loading ? 'loading' : ''}`}
                                onClick={() => handleSubscribe('annual')}
                                disabled={loading || 
                                    (subscriptionInfo?.current_plan === 'annual' && 
                                     subscriptionInfo?.is_subscription_active)}
                            >
                                {loading ? 'Processing...' : 
                                 (subscriptionInfo?.current_plan === 'annual' && 
                                  subscriptionInfo?.is_subscription_active) ? 'Current Plan' : 'Select'}
                            </button>
                        </div>
                    </>
                )}

                {/* One-time plans */}
                {!isMonthlyBilling && (
                    <>
                        <div className="pricing-card popular">
                            <div className="popular-badge">Highest Value</div>
                            <div className="pricing-header">
                                <h2>Monthly Premium</h2>
                                <div className="price">
                                    ${isMonthlyBilling ? '10.99' : '15.99'}
                                    {isMonthlyBilling ? 
                                        <span>/month</span> : 
                                        <span className="one-time-label">one-time</span>
                                    }
                                </div>
                                <p>{t('For regular users')}</p>
                            </div>
                            <ul className="features-list">
                                <li>{t('Lifetime non-translated instant messaging')}</li>
                                <li>{t('1000 tokens for first month only')}</li>
                                <li>{t('~40 minutes streaming audio translation')}</li>
                                <li>{t('~1500 translated messages (20 words avg)')}</li>
                                <li>{t('Unused tokens roll over')}</li>
                            </ul>
                            <button 
                                className={`pricing-button ${loading ? 'loading' : ''}`}
                                onClick={() => handleSubscribe('monthly')}
                                disabled={loading || 
                                    (subscriptionInfo?.current_plan === 'monthly' && 
                                     subscriptionInfo?.is_subscription_active)}
                            >
                                {loading ? 'Processing...' : 
                                 (subscriptionInfo?.current_plan === 'monthly' && 
                                  subscriptionInfo?.is_subscription_active) ? 'Current Plan' : 'Select'}
                            </button>
                        </div>

                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h2>Yearly Premium</h2>
                                <div className="price">
                                    ${isMonthlyBilling ? '8.99' : '159.99'}
                                    {isMonthlyBilling ? 
                                        <span>/month</span> : 
                                        <span className="one-time-label">one-time</span>
                                    }
                                </div>
                                <p>{t('Best value')}</p>
                            </div>
                            <ul className="features-list">
                                <li>{t('Lifetime non-translated instant messaging')}</li>
                                <li>{t('12000 tokens for first year only')}</li>
                                <li>{t('~480 minutes streaming audio translation')}</li>
                                <li>{t('~18000 translated messages (20 words avg)')}</li>
                                <li>{t('Unused tokens roll over')}</li>
                            </ul>
                            <button 
                                className={`pricing-button ${loading ? 'loading' : ''}`}
                                onClick={() => handleSubscribe('annual')}
                                disabled={loading || 
                                    (subscriptionInfo?.current_plan === 'annual' && 
                                     subscriptionInfo?.is_subscription_active)}
                            >
                                {loading ? 'Processing...' : 
                                 (subscriptionInfo?.current_plan === 'annual' && 
                                  subscriptionInfo?.is_subscription_active) ? 'Current Plan' : 'Select'}
                            </button>
                        </div>

                        {/* Basic Plan */}
                        <div className="pricing-card">
                            <div className="pricing-header">
                                <h2>Basic</h2>
                                <div className="price">
                                    $1.99
                                    <span className="one-time-label">one-time</span>
                                </div>
                                <p>{t('Perfect to get started')}</p>
                            </div>
                            <ul className="features-list">
                                <li>{t('Lifetime non-translated instant messaging')}</li>
                                <li>{t('50 tokens included')}</li>
                                <li>{t('~4 minutes streaming audio translation')}</li>
                                <li>{t('~150 translated messages (20 words avg)')}</li>
                                <li>{t('Unused tokens roll over')}</li>
                            </ul>
                            <button 
                                className="pricing-button"
                                onClick={() => handleSubscribe('basic')}
                                disabled={loading || 
                                    (subscriptionInfo?.current_plan === 'basic' && 
                                     subscriptionInfo?.is_subscription_active)}
                            >
                                {(subscriptionInfo?.current_plan === 'basic' && 
                                  subscriptionInfo?.is_subscription_active) ? 'Current Plan' : 'Get Started'}
                            </button>
                        </div>
                    </>
                )}
            </div>

            <div className="pricing-grid secondary-grid">
                {!isMonthlyBilling && (
                    /* Token Pack */
                    <div className="pricing-card token-card">
                        <div className="pricing-header">
                            <h2>Token Pack</h2>
                            <div className="price">$6.99</div>
                            <p>{t('1000 tokens')}</p>
                        </div>
                        <ul className="features-list">
                            <li>{t('Pay as you go')}</li>
                            <li>{t('Never expires')}</li>
                            <li>{t('1000 tokens added')}</li>
                            <li>{t('~40 minutes streaming audio translation')}</li>
                            <li>{t('~1500 translated messages (20 words avg)')}</li>
                            <li><strong>{t('Only open to Premium Users')}</strong></li>
                        </ul>
                        <button 
                            className={`pricing-button ${loading ? 'loading' : ''}`}
                            onClick={() => handleSubscribe('token')}
                            disabled={loading || 
                                subscriptionInfo?.current_plan === 'basic' || 
                                !subscriptionInfo?.is_subscription_active}
                        >
                            {loading ? 'Processing...' : 'Purchase Tokens'}
                        </button>
                    </div>
                )}

                {/* Enterprise Plan */}
                <div className="pricing-card enterprise-card">
                    <div className="pricing-header">
                        <h2>Enterprise</h2>
                        <div className="price">Custom</div>
                        <p>{t('For large organizations')}</p>
                    </div>
                    <ul className="features-list">
                        <li>{t('Custom token packages')}</li>
                        <li>{t('Dedicated account manager')}</li>
                        <li>{t('Priority support')}</li>
                        <li>{t('Custom integrations')}</li>
                    </ul>
                    <button 
                        className="pricing-button enterprise-button"
                        onClick={showEnterpriseModal}
                    >
                        {t('See More')}
                    </button>
                </div>
            </div>
{/* 
            <div className="refund-section">
                <h3>Not satisfied?</h3>
                <p style={{ color: 'black' }}>We offer a 30-day money-back guarantee</p>
                <Link to="/refund" className="refund-link">Request Refund</Link>
            </div>

            <div className="faq-section">
                <h3>Frequently Asked Questions</h3>
                <div className="faq-grid">
                    <div className="faq-item">
                        <h4>What are tokens?</h4>
                        <p>Tokens are our virtual currency used for transcription and translation services.</p>
                    </div>
                    <div className="faq-item">
                        <h4>Can I cancel anytime?</h4>
                        <p>Yes, you can cancel your subscription at any time. No questions asked.</p>
                    </div>
                    <div className="faq-item">
                        <h4>How do refunds work?</h4>
                        <p>We offer a 30-day money-back guarantee if you're not satisfied with our service.</p>
                    </div>
                </div>
            </div> */}

            {showPaymentMethodModal && (
                <PaymentMethodModal onClose={() => setShowPaymentMethodModal(false)} />
            )}
        </div>
    );
}

export default MyPlan;
