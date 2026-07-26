import React from 'react';
import { useNavigate } from 'react-router-dom';
import { cookieDesigns } from '../components/Cookie/designs';

const CookieConsentGallery: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="container py-4" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
            <header style={{ marginBottom: '40px', textAlign: 'center' }}>
                <h1 style={{ fontSize: '2.5rem', marginBottom: '16px', color: 'var(--color-heading)' }}>
                    Cookie Consent Library
                </h1>
                <p style={{ fontSize: '1.1rem', color: 'var(--color-text)', opacity: 0.8, maxWidth: '600px', margin: '0 auto' }}>
                    Explore our collection of 15+ unique, international-standard cookie consent designs.
                    Click any card to view detailed specifications and an interactive preview on a dedicated page.
                </p>
            </header>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                gap: '24px',
                padding: '20px'
            }}>
                {cookieDesigns.map((design) => (
                    <button
                        key={design.id}
                        onClick={() => navigate(`/cookie-consent/${design.id}`)}
                        style={{
                            padding: '32px',
                            borderRadius: 0,
                            border: '1px solid var(--color-border)',
                            background: 'var(--color-surface, #ffffff)',
                            color: 'var(--color-text)',
                            textAlign: 'left',
                            cursor: 'pointer',
                            transition: 'all 0.4s cubic-bezier(0.4, 0, 0.2, 1)',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '16px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-8px)';
                            e.currentTarget.style.boxShadow = 'var(--elev-3)';
                            e.currentTarget.style.borderColor = 'var(--color-primary)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'var(--elev-1)';
                            e.currentTarget.style.borderColor = 'var(--color-border)';
                        }}
                    >
                        <div style={{
                            position: 'absolute',
                            top: 0,
                            right: 0,
                            padding: '8px 16px',
                            background: 'var(--color-primary)',
                            color: 'white',
                            fontSize: '0.7rem',
                            fontWeight: 800,
                            borderRadius: 0,
                            textTransform: 'uppercase'
                        }}>
                            {design.type}
                        </div>

                        <div style={{ marginTop: '8px' }}>
                            <span style={{
                                fontSize: '0.8rem',
                                color: 'var(--color-primary)',
                                fontWeight: 700,
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                Position: {design.position}
                            </span>
                            <h3 style={{ fontSize: '1.5rem', fontWeight: 700, marginTop: '8px', marginBottom: '8px' }}>
                                {design.name}
                            </h3>
                            <p style={{
                                fontSize: '0.9rem',
                                opacity: 0.7,
                                lineHeight: 1.5,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                            }}>
                                {design.detailedDescription}
                            </p>
                        </div>

                        <div style={{
                            marginTop: 'auto',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            color: 'var(--color-primary)',
                            fontWeight: 600,
                            fontSize: '0.9rem'
                        }}>
                            View Design Details →
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default CookieConsentGallery;
