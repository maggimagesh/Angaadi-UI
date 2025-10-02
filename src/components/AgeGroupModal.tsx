import { useState, useEffect } from 'react';
import type { AgeGroup } from '../api/ageGroup';
import LoadingSpinner from './LoadingSpinner';

interface AgeGroupModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (ageGroupId: string) => void;
  currentAgeGroupId?: string | null;
  ageGroups: AgeGroup[];
  loading?: boolean;
  error?: string | null;
}

export default function AgeGroupModal({ 
  open, 
  onClose, 
  onSave, 
  currentAgeGroupId, 
  ageGroups,
  loading = false,
  error = null
}: AgeGroupModalProps) {
  const [selectedAgeGroupId, setSelectedAgeGroupId] = useState<string | null>(currentAgeGroupId || null);

  // Update selected age group when currentAgeGroupId changes
  useEffect(() => {
    if (currentAgeGroupId) {
      setSelectedAgeGroupId(currentAgeGroupId);
    }
  }, [currentAgeGroupId]);

  if (!open) return null;

  const handleSave = () => {
    if (selectedAgeGroupId) {
      onSave(selectedAgeGroupId);
    }
  };

  const isDirty = selectedAgeGroupId !== null && selectedAgeGroupId !== currentAgeGroupId;

  return (
    <div 
      role="dialog" 
      aria-modal="true" 
      aria-label="Age group" 
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 60,
        padding: '20px'
      }}
    >
      <div 
        className="card" 
        style={{
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          padding: 0,
          minWidth: 520,
          maxWidth: '90vw',
          position: 'relative',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elev-3)',
          overflow: 'hidden'
        }}
      >
        {/* Header */}
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            background: 'var(--color-surface)',
            borderTopLeftRadius: 'var(--radius-lg)',
            borderTopRightRadius: 'var(--radius-lg)',
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <h3 style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>
            Age group
          </h3>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              border: '1px solid var(--color-border)',
              cursor: 'pointer',
              fontSize: '18px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>
        
        {/* Content */}
        <div style={{ padding: 24, background: 'var(--color-card)' }}>
          <p style={{ 
            fontSize: 24, 
            fontWeight: 800, 
            margin: '0 0 20px 0', 
            color: 'var(--color-text)' 
          }}>
            What is your age group?
          </p>
          
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <LoadingSpinner size="medium" text="Loading age groups..." />
            </div>
          ) : error ? (
            <div style={{ 
              backgroundColor: '#fee2e2', 
              color: '#b91c1c', 
              padding: '10px', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '16px' 
            }}>
              {error}
            </div>
          ) : (
            <>
              {/* Age group buttons grid */}
              <div style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
                gap: 12,
                marginBottom: 28
              }}>
                {ageGroups.map((ageGroup) => {
                  const isSelected = selectedAgeGroupId === ageGroup.id;
                  return (
                    <button
                      key={ageGroup.id}
                      onClick={() => setSelectedAgeGroupId(ageGroup.id)}
                      style={{
                        borderRadius: 'var(--radius-full)',
                        padding: '12px 20px',
                        background: isSelected ? 'var(--color-primary)' : 'var(--color-surface)',
                        color: isSelected ? '#ffffff' : 'var(--color-text)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-border)'}`,
                        fontWeight: 700,
                        fontSize: 'var(--font-md)',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease'
                      }}
                      aria-pressed={isSelected}
                    >
                      {ageGroup.ageRange}
                    </button>
                  );
                })}
              </div>
              
              {/* Save button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={handleSave}
                  disabled={!isDirty}
                  className="btn btn-primary"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 28px',
                    cursor: isDirty ? 'pointer' : 'not-allowed',
                    opacity: isDirty ? 1 : 0.6,
                    background: 'var(--color-primary)',
                    color: '#ffffff',
                    fontWeight: 700
                  }}
                >
                  Save
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

