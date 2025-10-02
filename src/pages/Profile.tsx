import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { fetchPreferredDepartment, setPreferredDepartment, deactivatePreferredDepartment, fetchGenderOptions } from '../api/gender'
import { savePhysicalStats, fetchPhysicalStats } from '../api/user'
import HeightWeightModal from '../components/HeightWeightModal'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const [profileName, setProfileName] = useState<string>('')
  const [profileEmail, setProfileEmail] = useState<string>('')

  useEffect(() => {
    // Only use local user data, no API calls
    const nameFromParts = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
    setProfileName(nameFromParts || '')
    setProfileEmail(user?.emailId || '')
  }, [user])

  const [activeDeptTab, setActiveDeptTab] = useState<'women' | 'men'>('women')

  const [preferredDepartment, setPreferredDepartment] = useState<string | null>(null)
  
  // Height and weight state
  const [heightWeight, setHeightWeight] = useState<{ height: string; weight: string } | null>(null);
  const [heightWeightModalOpen, setHeightWeightModalOpen] = useState<boolean>(false);

  // Loading states
  const [preferredDeptLoading, setPreferredDeptLoading] = useState<boolean>(false);
  const [heightWeightLoading, setHeightWeightLoading] = useState<boolean>(false);

  // Load preferred department when component mounts
  useEffect(() => {
    if (user?.userId) {
      loadPreferredDepartment();
      loadHeightWeightData();
    }
  }, [user?.userId])

  const loadPreferredDepartment = async () => {
    if (!user?.userId) return
    
    setPreferredDeptLoading(true);
    try {
      const result = await fetchPreferredDepartment(user.userId)
      if (result.preference) {
        // The API response has a 'preference' object with 'gender' field
        setPreferredDepartment(result.preference.gender)
      }
    } catch (error) {
      console.error('Failed to load preferred department:', error)
    } finally {
      setPreferredDeptLoading(false);
    }
  }

  const loadHeightWeightData = async () => {
    if (!user?.userId) return;
    
    setHeightWeightLoading(true);
    try {
      const result = await fetchPhysicalStats();
      if (result.stats) {
        // Extract values based on the actual API response structure
        const stats = result.stats;
        
        // Determine height value and unit
        let heightValue, heightUnit;
        if (stats.heightCm !== null && stats.heightCm !== undefined) {
          heightValue = stats.heightCm;
          heightUnit = 'cm';
        } else if (stats.heightFt !== null && stats.heightFt !== undefined) {
          heightValue = stats.heightFt;
          heightUnit = 'ft';
        } else {
          heightValue = null;
          heightUnit = '';
        }
        
        // Determine weight value and unit
        let weightValue, weightUnit;
        if (stats.weightKg !== null && stats.weightKg !== undefined) {
          weightValue = stats.weightKg;
          weightUnit = 'kg';
        } else if (stats.weightLb !== null && stats.weightLb !== undefined) {
          weightValue = stats.weightLb;
          weightUnit = 'lb';
        } else {
          weightValue = null;
          weightUnit = '';
        }
        
        if (heightValue !== null && weightValue !== null) {
          setHeightWeight({
            height: `${heightValue} ${heightUnit}`,
            weight: `${weightValue} ${weightUnit}`
          });
        } else {
          setHeightWeight(null);
        }
      }
    } catch (error) {
      console.error('Failed to load height and weight data:', error);
    } finally {
      setHeightWeightLoading(false);
    }
  };

  const saveHeightWeightData = async (data: { heightUnit: string; weightUnit: string; heightValue: number; weightValue: number }) => {
    if (!user?.userId) {
      console.error('User not authenticated');
      return;
    }

    try {
      const result = await savePhysicalStats(user.userId, data);
      if (result.success) {
        setHeightWeight({
          height: `${data.heightValue} ${data.heightUnit}`,
          weight: `${data.weightValue} ${data.weightUnit}`
        });
        
        // Show success message
        try {
          const { openSuccessWithDuration } = await import('../store/ui').then(m => ({ 
            openSuccessWithDuration: m.useUIStore.getState().openSuccessWithDuration 
          }));
          openSuccessWithDuration('Height and weight saved successfully', 4000);
        } catch {}
        
        return true;
      } else {
        console.error('Failed to save physical stats:', result.error?.message);
        return false;
      }
    } catch (error) {
      console.error('Error saving physical stats:', error);
      return false;
    }
  };

  return (
    <main className="app-main">
      <section className="container p-6">
        <header style={{display:'flex', alignItems:'center', gap:16, marginBottom:16}}>
          <div style={{width:64, height:64, borderRadius:'50%', background:'var(--color-border)'}} aria-hidden="true" />
          <div>
            <h1 style={{margin:0}}>{profileName}</h1>
            {profileEmail && (
              <div style={{opacity:0.8, marginTop:4}}>{profileEmail}</div>
            )}
          </div>
        </header>

        <div className="card p-0" role="region" aria-label="Profile preferences">
          <div style={{borderBottom:'1px solid var(--color-border)', padding:16, display:'flex', alignItems:'center', gap:12}}>
            <button className="btn btn-ghost" aria-current="page">Clothing and Shoes</button>
            <div className="surface" style={{padding:'6px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--color-border)'}}>Size, fit and price</div>
          </div>

          <div style={{padding:16}}>
            <section aria-label="About you" style={{borderTop:'1px solid var(--color-border)'}}>
              <h2 className="sr-only">About you</h2>
              <PreferredDepartmentRow
                value={preferredDepartment}
                onChange={(val) => setPreferredDepartment(val)}
                onClear={() => setPreferredDepartment(null)}
                loading={preferredDeptLoading}
              />
              <HeightWeightRow
                value={heightWeight}
                onAdd={() => setHeightWeightModalOpen(true)}
                onUpdate={() => setHeightWeightModalOpen(true)}
                loading={heightWeightLoading}
              />
              <PreferenceRow label="Age group" />
            </section>

            <section aria-label="Department preferences" style={{marginTop:12}}>
              <h2 style={{fontSize:16, fontWeight:700}}>Department preferences</h2>
              <p style={{marginTop:4, opacity:0.85}}>Share preferences for each department to get improved recommendations when you shop there.</p>

              <nav aria-label="Department tabs" style={{display:'flex', gap:16, borderBottom:'1px solid var(--color-border)', marginTop:12}}>
                <button
                  className="btn btn-ghost"
                  role="tab"
                  aria-selected={activeDeptTab==='women'}
                  onClick={() => setActiveDeptTab('women')}
                  style={{borderBottom: activeDeptTab==='women' ? '2px solid currentColor' : '2px solid transparent'}}
                >
                  Women’s
                </button>
                <button
                  className="btn btn-ghost"
                  role="tab"
                  aria-selected={activeDeptTab==='men'}
                  onClick={() => setActiveDeptTab('men')}
                  style={{borderBottom: activeDeptTab==='men' ? '2px solid currentColor' : '2px solid transparent'}}
                >
                  Men’s
                </button>
              </nav>

              <div role="tabpanel" style={{marginTop:8}}>
                <PreferenceRow label="Fit attributes" />
                <PreferenceRow label="Shoes" />
              </div>
            </section>

            <section aria-label="Interests" style={{marginTop:12}}>
              <h2 style={{fontSize:16, fontWeight:700}}>Interests</h2>
              <div style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
                {['Skin Care','Storage & Organization','Interior Design','Dorm Essentials','Hair Care and Styling','Babies and Toddlers','Baking','Women\'s Attire','Men\'s Attire','Party Planning'].map(tag => (
                  <button key={tag} className="btn" aria-label={`Add interest ${tag}`}>+ {tag}</button>
                ))}
              </div>
              <div style={{marginTop:16}}>
                <button className="btn btn-primary">Save</button>
              </div>
            </section>
          </div>
        </div>
      </section>

      {heightWeightModalOpen && (
        <HeightWeightModal
          open={heightWeightModalOpen}
          onClose={() => setHeightWeightModalOpen(false)}
          onSave={saveHeightWeightData}
        />
      )}
    </main>
  )
}

