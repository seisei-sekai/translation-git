// src/Page2.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import './LandingPage.css';
import { privacyPolicyContent } from './privacyPolicy';
import { Helmet } from 'react-helmet';

function LandingPage() {
  const { t } = useTranslation();
  const [selectedFunction, setSelectedFunction] = React.useState(0);
  const [chatImageIndex, setChatImageIndex] = useState(0);
  const [showPrivacyPolicy, setShowPrivacyPolicy] = useState(false);
  const [showRefundTerms, setShowRefundTerms] = useState(false);

  // Remove white background from body/html when LandingPage is mounted
  useEffect(() => {
    // Store original styles
    const originalBodyBg = document.body.style.backgroundColor;
    const originalHtmlBg = document.documentElement.style.backgroundColor;
    const rootElement = document.getElementById('root');
    const originalRootBg = rootElement?.style.backgroundColor;

    // Remove white background
    document.body.style.backgroundColor = 'transparent';
    document.documentElement.style.backgroundColor = 'transparent';
    if (rootElement) {
      rootElement.style.backgroundColor = 'transparent';
    }

    // Cleanup: restore original styles when component unmounts
    return () => {
      document.body.style.backgroundColor = originalBodyBg;
      document.documentElement.style.backgroundColor = originalHtmlBg;
      if (rootElement) {
        rootElement.style.backgroundColor = originalRootBg;
      }
    };
  }, []);

  const galleryData = [
    {
      image: '/landing_menu_1.png',
      description: ''
    },
    {
      image: '/landing_menu_2.png', 
      description: ''
    },
    {
      image: '/landing_menu_3.png',
      description: ''
    },
    {
      image: '/landing_menu_4.png',
      description: ''
    },
    {
      image: '/landing_menu_5.png',
      description: ''
    },
    {
      image: '/landing_menu_6.png',
      description: ''
    },
    {
      image: '/landing_menu_7.png',
      description: ''
    },
    {
      image: '/landing_menu_8.png',
      description: ''
    },
    {
      image: '/landing_menu_9.png',
      description: ''
    },
    {
      image: '/landing_menu_10.png',
      description: ''
    }
  ];

  // Add new gallery data for UI customization
  const uiGalleryData = [
    {
      image: '/landing_diy_appearance.png',
      description: ''
    },
    {
      image: '/landing_emoji_1.png',
      description: ''
    }
  ];

  const GalleryComponent = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextImage = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === galleryData.length - 1 ? 0 : prevIndex + 1
      );
    };

    const prevImage = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? galleryData.length - 1 : prevIndex - 1
      );
    };

    return (
      <div className="feature-content">
        <div className="feature-split-layout">
          <div className="feature-text-content">
            <h2 className="feature-content-title">{t('Yoohi Innovative Language Filter System')}</h2>
            <p className="feature-content-description">
              {t('Experience our revolutionary language filtering system that supports over 1,000 languages, including mainstream languages, modern dialects, ancient languages, and stylized text, making cross-language communication effortless and intuitive')}
              <br />
              <i style={{fontSize: '0.9rem'}}>{t('More filters will be added each week')}</i>
            </p>
            <p className="gallery-description">
              {t(galleryData[currentIndex].description)}
            </p>
          </div>

          <div className="feature-gallery-content">
            <div className="gallery-container">
              <div className="gallery-arrow left" onClick={prevImage}>
                ←
              </div>
              <div className="gallery-arrow right" onClick={nextImage}>
                →
              </div>

              <div className="gallery-wrapper">
                <img 
                  className="gallery-image" 
                  src={galleryData[currentIndex].image} 
                  alt={`Screenshot ${currentIndex + 1}`}
                />
              </div>
              
              <div className="gallery-nav">
                {galleryData.map((_, index) => (
                  <div
                    key={index}
                    className={`gallery-dot ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Add new component for UI customization
  const UICustomizationComponent = () => {
    const [currentIndex, setCurrentIndex] = useState(0);

    const nextImage = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === uiGalleryData.length - 1 ? 0 : prevIndex + 1
      );
    };

    const prevImage = () => {
      setCurrentIndex((prevIndex) => 
        prevIndex === 0 ? uiGalleryData.length - 1 : prevIndex - 1
      );
    };

    return (
      <div className="feature-content">
        <div className="feature-split-layout">
          <div className="feature-text-content">
            <h2 className="feature-content-title">{t('Customizable UI & Emoji System')}</h2>
            <p className="feature-content-description">
              {t('Make the chat interface truly yours with our extensive customization options')}
              {t('Choose from various themes, layouts, and emoji sets to create your perfect communication environment')}
              {t('Express yourself with rich emoji support and personalized interface settings')}
            </p>
            <p className="gallery-description">
              {t(uiGalleryData[currentIndex].description)}
            </p>
          </div>

          <div className="feature-gallery-content">
            <div className="gallery-container">
              <div className="gallery-arrow left" onClick={prevImage}>
                ←
              </div>
              <div className="gallery-arrow right" onClick={nextImage}>
                →
              </div>

              <div className="gallery-wrapper">
                <img 
                  className="gallery-image" 
                  src={uiGalleryData[currentIndex].image} 
                  alt={`UI Screenshot ${currentIndex + 1}`}
                />
              </div>
              
              <div className="gallery-nav">
                {uiGalleryData.map((_, index) => (
                  <div
                    key={index}
                    className={`gallery-dot ${index === currentIndex ? 'active' : ''}`}
                    onClick={() => setCurrentIndex(index)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const StreamingComponent = () => {
    return (
      <div className="feature-content">
        <div className="streaming-layout">
          <h2 className="feature-content-title">{t('Ultra-Low Latency Streaming Translation')}</h2>
          <div className="streaming-container-horizontal">
            <img 
              className="streaming-gif-horizontal" 
              src={`${process.env.PUBLIC_URL}/yoohi_streaming_video_target_size.gif`}
              alt={t('Real-time translation demo')}
            />
          </div>
          <div className="description-quote-container">
            <div className="description-section">
              <p className="feature-content-description">
                {t('Experience our real-time translation with industry-leading 50ms latency')}
                {t('Our advanced streaming technology ensures seamless communication across language barriers with virtually no delay')}
                <br /><br />
                <i style={{fontSize: '12px'}}>
                  {t('Note: Currently, Streaming Translation is not available to China Mainland users')}
                </i>
              </p>
            </div>

            <div className="quote-box">
              <div className="quote-content">
                <p className="quote-text">
                  <span className="quote-label">{t('A Male Businessman speaks in English')}:</span>
                  <br />
                  {t('Business Speech Example')}
                  <br />
                  <br />
                  <i>{t('Note: The chatroom has six people listening to the English speech, which is being translated in real-time to Chinese, Japanese, Korean, French, German, and Arabic accordingly')}</i>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const QRCodeComponent = () => {
    return (
      <div className="feature-content">
        <div className="feature-split-layout">
          <div className="feature-text-content">
            <h2 className="feature-content-title">{t('Quick and Easy Access')}</h2>
            <p className="feature-content-description">
              {t('Join any Chatroom instantly within 10 seconds')}
              {t('Simply scan the QR code or open the link in your browser to start communicating across language barriers immediately')}
              {t('No registration or complex setup required')}
              <br/>
              <i style={{fontSize: '0.9rem'}}>
                {t('Only applies to chatrooms with guest option enabled')}
              </i>
            </p>
          </div>

          <div className="feature-gallery-content">
            <div className="gallery-container">
              <div className="gallery-wrapper">
                <img 
                  className="gallery-image" 
                  src={`${process.env.PUBLIC_URL}/landing_qr_code_1.png`}
                  alt="QR Code Join Demo"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const UnlimitedMessagingComponent = () => {
    return (
      <div className="feature-content">
        <div className="feature-split-layout">
          <div className="feature-text-content">
            <h2 className="feature-content-title">{t('Unlimited Text Messaging')}</h2>
            <p className="feature-content-description">
              {t('Like WhatsApp, LINE, and WeChat, we provide lifetime unlimited text messaging after your first payment of any provided plan')}
             ({t('Premium features like Streaming Audio Translation and AI Photo functions require an active subscription')})
            </p>
          </div>
        </div>
      </div>
    );
  };

  const functionData = [
    {
      icon: '⚡',
      title: t('50ms Latency Streaming Translation'),
      description: t('Real-time streaming translation in chatrooms with minimal delay'),
      details: <StreamingComponent />
    },
    {
      icon: '🎯',
      title: t('1000+ Language Filter'),
      description: '',
      details: <GalleryComponent />
    },
    {
      icon: '',
      icon: '📱',
      title: t('10s Join Chatroom by QRcode & Dynamic code '),
      description: t('Quick and easy access to chat spaces with no setup required'),
      details: <QRCodeComponent />
    },
    {
      icon: '🎨',
      title: t('10+ Customizable UI & Emoji'),
      description: t('Personalize your chat interface to match your preferences'),
      details: <UICustomizationComponent />
    },
    {
      icon: '💬',
      title: t('Unlimited Text Messaging'),
      description: t('Like WhatsApp, LINE, and WeChat, enjoy lifetime unlimited text messaging after your first payment. Premium features like Streaming Audio Translation and AI Photo functions require an active subscription.'),
      details: <UnlimitedMessagingComponent />
    },
  ];

  const PrivacyPolicyModal = () => {
    if (!showPrivacyPolicy) return null;

    const handleOverlayClick = (e) => {
      // Only close if clicking the overlay itself, not its children
      if (e.target.className === 'modal-overlay-landing') {
        setShowPrivacyPolicy(false);
      }
    };

    return (
      <div 
        className="modal-overlay-landing"
        onClick={handleOverlayClick}
      >
        <div className="modal-content-landing">
          <div className="modal-body-landing">
            <button 
              className="modal-close-button-landing"
              onClick={() => setShowPrivacyPolicy(false)}
            >
              ×
            </button>
            <div 
              className="privacy-policy-content"
              dangerouslySetInnerHTML={{ __html: privacyPolicyContent }} 
            />
          </div>
        </div>
      </div>
    );
  };

  // Add RefundTermsModal component
  const RefundTermsModal = () => {
    if (!showRefundTerms) return null;

    const handleOverlayClick = (e) => {
      if (e.target.className === 'refund-modal-overlay') {
        setShowRefundTerms(false);
      }
    };

    return (
      <div 
        className="refund-modal-overlay"
        onClick={handleOverlayClick}
      >
        <div className="refund-modal-content">
          <div className="refund-modal-body">
            <button 
              className="refund-modal-close"
              onClick={() => setShowRefundTerms(false)}
            >
              ×
            </button>
            <h2>{t('Refund Policy')}</h2>
            <div className="refund-policy-content">
              <h3>{t('Beta Testing Period Refund Policy')}</h3>
              <p>{t('During our beta testing phase, we offer a limited refund policy to ensure service quality and customer satisfaction.')}</p>
              
              <h3>{t('Refund Terms')}</h3>
              <ul>
                <li>{t('50% refund available within 7 days of purchase for Premium plans (Monthly and Yearly subscriptions)')}</li>
                <li>{t('Refund must be requested within the first 7 days of purchase')}</li>
                <li>{t('Refunds are processed using the original payment method')}</li>
              </ul>

              <h3>{t('Non-Refundable Items')}</h3>
              <ul>
                <li>{t('Basic plan purchases')}</li>
                <li>{t('Token purchases')}</li>
                <li>{t('Enterprise solutions')}</li>
              </ul>

              <h3>{t('How to Request a Refund')}</h3>
              <p>{t('To request a refund, please contact our support team at askyoohi@gmail.com with your account User ID details and reason for the refund.')}</p>

              <h3>{t('Processing Time')}</h3>
              <p>{t('Refund requests are typically processed within 10-14 business days.')}</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="landing-page">
      <Helmet>
        <title>Yoohi.ai - Professional Real-Time AI Translator & Business Translation App</title>
        <meta name="description" content="Professional AI-powered real-time translator app for business, travel & meetings. Instant translation in 1000+ languages with 50ms latency. Available on iPhone & web." />
        
        {/* Primary meta keywords */}
        <meta name="keywords" content="ai translator, real time translator, business translator, travel translator, instant translator app, live translation app, universal translator, japan travel, tokyo travel" />
        
        {/* Additional meta tags for SEO */}
        <meta property="og:title" content="Yoohi.ai - Real-Time AI Translation App" />
        <meta property="og:description" content="Professional real-time translation for business & travel. 1000+ languages, instant messaging, voice translation." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://yoohi.ai" />
        
        {/* Schema.org markup for Google */}
        <script type="application/ld+json">
          {`
            {
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Yoohi.ai",
              "applicationCategory": "BusinessApplication",
              "operatingSystem": "Web, iOS",
              "description": "Professional AI-powered real-time translator and instant messaging app for business, travel, and international communication.",
              "offers": {
                "@type": "Offer",
                "price": "0",
                "priceCurrency": "USD"
              },
              "featureList": [
                "Real-time translation in 1000+ languages",
                "50ms latency streaming translation",
                "Business meeting translation",
                "Travel translation support",
                "Voice translation",
                "Instant messaging with translation"
              ]
            }
          `}
        </script>
      </Helmet>
      {/* Hero Section */}
      <header className="hero">
        <nav className="navbar">
          <div className="logo">

          </div>
          <div className="nav-links">
            <a href="#introduction">{t('Introduction')}</a>
            <a href="#functions">{t('Functions')}</a>
            <a href="#pricing">{t('Pricing')}</a>
            <a href="#founding-team">{t('Team')}</a>
            <a href="#contact">{t('Contact')}</a>
            <Link to="/login_page" className="login-btn">{t('Login')}</Link>
          </div>
        </nav>
        
        <div className="hero-content">
          <div className="hero-logo">
            <img 
              src={`${process.env.PUBLIC_URL}/Cut.png`} 
              alt="yoohi.ai logo" 
              className="hero-logo-image" 
            />
          </div>
          <div className="hero-title">Yoohi</div>
          <div className="hero-subtitle small-text">
            {t('The First AI-Powered Universal Translator & Instant Messenger in the world')}
          </div>
          <div className="hero-description">{t('Developed by Stanford Founder')}</div>
          <div className="hero-description"style={{ fontStyle: 'italic' }}>
            {/* {t('January 21 2025: Launch for v1.0.2 Beta Testing')} */}
            {t('v1.0.2 Beta Testing')}
          </div>
          <Link to="/chat" className="cta-button">{t('Start Now')}</Link>
        </div>
      </header>

      {/* Promo Video Section */}
      <section className="promo-video">
        <div className="section-title">
          {t('')}
        </div>
        <div className="video-container">
          <video 
            controls



            playsInline
            className="promo-video-player"
          >
            <source 
              src={`${process.env.PUBLIC_URL}/promo_video_1.mp4`} 
              type="video/mp4" 
            />
            {t('Your browser does not support the video tag.')}
          </video>
        </div>
      </section>

      {/* Features Section */}
      <section id="introduction" className="Introduction">
        <div className="section-title" style={{ marginTop: '50px' }}>
          {t('Features & Example')}
        </div>
        <div className="introduction-layout">
          <div className="feature-grid">
            <div className="feature-card">
              <span className="feature-icon">✨</span>
              <div className="feature-title">{t('Simple')}</div>
              <div className="feature-description">{t('10 seconds Join-room experience: Scan QR code, open browser, Chat')}</div>
            </div>
            <div className="feature-card">
              <span className="feature-icon">⚡</span>
              <div className="feature-title">{t('Simultaneous')}</div>
              <div className="feature-description">{t('~100 milisecond latency for streaming translation')}</div>
            </div>
            <div className="feature-card">
              <span className="feature-icon">👥</span>
              <div className="feature-title">{t('Social')}</div>
              <div className="feature-description">{t('Perfect for business, friends, dating, family, and classrooms. Private chatrooms available')}</div>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🎯</span>
              <div className="feature-title">{t('Smart')}</div>
              <div className="feature-description">{t('State-of-the-art AI Large Language Model Translation technology')}</div>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🌐</span>
              <div className="feature-title">{t('Stylish')}</div>
              <div className="feature-description">{t('1000+ languages supported, including mainstream languages, dialects, and customized languages')}</div>
            </div>
            <div className="feature-card">
              <span className="feature-icon">🛡️</span>
              <div className="feature-title">{t('Secure')}</div>
              <div className="feature-description">{t('Privacy-first policy. All user data is encrypted and cannot be viewed by Yoohi')}</div>
            </div>
          </div>
          
          <div className="chat-gallery">
            <div className="intro-gallery-container">
              <div className="intro-gallery-arrow intro-gallery-arrow-left" onClick={() => setChatImageIndex(prev => prev === 0 ? 13 : prev - 1)}>
                ←
              </div>
              <div className="intro-gallery-arrow intro-gallery-arrow-right" onClick={() => setChatImageIndex(prev => prev === 13 ? 0 : prev + 1)}>
                →
              </div>
              <div className="intro-gallery-wrapper">
                <img 
                  className="intro-gallery-image" 
                  src={`${process.env.PUBLIC_URL}/landing_chat_content_${chatImageIndex + 1}.png`}
                  alt={`Chat example ${chatImageIndex + 1}`}
                />
              </div>
              <div className="intro-gallery-nav">
                {Array.from({ length: 14 }, (_, i) => (
                  <div
                    key={i}
                    className={`intro-gallery-dot ${i === chatImageIndex ? 'intro-gallery-dot-active' : ''}`}
                    onClick={() => setChatImageIndex(i)}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* After Features Section and before Pricing Section */}
      <section id="functions" className="functions-landing">
        <div className="section-title">{t('Functions')}</div>
        <div className="split-container-landing">
          <div className="function-menu-landing">
            {functionData.map((item, index) => (
              <div
                key={index}
                className={`menu-item-landing ${selectedFunction === index ? 'active' : ''}`}
                onClick={() => setSelectedFunction(index)}
              >
                <span className="menu-icon-landing">{item.icon}</span>
                <span className="menu-title-landing">{item.title}</span>
              </div>
            ))}
          </div>
          <div className="function-content-landing">
            {functionData[selectedFunction] && (
              <div className="content-wrapper-landing">
                <div className="content-header-landing">
                  {/* <span className="content-icon-landing">{functionData[selectedFunction].icon}</span> */}
                  {/* <h2>{functionData[selectedFunction].title}</h2> */}
                </div>
                {/* <p className="content-description-landing">{functionData[selectedFunction].description}</p> */}
                <div className="content-details-landing">{functionData[selectedFunction].details}</div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="pricing">
        <div className="section-title">{t('Simple, Transparent Pricing')}</div>
        <div className="pricing-grid" style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '20px',
          maxWidth: '1400px',
          margin: '0 auto'
        }}>
          {/* Basic Plan */}
          <div className="pricing-card">
            <div className="pricing-header">
              <div className="plan-title">{t('Basic')}</div>
              <div className="price">{t('$')}{t('1.99')}<span className="one-time-label">{t('one-time')}</span></div>
              <div className="plan-description">{t('Perfect to get started')}</div>
            </div>
            <ul className="features-list">
              <li>{t('Lifetime non-translated instant messaging')}</li>
              <li>{t('50 tokens included')}</li>
              <li>{t('~4 minutes streaming audio translation')}</li>
              <li>{t('~150 translated messages (20 words avg)')}</li>
              <li>{t('Unused tokens roll over')}</li>
            </ul>
          </div>

          {/* Monthly Premium Plan */}
          <div className="pricing-card featured">
            <div className="popular-badge">Top Choice</div>
            <div className="pricing-header">
              <div className="plan-title">{t('Monthly Premium')}</div>
              <div className="price">{t('$')}{t('10.99')}<span>{t('/month')}</span></div>
              <div className="plan-description">{t('For regular users')}</div>
            </div>
            <ul className="features-list">
              <li>{t('Lifetime non-translated instant messaging')}</li>
              <li>{t('1000 tokens monthly renewal')}</li>
              <li>{t('~40 minutes streaming audio translation')}</li>
              <li>{t('~1500 translated messages (20 words avg)')}</li>
              <li>{t('Unused tokens roll over')}</li>
            </ul>
          </div>

          {/* Yearly Premium Plan */}
          <div className="pricing-card">
            <div className="pricing-header">
              <div className="plan-title">{t('Yearly Premium')}</div>
              <div className="price">{t('$')}{t('8.99')}<span>{t('/month')}</span></div>
              <div className="plan-description">{t('Best value')}</div>
            </div>
            <ul className="features-list">
              <li>{t('Lifetime non-translated instant messaging')}</li>
              <li>{t('12000 tokens yearly renewal')}</li>
              <li>{t('~480 minutes streaming audio translation')}</li>
              <li>{t('~18000 translated messages (20 words avg)')}</li>
              <li>{t('Unused tokens roll over')}</li>
              <li>{t('Save 16%')}</li>
            </ul>
          </div>

          {/* Enterprise Plan */}
          <div className="pricing-card">
            <div className="pricing-header">
              <div className="plan-title">{t('Enterprise')}</div>
              <div className="price">Custom</div>
              <div className="plan-description">{t('For large organizations')}</div>
            </div>
            <ul className="features-list">
              <li>{t('Custom token packages')}</li>
              <li>{t('Dedicated account manager')}</li>
              <li>{t('Priority support')}</li>
              <li>{t('Custom integrations')}</li>
            </ul>
            <a href="#contact" className="pricing-btn" style={{ textDecoration: 'none' }}>{t('Contact us')}</a>
          </div>
        </div>

        {/* Token Pack - Add as a secondary card */}
        <div className="pricing-grid" style={{ 
          display: 'grid',
          gridTemplateColumns: 'repeat(2, 1fr)',
          gap: '20px',
          maxWidth: '700px',
          margin: '20px auto'
        }}>

        </div>

        <div className="faq-section">
          <div className="section-title">{t('Frequently Asked Questions')}</div>
          <div className="faq-grid">
            <div className="faq-item">
              <div className="faq-question">{t('What is Yoohi.ai?')}</div><br/>
              <div className="faq-answer">{t('Yoohi.ai is a next-generation multilingual instant messaging app, similar to WhatsApp, LINE, or WeChat, but with advanced real-time translation capabilities and customizable language settings')}</div>
            </div>
            <div className="faq-item">
              <div className="faq-question">{t('Who can use Yoohi.ai?')}</div><br/>
              <div className="faq-answer">{t('Yoohi.ai is perfect for:')}<br/>
                • {t('Business meetings')}
                <br/>
                • {t('Multilingual classrooms and education')}
                <br/>
                • {t('Multilingual Family communication')}
                <br/>
                • {t('Entertainment and social groups')}
                <br/>
                • {t('Cross-border dating and relationships')}
                <br/>
                • {t('Travel and cultural exchange')}
              </div>
            </div>
            <div className="faq-item">
              <div className="faq-question">{t('What are tokens?')}</div><br/>
              <div className="faq-answer">{t('Tokens are our virtual currency used for transcription and translation services.')}</div>
            </div>

          </div>
        </div>
      </section>

      {/* After Pricing Section and before Contact Section */}
      <section id="founding-team" className="founding-team">
        <div className="section-title">{t('Founder')}</div>
        <div className="team-grid">

          <div className="team-member">
            <img 
              src={`${process.env.PUBLIC_URL}/avatar_seal_blue.png`} 
              alt="Co-Founder" 
              className="team-member-image"
            />
            <div className="team-member-name">Benny Shicheng Zhang | 张世成</div>
            <div className="team-member-title">{t('Founder')}</div>

            <div className="team-member-description">
              <i>M.A. Music Tech @ Stanford University</i>
              <br />


              <br />
            OIIAI-cat lover, Music Theorist, <br />Brain Computer Interface Researcher, and AI Builder
            <br /><br />
            <div>
                 <strong>{t('Contact:')}</strong>  <br />
                  <span className="team-member-email">
                    sczhangb@alumni.stanford.edu
                  </span>
                </div>
            <a 
                href="https://www.linkedin.com/in/shicheng-zhang-92000b161/" 
                target="_blank" 
                rel="noopener noreferrer"
                style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
              >
                <img 
                  src={`${process.env.PUBLIC_URL}/LinkedIn_icon.svg`} 
                  alt="LinkedIn Profile" 
                  style={{ 
                    width: '30px', 
                    height: '30px', 
                    marginTop: '10px' 
                  }} 
                />

              </a>

            <br />
            <i>{t('We are an early-stage startup based in Tokyo and are actively fundraising now. <br />If you are an investor, please feel free to contact us.')}</i>
            <br /><br />
            <hr style={{
              width: '100%',
              border: '1px solid #ddd',
              margin: '20px 0'
            }} />
            <img 
              src={`${process.env.PUBLIC_URL}/Jianzi_harmony_language_brief.png`}
              alt="Jianzi Harmony Language"
              style={{
                width: '100%',
                maxWidth: '400px',
                marginTop: '20px',
                borderRadius: '8px'
              }}
            />
<br />
<strong>减字和声谱 JIanzi-Chord Tablature</strong>
            <i style={{ fontSize: '0.9em' }}><br /> {t('Chinese Traditional Zither influenced Tertian Harmony Language Designed by Zhang, 2020')}</i>



            
            </div>
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="contact">
        <div className="section-title">{t('Contact Us')}</div>
        <div className="social-links" style={{ display: 'flex', gap: '20px', justifyContent: 'center', marginTop: '20px' }}>

          <a
            href="https://x.com/yoohi_ai?s=21&t=OcMZXFDgVjVweqsAk40xqA"
            target="_blank" 
            rel="noopener noreferrer"
          >
            <img
              src={`${process.env.PUBLIC_URL}/logo_X.png`}
              alt="X"
              style={{ width: '30px', height: '30px' }}
            />
          </a>
          <a
            href="https://discord.gg/Nqbs23mq"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`${process.env.PUBLIC_URL}/logo_discord.svg`}
              alt="Discord"
              style={{ width: '30px', height: '30px' }}
            />
          </a>
          <a
            href="https://www.tiktok.com/@yoohi.ai?_t=ZS-8tGo1NzIpyK&_r=1"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`${process.env.PUBLIC_URL}/logo_tiktok.png`}
              alt="TikTok"
              style={{ width: '30px', height: '30px' }}
            />
          </a>
          <a
            href="https://www.reddit.com/r/Yoohiai/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img
              src={`${process.env.PUBLIC_URL}/logo_reddit.png`}
              alt="Reddit"
              style={{ width: '30px', height: '30px' }}
            />
          </a>
          <a 
            href="https://www.xiaohongshu.com/user/profile/646f71ac000000001100138b?xsec_token=YBkR-tjpMSongbR5Uytvh7LHWGaimhr4mHnfe7U0wiTvw=&xsec_source=app_share&xhsshare=CopyLink&appuid=646f71ac000000001100138b&apptime=1737523033&share_id=910ab0e05afe49aa836d79b36fdb0b41"
            target="_blank"
            rel="noopener noreferrer"
          >
            <img 
              src={`${process.env.PUBLIC_URL}/logo_Xiaohongshu.svg`}
              alt="Xiaohongshu"
              style={{ width: '30px', height: '30px' }}
            />
          </a>
        </div>
        <div className="contact-content">
          <div className="contact-info">
            <div className="contact-title">
              {/* <strong>Nebulas Tokyo | 株式会社ネビュラス</strong> */}
              </div><br />

            <div className="contact-description">
              {/* 〒180-0003 東京都武蔵野市吉祥寺南町3丁目34番7号 */}
            </div>
            <div className="contact-description">
              {/* 3-34-7 Kichijoji Minami-cho, Musashino-shi, Tokyo 180-0003, Japan */}
            </div>
            <div className="contact-description">{t('Email: askyoohi@gmail.com')}</div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="footer">
        <div className="footer-content">
          <div className="footer-section">
            <div className="footer-title">{t('Legal')}</div>
            <a onClick={() => setShowPrivacyPolicy(true)} style={{ cursor: 'pointer' }}>{t('Privacy Policy')}</a>
            <a onClick={() => setShowPrivacyPolicy(true)} style={{ cursor: 'pointer' }}>{t('Terms of Service')}</a>
            <a onClick={() => setShowRefundTerms(true)} style={{ cursor: 'pointer' }}>{t('Refund Policy')}</a>
          </div>
          <div className="footer-section">
            <div className="footer-title">{t('Payment Methods')}</div>
            <div className="payment-methods">
            <div className="payment-row">

                <img 
                  src={`${process.env.PUBLIC_URL}/payment_icon_ApplePay.png`} 
                  alt="Apple Pay" 
                />
                <img 
                  src={`${process.env.PUBLIC_URL}/payment_icon_GooglePay.png`} 
                  alt="Google Pay" 
                />
                <img 
                  src={`${process.env.PUBLIC_URL}/payment_icon_Alipay.png`} 
                  alt="Alipay" 
                />
              </div>
              <div className="payment-row">
                <img 
                  src={`${process.env.PUBLIC_URL}/payment_icon_Visa.png`} 
                  alt="Visa" 
                />
                <img 
                  src={`${process.env.PUBLIC_URL}/payment_icon_Mastercard.png`} 
                  alt="Mastercard" 
                />

              </div>

            </div>
          </div>
          <div className="footer-section">
            <div className="footer-title">{t('Security')}</div>
            <div className="security-description">{t('PCI DSS Compliant')}</div>
            <div className="security-description">{t('256-bit SSL Encryption')}</div>
            <div className="security-description">{t('AES Encryption')}</div>
          </div>
        </div>
        <div className="footer-bottom">
          <div className="copyright">
            {t('© 2024 yoohi.ai. All rights reserved.')}
          </div>
        </div>
      </footer>

      <PrivacyPolicyModal />
      <RefundTermsModal />
    </div>
  );
}

export default LandingPage;
