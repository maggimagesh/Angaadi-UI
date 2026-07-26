import { useState, useEffect } from 'react';
import type { AgeGroup } from '../api/ageGroup';
import LoadingSpinner from './LoadingSpinner';
import { BaseModal } from './BaseModal';
import { ErrorMessage } from './ErrorMessage';

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

  // Sync modal selection with the current value whenever it becomes visible or the source value changes
  useEffect(() => {
    if (open) {
      setSelectedAgeGroupId(currentAgeGroupId ?? null);
    }
  }, [open, currentAgeGroupId]);

  const handleSave = () => {
    if (selectedAgeGroupId) {
      onSave(selectedAgeGroupId);
    }
  };

  const isDirty = selectedAgeGroupId !== null && selectedAgeGroupId !== currentAgeGroupId;

  return (
    <BaseModal
      open={open}
      onClose={onClose}
      title="Age group"
      testIdPrefix="age-group-modal"
      size="medium"
    >
      <p style={{ 
        fontSize: 24, 
        fontWeight: 800, 
        margin: '0 0 20px 0', 
        color: 'var(--color-text)' 
      }}>
        What is your age group?
      </p>
      
      {loading ? (
        <div id="age-group-loading" data-testid="age-group-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <LoadingSpinner size="medium" text="Loading age groups..." />
        </div>
      ) : (
        <>
          <ErrorMessage message={error || ''} testId="age-group-error" />
          
          {/* Age group buttons grid */}
              <div id="age-group-options" data-testid="age-group-options" style={{ 
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
                      id={`age-group-option-${ageGroup.id}`}
                      data-testid={`age-group-option-${ageGroup.id}`}
                      onClick={() => setSelectedAgeGroupId(ageGroup.id)}
                      style={{
                        borderRadius: 0,
                        padding: '12px 20px',
                        background: isSelected ? 'var(--color-primary)' : 'var(--color-primary-container)',
                        color: isSelected ? 'var(--color-on-primary)' : 'var(--color-text)',
                        border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-outline)'}`,
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
              id="age-group-save"
              data-testid="age-group-save"
              onClick={handleSave}
              disabled={!isDirty}
              className="btn btn-primary"
              style={{
                borderRadius: 0,
                padding: '10px 28px',
                cursor: isDirty ? 'pointer' : 'not-allowed',
                opacity: isDirty ? 1 : 0.6,
                background: 'var(--color-primary)',
                color: 'var(--color-on-primary)',
                fontWeight: 700
              }}
            >
              Save
            </button>
          </div>
        </>
      )}
    </BaseModal>
  );
}

