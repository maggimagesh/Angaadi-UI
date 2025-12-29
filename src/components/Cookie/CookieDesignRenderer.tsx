import React from 'react';
import type { CookieDesign } from './designs';

interface CookieDesignRendererProps {
    design: CookieDesign;
    onClose: () => void;
}

export const CookieDesignRenderer: React.FC<CookieDesignRendererProps> = ({ design, onClose }) => {
    const [isVisible, setIsVisible] = React.useState(design.id !== 'delayed-slow-slide');
    const { style, content, position, type } = design;

    React.useEffect(() => {
        if (design.id === 'delayed-slow-slide') {
            const timer = setTimeout(() => {
                setIsVisible(true);
            }, 2000);
            return () => clearTimeout(timer);
        }
    }, [design.id]);

    if (!isVisible) return null;

    const getPositionStyles = (): React.CSSProperties => {
        if (type === 'full-screen') {
            return { position: 'fixed', inset: 0, zIndex: 10000 };
        }

        switch (position) {
            case 'top':
                return { top: 0, left: 0, right: 0, position: 'fixed', zIndex: 9999 };
            case 'bottom':
                return { bottom: 0, left: 0, right: 0, position: 'fixed', zIndex: 9999 };
            case 'center':
                return {
                    top: '50%',
                    left: '50%',
                    transform: 'translate(-50%, -50%)',
                    position: 'fixed',
                    zIndex: 9999,
                };
            case 'bottom-right':
                return { bottom: 0, right: 0, position: 'fixed', zIndex: 9999 };
            case 'bottom-left':
                return { bottom: 0, left: 0, position: 'fixed', zIndex: 9999 };
            default:
                return {};
        }
    };

    const overlayStyle: React.CSSProperties = (type === 'popup' || position === 'center') && type !== 'full-screen' ? {
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0, 0, 0, 0.4)',
        backdropFilter: 'blur(4px)',
        zIndex: 9998,
    } : {};

    return (
        <>
            <style>
                {`
          @keyframes slowSlideUp {
            from { transform: translateY(100%); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
        `}
            </style>
            {(type === 'popup' || position === 'center') && type !== 'full-screen' && (
                <div style={overlayStyle} onClick={onClose} />
            )}
            <div style={{ ...getPositionStyles(), ...style }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {content.title && (
                        <h3 style={{ margin: 0, color: 'inherit', fontSize: '1.25rem', fontWeight: 700 }}>
                            {content.title}
                        </h3>
                    )}
                    <p style={{ margin: 0, color: 'inherit', opacity: 0.9, fontSize: '0.95rem', lineHeight: 1.5 }}>
                        {content.description}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', marginTop: '8px', flexWrap: 'wrap' }}>
                        <button
                            onClick={onClose}
                            style={{
                                padding: '10px 20px',
                                borderRadius: '8px',
                                border: 'none',
                                background: design.id.includes('dark') || design.id.includes('black') ? '#ffffff' : '#000000',
                                color: design.id.includes('dark') || design.id.includes('black') ? '#000000' : '#ffffff',
                                fontWeight: 600,
                                cursor: 'pointer',
                                transition: 'transform 0.2s',
                            }}
                            onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.05)')}
                            onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
                        >
                            {content.acceptText}
                        </button>
                        {content.rejectText && (
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: '1px solid currentColor',
                                    background: 'transparent',
                                    color: 'inherit',
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    opacity: 0.8,
                                }}
                            >
                                {content.rejectText}
                            </button>
                        )}
                        {content.manageText && (
                            <button
                                onClick={onClose}
                                style={{
                                    padding: '10px 20px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    background: 'transparent',
                                    color: 'inherit',
                                    textDecoration: 'underline',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    opacity: 0.7,
                                }}
                            >
                                {content.manageText}
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </>
    );
};
