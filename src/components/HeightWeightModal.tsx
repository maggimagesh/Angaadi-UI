import { useState, useEffect } from 'react';
import { fetchPhysicalStats } from '../api/user';
import LoadingSpinner from './LoadingSpinner';
import { BaseModal } from './BaseModal';
import { ToggleButtonGroup } from './ToggleButtonGroup';
import { ErrorMessage } from './ErrorMessage';

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
    <BaseModal
      open={open}
      onClose={onClose}
      title="Height and weight"
      testIdPrefix="height-weight-modal"
      size="medium"
    >
      {isLoading ? (
        <div id="height-weight-loading" data-testid="height-weight-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
          <LoadingSpinner size="medium" text="Loading your data..." />
        </div>
      ) : (
        <form onSubmit={handleSubmit} id="height-weight-form" data-testid="height-weight-form">
          <p style={{ fontSize: 24, fontWeight: 800, margin: '0 0 20px 0', color: 'var(--color-text)' }}>What's your current height and weight?</p>
          
          <ErrorMessage message={error || ''} testId="height-weight-error" />
              
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
                    <ToggleButtonGroup
                      options={['cm', 'ft'] as const}
                      value={heightUnit}
                      onChange={setHeightUnit}
                      testIdPrefix="height-unit"
                    />
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
                    <ToggleButtonGroup
                      options={['kg', 'lb'] as const}
                      value={weightUnit}
                      onChange={setWeightUnit}
                      testIdPrefix="weight-unit"
                    />
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
    </BaseModal>
  );
}