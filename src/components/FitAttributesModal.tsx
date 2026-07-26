import { useState, useEffect } from 'react';
import type { FitAttribute, UserFitAttribute } from '../api/fitAttributes';
import LoadingSpinner from './LoadingSpinner';

interface FitAttributesModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (attributes: Array<{ fitAttributeId: string; value: string }>) => Promise<boolean>;
  category: 'mens' | 'womens';
  fitAttributes: FitAttribute[];
  currentValues?: UserFitAttribute[];
  loading?: boolean;
  error?: string | null;
}

type AttributeValues = {
  [fitAttributeId: string]: string;
};

export default function FitAttributesModal({ 
  open, 
  onClose, 
  onSave, 
  category,
  fitAttributes,
  currentValues = [],
  loading = false,
  error = null
}: FitAttributesModalProps) {
  const [selectedValues, setSelectedValues] = useState<AttributeValues>({});
  const [isSaving, setIsSaving] = useState(false);

  // Initialize with current values when modal opens
  useEffect(() => {
    if (open && currentValues.length > 0) {
      const initialValues: AttributeValues = {};
      currentValues.forEach(userAttr => {
        if (userAttr.fitAttributeId) {
          initialValues[userAttr.fitAttributeId] = userAttr.value;
        }
      });
      setSelectedValues(initialValues);
    } else if (open) {
      setSelectedValues({});
    }
  }, [open, currentValues]);

  if (!open) return null;

  // Filter fit attributes for the current category
  const categoryAttributes = fitAttributes.filter(attr => attr.category === category);
  
  // Sort by display order
  const sortedAttributes = [...categoryAttributes].sort((a, b) => a.displayOrder - b.displayOrder);

  const handleValueChange = (fitAttributeId: string, value: string) => {
    setSelectedValues(prev => ({
      ...prev,
      [fitAttributeId]: value
    }));
  };

  const handleSave = async () => {
    // Convert selectedValues to array format expected by API
    const attributesArray = Object.entries(selectedValues)
      .filter(([_, value]) => value) // Only include attributes with values
      .map(([fitAttributeId, value]) => ({
        fitAttributeId,
        value
      }));

    if (attributesArray.length === 0) {
      // If no values selected, just close modal
      onClose();
      return;
    }

    setIsSaving(true);
    try {
      const success = await onSave(attributesArray);
      if (success) {
        onClose();
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Check if any values have changed
  const hasChanges = () => {
    const currentValuesMap: AttributeValues = {};
    currentValues.forEach(userAttr => {
      if (userAttr.fitAttributeId) {
        currentValuesMap[userAttr.fitAttributeId] = userAttr.value;
      }
    });

    // Check if any selected value differs from current
    for (const [fitAttrId, value] of Object.entries(selectedValues)) {
      if (value && currentValuesMap[fitAttrId] !== value) {
        return true;
      }
    }

    // Check if any current value is not in selected (i.e., was cleared)
    for (const [fitAttrId, value] of Object.entries(currentValuesMap)) {
      if (value && selectedValues[fitAttrId] !== value) {
        return true;
      }
    }

    return false;
  };

  const isDirty = hasChanges();

  const options = ['Narrow', 'Average', 'Wide'];

  return (
    <div 
      className="modal-overlay"
      role="dialog" 
      aria-modal="true" 
      aria-label="Fit attributes"
      id="fit-attributes-modal"
      data-testid="fit-attributes-modal"
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
        className="card modal-surface"
        data-testid="fit-attributes-modal-content"
        style={{
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          padding: 0,
          minWidth: 700,
          maxWidth: '90vw',
          position: 'relative',
          borderRadius: 0,
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
            borderBottom: '1px solid var(--color-border)'
          }}
        >
          <h3 id="fit-attributes-modal-title" data-testid="fit-attributes-modal-title" style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>
            Fit attributes
          </h3>
          <button
            id="fit-attributes-modal-close"
            data-testid="fit-attributes-modal-close"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 0,
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
            margin: '0 0 24px 0', 
            color: 'var(--color-text)' 
          }}>
            How would you describe your:
          </p>
          
          {loading ? (
            <div id="fit-attributes-loading" data-testid="fit-attributes-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <LoadingSpinner size="medium" text="Loading fit attributes..." />
            </div>
          ) : error ? (
            <div id="fit-attributes-error" data-testid="fit-attributes-error" style={{ 
              backgroundColor: 'var(--color-danger-container)', 
              color: 'var(--color-danger)', 
              padding: '10px', 
              borderRadius: 0, 
              marginBottom: '16px' 
            }}>
              {error}
            </div>
          ) : sortedAttributes.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: 'var(--color-text)', 
              opacity: 0.7 
            }}>
              No fit attributes available for this category.
            </div>
          ) : (
            <>
              {/* Fit attributes grid */}
              <div id="fit-attributes-grid" data-testid="fit-attributes-grid" style={{ 
                display: 'grid',
                gridTemplateColumns: 'repeat(2, 1fr)',
                gap: '32px 48px',
                marginBottom: 32
              }}>
                {sortedAttributes.map((attribute) => {
                  const selectedValue = selectedValues[attribute.id];
                  return (
                    <div key={attribute.id} id={`fit-attr-${attribute.id}`} data-testid={`fit-attr-${attribute.id}`}>
                      <label style={{ 
                        display: 'block', 
                        fontWeight: 700, 
                        marginBottom: 12,
                        fontSize: '16px',
                        color: 'var(--color-text)'
                      }}>
                        {attribute.name}
                      </label>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(3, 1fr)',
                        border: '1px solid var(--color-border)',
                        borderRadius: 0,
                        overflow: 'hidden',
                        background: 'var(--color-surface)'
                      }}>
                        {options.map((option, idx) => {
                          const isSelected = selectedValue === option;
                          const isFirst = idx === 0;
                          
                          return (
                            <button
                              key={option}
                              id={`fit-attr-${attribute.id}-${option.toLowerCase()}`}
                              data-testid={`fit-attr-${attribute.id}-${option.toLowerCase()}`}
                              type="button"
                              onClick={() => handleValueChange(attribute.id, option)}
                              style={{
                                padding: '10px 16px',
                                background: isSelected ? 'var(--color-primary)' : 'transparent',
                                color: isSelected ? 'var(--color-on-primary)' : 'var(--color-text)',
                                border: 'none',
                                borderLeft: isFirst ? 'none' : '1px solid var(--color-outline)',
                                fontWeight: 600,
                                fontSize: '14px',
                                cursor: 'pointer',
                                transition: 'all 0.2s ease',
                                textAlign: 'center'
                              }}
                              aria-pressed={isSelected}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
              
              {/* Save button */}
              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  id="fit-attributes-save"
                  data-testid="fit-attributes-save"
                  onClick={handleSave}
                  disabled={!isDirty || isSaving}
                  className="btn btn-primary"
                  style={{
                    borderRadius: 0,
                    padding: '12px 32px',
                    cursor: (isDirty && !isSaving) ? 'pointer' : 'not-allowed',
                    opacity: (isDirty && !isSaving) ? 1 : 0.6,
                    background: 'var(--color-primary)',
                    color: 'var(--color-on-primary)',
                    fontWeight: 700,
                    fontSize: '16px',
                    minWidth: '120px'
                  }}
                >
                  {isSaving ? <LoadingSpinner size="small" text="" /> : 'Save'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