function PreferenceRow({ label }: { label: string }) {
  return (
    <div style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center', padding:'12px 0', borderBottom:'1px solid var(--color-border)'}}>
      <div style={{fontWeight:600}}>{label}</div>
      <div style={{opacity:0.7}}>--</div>
      <button className="btn" aria-label={`Edit ${label}`}>▾</button>
    </div>
  )
}

type HeightWeightRowProps = {
  value: { height: string; weight: string } | null;
  onAdd: () => void;
  onUpdate: () => void;
  loading?: boolean;
}

function HeightWeightRow({ value, onAdd, onUpdate, loading = false }: HeightWeightRowProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  return (
    <div style={{borderBottom:'1px solid var(--color-border)'}}>
      <div
        style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center', padding:'12px 0'}}
      >
        <div style={{fontWeight:600, color: 'var(--color-text)'}}>Height and weight</div>
        <div style={{opacity: value ? 1 : 0.7, color: 'var(--color-text)'}}>
          {loading ? (
            <LoadingSpinner size="small" text="Loading..." />
          ) : value ? `${value.height} | ${value.weight}` : '--'}
        </div>
        <button
          className="btn"
          aria-expanded={expanded}
          aria-controls="height-weight-panel"
          onClick={() => setExpanded(v => !v)}
          style={{ color: 'var(--color-text)' }}
          disabled={loading}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div id="height-weight-panel" style={{padding:'0 0 12px 0', display: 'flex', flexDirection: 'column', gap: 8}}>
          {!value ? (
            <button
              className="btn"
              style={{borderRadius:'var(--radius-full)', alignSelf: 'flex-start'}}
              onClick={onAdd}
              aria-label="Add height and weight"
            >
              + Add
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
                  {value.height} | {value.weight}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn btn-primary"
                  style={{ borderRadius: 'var(--radius-full)', height: 32, padding: '0 12px', fontSize: 14 }}
                  onClick={onUpdate}
                  aria-label="Update height and weight"
                >
                  Update
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

type PreferredDepartmentRowProps = {
  value: string | null
  onChange: (value: string) => void
  onClear: () => void
  loading?: boolean
}

type GenderOption = { id: string; label: string }

function PreferredDepartmentRow({ value, onChange, onClear, loading = false }: PreferredDepartmentRowProps) {
  const [expanded, setExpanded] = useState<boolean>(false)
  const [pickerOpen, setPickerOpen] = useState<boolean>(false)
  const [clearOpen, setClearOpen] = useState<boolean>(false)
  const [optionsLoading, setOptionsLoading] = useState<boolean>(true)
  const [optionsError, setOptionsError] = useState<string | null>(null)
  const authUser = useAuthStore(s => s.user)
  const [options, setOptions] = useState<GenderOption[]>([])
  
  async function loadGenderOptions(): Promise<void> {
    setOptionsLoading(true)
    setOptionsError(null)
    try {
      const result = await fetchGenderOptions()
      if (result.options) {
        setOptions(result.options)
      } else {
        setOptionsError(result.error?.message || 'Failed to load gender options')
        // Fallback to default options
        setOptions([
          { id: 'women', label: 'Women\'s' },
          { id: 'men', label: 'Men\'s' },
          { id: 'unisex', label: 'Unisex' }
        ])
      }
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : 'Failed to load gender options')
      // Fallback to default options
      setOptions([
        { id: 'women', label: 'Women\'s' },
        { id: 'men', label: 'Men\'s' },
        { id: 'unisex', label: 'Unisex' }
      ])
    } finally {
      setOptionsLoading(false)
    }
  }



  function openPickerAndLoad() {
    setPickerOpen(true)
    // Load options if they haven't been loaded yet, or refresh them
    if (options.length === 0 || optionsLoading) {
      loadGenderOptions()
    }
  }

  async function savePreferred(opt: GenderOption): Promise<boolean> {
    if (!authUser?.userId) {
      setOptionsError('User not authenticated')
      return false
    }
    
    try {
      const result = await setPreferredDepartment(authUser.userId, opt.id)
      if (result.department) {
        onChange(opt.label)
        setPickerOpen(false)
        if (!expanded) setExpanded(true)
        return true
      } else {
        setOptionsError(result.error?.message || 'Failed to save preferred department')
        return false
      }
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : 'Failed to save preferred department')
      return false
    }
  }

  async function clearPreferred(): Promise<boolean> {
    if (!authUser?.userId) {
      setOptionsError('User not authenticated')
      return false
    }
    
    try {
      const result = await deactivatePreferredDepartment(authUser.userId)
      if (result.success) {
        onClear()
        return true
      } else {
        setOptionsError(result.error?.message || 'Failed to clear preferred department')
        return false
      }
    } catch (error) {
      setOptionsError(error instanceof Error ? error.message : 'Failed to clear preferred department')
      return false
    }
  }

  return (
    <div style={{borderBottom:'1px solid var(--color-border)'}}>
      <div
        style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center', padding:'12px 0'}}
      >
        <div style={{fontWeight:600}}>Preferred department</div>
        <div style={{opacity: value ? 1 : 0.7}}>
          {loading ? (
            <LoadingSpinner size="small" text="Loading..." />
          ) : value ?? '--'}
        </div>
        <button
          className="btn"
          aria-expanded={expanded}
          aria-controls="pref-dept-panel"
          onClick={() => setExpanded(v => !v)}
          disabled={loading}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div id="pref-dept-panel" style={{padding:'0 0 12px 0'}}>
          <div>
            {!value ? (
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <button
                  className="btn"
                  style={{borderRadius:9999}}
                  onClick={openPickerAndLoad}
                  aria-label="Add preferred department"
                >
                  + Add
                </button>
              </div>
            ) : (
              <div>
                <div style={{fontSize:22, fontWeight:800, marginBottom:8}}>{value}</div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <button
                    className="btn btn-primary"
                    style={{borderRadius:9999, height:32, padding:'0 12px', fontSize:14}}
                    onClick={openPickerAndLoad}
                    aria-label="Update preferred department"
                  >
                    Update
                  </button>
                  <button
                    className="btn"
                    style={{borderRadius:9999, height:32, padding:'0 12px', fontSize:14}}
                    onClick={() => setClearOpen(true)}
                    aria-label="Clear preferred department"
                  >
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {pickerOpen && (
        <DeptPickerModal
          current={value}
          options={options}
          loading={optionsLoading}
          error={optionsError}
          onClose={() => setPickerOpen(false)}
          onSave={async (opt: GenderOption) => {
            const ok = await savePreferred(opt)
            if (ok) {
              onChange(opt.label)
              setPickerOpen(false)
              if (!expanded) setExpanded(true)
            }
          }}
        />
      )}

      {clearOpen && (
        <ConfirmClearModal
          onCancel={() => setClearOpen(false)}
          onConfirm={async () => {
            const ok = await clearPreferred()
            if (ok) {
              onClear()
              try {
                const resJson = { message: 'The gender has been removed successfully' }
                const { openSuccessWithDuration } = await import('../store/ui').then(m => ({ openSuccessWithDuration: m.useUIStore.getState().openSuccessWithDuration }))
                openSuccessWithDuration(resJson.message, 4000)
              } catch {}
            }
            setClearOpen(false)
          }}
        />
      )}
    </div>
  )
}

function DeptPickerModal({ current, options, loading, error, onClose, onSave }: { current: string | null; options: { id: string; label: string }[] | null; loading: boolean; error: string | null; onClose: () => void; onSave: (opt: { id: string; label: string }) => void }) {
  const [choice, setChoice] = useState<{ id: string; label: string } | null>(null)
  // Preselect previously chosen option by label
  useEffect(() => {
    if (!choice && current && Array.isArray(options)) {
      const found = options.find(o => String(o.label).toLowerCase() === String(current).toLowerCase()) || null
      if (found) setChoice(found)
    }
  }, [options, current, choice])
  const isDirty = choice !== null && (choice?.label !== current)
  return (
    <div role="dialog" aria-modal="true" aria-label="Preferred Department" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60}}>
      <div className="card" style={{background:'#fff', color:'#000', padding:0, minWidth:520, position:'relative', borderRadius:16, boxShadow:'0 10px 24px rgba(0,0,0,0.45)'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'#f3f4f6', borderTopLeftRadius:16, borderTopRightRadius:16, borderBottom:'1px solid #e5e7eb'}}>
          <h3 style={{margin:0, fontWeight:800, color:'#000'}}>Preferred department</h3>
          <button
            aria-label="Close"
            onClick={onClose}
            style={{width:40, height:40, borderRadius:12, background:'#0b0c0f', color:'#fff', border:'1px solid #0b0c0f', cursor:'pointer'}}
          >
            ×
          </button>
        </div>
        <div style={{padding:24}}>
          <p style={{fontSize:24, fontWeight:800, margin:'0 0 16px 0'}}>Which department do you typically shop in?</p>
          {loading ? (
            <div>Loading…</div>
          ) : error ? (
            <div style={{color:'#b91c1c'}}>Failed to load options</div>
          ) : (
            <div style={{display:'flex', gap:12, flexWrap:'wrap'}}>
              {(options ?? []).map((opt) => {
                const isSelected = choice?.id === opt.id
                return (
                  <button
                    key={opt.id}
                    onClick={() => setChoice(opt)}
                    style={{
                      borderRadius:9999,
                      padding:'12px 20px',
                      background: isSelected ? '#3e6ae1' : '#ffffff',
                      color: isSelected ? '#ffffff' : '#111827',
                      border: `1px solid ${isSelected ? '#3e6ae1' : '#d1d5db'}`,
                      fontWeight:700,
                    }}
                  >
                    {opt.label}
                  </button>
                )
              })}
            </div>
          )}
          <div style={{display:'flex', justifyContent:'flex-end', marginTop:28}}>
            <button
              onClick={() => { if (choice) { onSave(choice) } }}
              disabled={!isDirty}
              className="btn btn-primary"
              style={{
                borderRadius:9999,
                padding:'10px 28px',
                cursor: isDirty ? 'pointer' : 'not-allowed',
                opacity: isDirty ? 1 : 0.6,
              }}
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function ConfirmClearModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm clear" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70}}>
      <div className="card" style={{background:'#fff', color:'#000', padding:20, minWidth:420, position:'relative', borderRadius:16}}>
        <h3 style={{margin:'0 0 8px 0', fontWeight:800, color:'#000'}}>Are you sure want to clear?</h3>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:16}}>
          <button className="btn" onClick={onCancel} style={{borderRadius:9999, height:36, padding:'0 14px'}}>No</button>
          <button className="btn btn-primary" onClick={onConfirm} style={{borderRadius:9999, height:36, padding:'0 14px'}}>Yes</button>
        </div>
      </div>
    </div>
  )
}


