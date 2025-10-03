import { useState, useEffect } from 'react';
import { fetchPhysicalStats } from '../api/user';
import LoadingSpinner from './LoadingSpinner';

interface HeightWeightModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { heightUnit: string; weightUnit: string; heightValue: number; weightValue: number }) => void;
}

export default function HeightWeightModal({ open, onClose, onSave }: HeightWeightModalProps) {
  const [heightValue, setHeightValue] = useState<string>('');
  const [heightUnit, setHeightUnit] = useState<'cm' | 'ft'>('cm');
  const [weightValue, setWeightValue] = useState<string>('');
  const [weightUnit, setWeightUnit] = useState<'kg' | 'lb'>('kg');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch physical stats when modal opens
  useEffect(() => {
    if (open) {
      loadPhysicalStats();
    }
  }, [open]);

  const loadPhysicalStats = async () => {
    setIsLoading(true);
    try {
      const response = await fetchPhysicalStats();
      
      if (response.error) {
        setError(response.error.message);
        return;
      }
      
      if (response.stats) {
        // The API response might be structured as { stats: {...} } or the stats object directly
        const statsData = response.stats;
        
        // Extract the values, handling the case where the API response structure might be nested
        const heightCm = statsData.heightCm;
        const heightFt = statsData.heightFt;
        const weightKg = statsData.weightKg;
        const weightLb = statsData.weightLb;
        
        // Handle height - use heightCm if available, otherwise heightFt
        if (heightCm !== null && heightCm !== undefined) {
          setHeightValue(heightCm.toString());
          setHeightUnit('cm');
        } else if (heightFt !== null && heightFt !== undefined) {
          setHeightValue(heightFt.toString());
          setHeightUnit('ft');
        } else {
          // If both are null, reset to default or empty
          setHeightValue('');
          setHeightUnit('cm'); // default to cm
        }
        
        // Handle weight - use weightKg if available, otherwise weightLb
        if (weightKg !== null && weightKg !== undefined) {
          setWeightValue(weightKg.toString());
          setWeightUnit('kg');
        } else if (weightLb !== null && weightLb !== undefined) {
          setWeightValue(weightLb.toString());
          setWeightUnit('lb');
        } else {
          // If both are null, reset to default or empty
          setWeightValue('');
          setWeightUnit('kg'); // default to kg
        }
      } else {
        setHeightValue('');
        setWeightValue('');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch physical stats');
    } finally {
      setIsLoading(false);
    }
  };

  if (!open) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate inputs
    if (!heightValue || !weightValue) {
      setError('Please fill in both height and weight values');
      return;
    }

    const heightNum = parseFloat(heightValue);
    const weightNum = parseFloat(weightValue);
    
    if (isNaN(heightNum) || isNaN(weightNum)) {
      setError('Please enter valid numbers for height and weight');
      return;
    }
    
    if (heightNum <= 0 || weightNum <= 0) {
      setError('Height and weight must be greater than 0');
      return;
    }

    setIsLoading(true);
    setError(null);
    
    try {
      await onSave({
        heightUnit,
        weightUnit,
        heightValue: heightNum,
        weightValue: weightNum
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save physical stats');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div role="dialog" aria-modal="true" aria-label="Height and Weight" id="height-weight-modal" data-testid="height-weight-modal" style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 60,
      padding: '20px'
    }}>
      <div className="card" data-testid="height-weight-modal-content" style={{
        background: 'var(--color-card)',
        color: 'var(--color-text)',
        padding: 0,
        minWidth: 520,
        maxWidth: '90vw',
        position: 'relative',
        borderRadius: 'var(--radius-lg)',
        boxShadow: 'var(--elev-3)',
        overflow: 'hidden'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 20px',
          background: 'var(--color-surface)',
          borderTopLeftRadius: 'var(--radius-lg)',
          borderTopRightRadius: 'var(--radius-lg)',
          borderBottom: '1px solid var(--color-border)'
        }}>
          <h3 id="height-weight-modal-title" data-testid="height-weight-modal-title" style={{ margin: 0, fontWeight: 800, color: 'var(--color-text)' }}>Height and weight</h3>
          <button
            id="height-weight-modal-close"
            data-testid="height-weight-modal-close"
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
        
        <div style={{ padding: 24, background: 'var(--color-card)' }}>
          {isLoading ? (
            <div id="height-weight-loading" data-testid="height-weight-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <LoadingSpinner size="medium" text="Loading your data..." />
            </div>
          ) : (
            <form onSubmit={handleSubmit} id="height-weight-form" data-testid="height-weight-form">
              <p style={{ fontSize: 24, fontWeight: 800, margin: '0 0 20px 0', color: 'var(--color-text)' }}>What's your current height and weight?</p>
              
              {error && (
                <div id="height-weight-error" data-testid="height-weight-error" style={{ 
                  backgroundColor: '#fee2e2', 
                  color: '#b91c1c', 
                  padding: '10px', 
                  borderRadius: 'var(--radius-md)', 
                  marginBottom: '16px' 
                }}>
                  {error}
                </div>
              )}
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                {/* Height input */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 600, 
                    marginBottom: 8,
                    fontSize: 'var(--font-sm)',
                    color: 'var(--color-text)'
                  }}>
                    Height
                  </label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      id="height-input"
                      data-testid="height-input"
                      type="number"
                      value={heightValue}
                      onChange={(e) => setHeightValue(e.target.value)}
                      placeholder="Enter your height"
                      className="input"
                      style={{ 
                        flex: 1,
                        padding: '12px',
                        fontSize: 'var(--font-md)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)'
                      }}
                      step="0.1"
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        id="height-unit-cm"
                        data-testid="height-unit-cm"
                        type="button"
                        onClick={() => setHeightUnit('cm')}
                        style={{
                          borderRadius: 'var(--radius-full)',
                          padding: '8px 16px',
                          background: heightUnit === 'cm' ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: heightUnit === 'cm' ? 'white' : 'var(--color-text)',
                          border: `1px solid ${heightUnit === 'cm' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          fontWeight: 700,
                          fontSize: 'var(--font-sm)',
                          cursor: 'pointer'
                        }}
                        aria-pressed={heightUnit === 'cm'}
                      >
                        cm
                      </button>
                      <button
                        id="height-unit-ft"
                        data-testid="height-unit-ft"
                        type="button"
                        onClick={() => setHeightUnit('ft')}
                        style={{
                          borderRadius: 'var(--radius-full)',
                          padding: '8px 16px',
                          background: heightUnit === 'ft' ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: heightUnit === 'ft' ? 'white' : 'var(--color-text)',
                          border: `1px solid ${heightUnit === 'ft' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          fontWeight: 700,
                          fontSize: 'var(--font-sm)',
                          cursor: 'pointer'
                        }}
                        aria-pressed={heightUnit === 'ft'}
                      >
                        ft
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Weight input */}
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontWeight: 600, 
                    marginBottom: 8,
                    fontSize: 'var(--font-sm)',
                    color: 'var(--color-text)'
                  }}>
                    Weight
                  </label>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <input
                      id="weight-input"
                      data-testid="weight-input"
                      type="number"
                      value={weightValue}
                      onChange={(e) => setWeightValue(e.target.value)}
                      placeholder="Enter your weight"
                      className="input"
                      style={{ 
                        flex: 1,
                        padding: '12px',
                        fontSize: 'var(--font-md)',
                        background: 'var(--color-surface)',
                        color: 'var(--color-text)',
                        border: '1px solid var(--color-border)'
                      }}
                      step="0.1"
                    />
                    <div style={{ display: 'flex', gap: 4 }}>
                      <button
                        id="weight-unit-kg"
                        data-testid="weight-unit-kg"
                        type="button"
                        onClick={() => setWeightUnit('kg')}
                        style={{
                          borderRadius: 'var(--radius-full)',
                          padding: '8px 16px',
                          background: weightUnit === 'kg' ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: weightUnit === 'kg' ? 'white' : 'var(--color-text)',
                          border: `1px solid ${weightUnit === 'kg' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          fontWeight: 700,
                          fontSize: 'var(--font-sm)',
                          cursor: 'pointer'
                        }}
                        aria-pressed={weightUnit === 'kg'}
                      >
                        kg
                      </button>
                      <button
                        id="weight-unit-lb"
                        data-testid="weight-unit-lb"
                        type="button"
                        onClick={() => setWeightUnit('lb')}
                        style={{
                          borderRadius: 'var(--radius-full)',
                          padding: '8px 16px',
                          background: weightUnit === 'lb' ? 'var(--color-primary)' : 'var(--color-surface)',
                          color: weightUnit === 'lb' ? 'white' : 'var(--color-text)',
                          border: `1px solid ${weightUnit === 'lb' ? 'var(--color-primary)' : 'var(--color-border)'}`,
                          fontWeight: 700,
                          fontSize: 'var(--font-sm)',
                          cursor: 'pointer'
                        }}
                        aria-pressed={weightUnit === 'lb'}
                      >
                        lb
                      </button>
                    </div>
                  </div>
                </div>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 28, gap: 12 }}>
                <button
                  id="height-weight-cancel"
                  data-testid="height-weight-cancel"
                  type="button"
                  onClick={onClose}
                  className="btn"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 28px',
                  }}
                >
                  Cancel
                </button>
                <button
                  id="height-weight-save"
                  data-testid="height-weight-save"
                  type="submit"
                  className="btn btn-primary"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 28px',
                  }}
                  disabled={isLoading}
                >
                  {isLoading ? <LoadingSpinner size="small" text="Saving..." /> : 'Save'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}