import React from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { cookieDesigns } from '../components/Cookie/designs';
import { CookieDesignRenderer } from '../components/Cookie/CookieDesignRenderer';

const CookieDesignDetails: React.FC = () => {
    const { designId } = useParams<{ designId: string }>();
    const navigate = useNavigate();
    const design = cookieDesigns.find((d) => d.id === designId);
    const [isPageLoading, setIsPageLoading] = React.useState(designId === 'delayed-slow-slide');

    React.useEffect(() => {
        if (designId === 'delayed-slow-slide') {
            const timer = setTimeout(() => {
                setIsPageLoading(false);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [designId]);

    if (isPageLoading) {
        return (
            <div className="container py-6" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg)' }}>
                <div style={{ width: '50px', height: '50px', border: '5px solid var(--color-border)', borderTopColor: 'var(--color-primary)', borderRadius: 0, animation: 'spin 1s linear infinite' }} />
                <p style={{ marginTop: '20px', opacity: 0.7 }}>Simulating network idle (2s wait)...</p>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        );
    }

    if (!design) {
        return (
            <div className="container py-6 text-center">
                <h2>Design not found</h2>
                <Link to="/cookie-consent" className="btn btn-primary mt-4">Back to Gallery</Link>
            </div>
        );
    }

    return (
        <div className="container py-6" style={{ minHeight: '100vh', background: 'var(--color-bg)' }}>
            <div style={{ maxWidth: '900px', margin: '0 auto' }}>
                <Link to="/cookie-consent" style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '32px',
                    color: 'var(--color-primary)',
                    fontWeight: 600
                }}>
                    ← Back to Collection
                </Link>

                <header style={{ marginBottom: '48px' }}>
                    <h1 style={{ fontSize: '3rem', marginBottom: '16px', color: 'var(--color-heading)' }}>
                        {design.name}
                    </h1>
                    <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
                        <span style={{
                            padding: '6px 16px',
                            background: 'var(--color-primary-container)',
                            color: 'var(--color-on-primary-container)',
                            borderRadius: 0,
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                        }}>
                            Type: {design.type}
                        </span>
                        <span style={{
                            padding: '6px 16px',
                            background: 'var(--color-secondary-container)',
                            color: 'var(--color-on-secondary-container)',
                            borderRadius: 0,
                            fontSize: '0.9rem',
                            fontWeight: 600,
                            textTransform: 'uppercase'
                        }}>
                            Position: {design.position}
                        </span>
                    </div>
                    <p style={{ fontSize: '1.25rem', lineHeight: 1.6, color: 'var(--color-text)', opacity: 0.9 }}>
                        {design.detailedDescription}
                    </p>
                </header>

                <section style={{
                    background: 'var(--color-surface)',
                    padding: '40px',
                    borderRadius: 0,
                    border: '1px solid var(--color-border)',
                    marginBottom: '60px'
                }}>
                    <h2 style={{ marginBottom: '24px' }}>Live Interactive Preview</h2>
                    <div style={{
                        height: '400px',
                        background: 'var(--color-bg)',
                        borderRadius: 0,
                        position: 'relative',
                        overflow: 'hidden',
                        border: '1px dashed var(--color-border)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        textAlign: 'center',
                        padding: '20px'
                    }}>
                        <p style={{ opacity: 0.5 }}>
                            The cookie consent element is rendered relative to this preview area or fixed to the viewport as defined by its position logic.
                            Interact with the popup to test its functionality.
                        </p>
                        <CookieDesignRenderer design={design} onClose={() => navigate('/cookie-consent')} />
                    </div>
                </section>

                <section>
                    <h2 style={{ marginBottom: '24px' }}>Design Specifications</h2>
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                        <div style={{ padding: '24px', background: 'var(--color-surface)', borderRadius: 0, border: '1px solid var(--color-border)' }}>
                            <h4 style={{ marginBottom: '12px' }}>Copywriting</h4>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}><strong>Title:</strong> {design.content.title || 'N/A'}</p>
                            <p style={{ fontSize: '0.9rem', margin: '8px 0' }}><strong>Message:</strong> {design.content.description}</p>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}><strong>Buttons:</strong> {design.content.acceptText}, {design.content.rejectText || 'None'}, {design.content.manageText || 'None'}</p>
                        </div>
                        <div style={{ padding: '24px', background: 'var(--color-surface)', borderRadius: 0, border: '1px solid var(--color-border)' }}>
                            <h4 style={{ marginBottom: '12px' }}>Technical Standard</h4>
                            <p style={{ fontSize: '0.9rem', margin: 0 }}>This design follows <strong>GDPR Article 7</strong> and <strong>CCPA/CPRA</strong> requirements for clear, affirmative consent and easy opt-out mechanisms.</p>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default CookieDesignDetails;
