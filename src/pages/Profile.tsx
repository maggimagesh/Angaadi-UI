import { useEffect, useState } from 'react'
import { useAuthStore } from '../store/auth'
import { useUIStore } from '../store/ui'
import { fetchPreferredDepartment, setPreferredDepartment, deactivatePreferredDepartment, fetchGenderOptions } from '../api/gender'
import { savePhysicalStats, fetchPhysicalStats, fetchUserById } from '../api/user'
import { fetchAllAgeGroups, fetchUserAgeGroup, saveUserAgeGroup, removeUserAgeGroup } from '../api/ageGroup'
import { fetchAllFitAttributes, fetchUserFitAttributes, batchSaveFitAttributes } from '../api/fitAttributes'
import type { AgeGroup } from '../api/ageGroup'
import type { FitAttribute, UserFitAttribute } from '../api/fitAttributes'
import HeightWeightModal from '../components/HeightWeightModal'
import AgeGroupModal from '../components/AgeGroupModal'
import FitAttributesModal from '../components/FitAttributesModal'
import LoadingSpinner from '../components/LoadingSpinner'

export default function ProfilePage() {
  const user = useAuthStore(s => s.user)
  const [profileName, setProfileName] = useState<string>('')
  const [profileEmail, setProfileEmail] = useState<string>('')

  // Load user profile data from API
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user?.userId) {
        // Fallback to local user data if no userId
        const nameFromParts = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
        const emailId = user?.emailId || ''
        setProfileName(nameFromParts || 'User')
        setProfileEmail(emailId)
        return
      }

      try {
        const result = await fetchUserById(user.userId)
        if (result.user) {
          const nameFromParts = [result.user.firstName, result.user.lastName].filter(Boolean).join(' ').trim()
          const emailId = result.user.emailId || user.emailId || ''
          setProfileName(nameFromParts || 'User')
          setProfileEmail(emailId)
        } else {
          // Fallback to local user data on error
          const nameFromParts = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
          const emailId = user?.emailId || ''
          setProfileName(nameFromParts || 'User')
          setProfileEmail(emailId)
        }
      } catch (error) {
        console.error('Failed to load user profile:', error)
        // Fallback to local user data on error
        const nameFromParts = [user?.firstName, user?.lastName].filter(Boolean).join(' ').trim()
        const emailId = user?.emailId || ''
        setProfileName(nameFromParts || 'User')
        setProfileEmail(emailId)
      }
    }

    loadUserProfile()
  }, [user?.userId, user?.firstName, user?.lastName, user?.emailId])

  const [preferredDepartment, setPreferredDepartment] = useState<string | null>(null)
  
  // Height and weight state
  const [heightWeight, setHeightWeight] = useState<{ height: string; weight: string } | null>(null);
  const [heightWeightModalOpen, setHeightWeightModalOpen] = useState<boolean>(false);

  // Age group state
  const [ageGroup, setAgeGroup] = useState<string | null>(null);
  const [ageGroupId, setAgeGroupId] = useState<string | null>(null);
  const [ageGroupModalOpen, setAgeGroupModalOpen] = useState<boolean>(false);
  const [ageGroupClearOpen, setAgeGroupClearOpen] = useState<boolean>(false);
  const [allAgeGroups, setAllAgeGroups] = useState<AgeGroup[]>([]);
  const [ageGroupsError, setAgeGroupsError] = useState<string | null>(null);

  // Fit attributes state
  const [allFitAttributes, setAllFitAttributes] = useState<FitAttribute[]>([]);
  const [userFitAttributes, setUserFitAttributes] = useState<UserFitAttribute[]>([]);
  const [fitAttributesLastUpdated, setFitAttributesLastUpdated] = useState<string | null>(null);
  const [fitAttributesModalOpen, setFitAttributesModalOpen] = useState<boolean>(false);
  const [fitAttributesModalCategory, setFitAttributesModalCategory] = useState<'womens' | 'mens'>('womens');
  const [fitAttributesClearOpen, setFitAttributesClearOpen] = useState<boolean>(false);
  const [fitAttributesLoading, setFitAttributesLoading] = useState<boolean>(false);
  const [fitAttributesError, setFitAttributesError] = useState<string | null>(null);

  // Loading states
  const [preferredDeptLoading, setPreferredDeptLoading] = useState<boolean>(false);
  const [heightWeightLoading, setHeightWeightLoading] = useState<boolean>(false);
  const [ageGroupLoading, setAgeGroupLoading] = useState<boolean>(false);
  const [ageGroupsLoading, setAgeGroupsLoading] = useState<boolean>(false);

  // Load preferred department when component mounts
  useEffect(() => {
    if (user?.userId) {
      loadPreferredDepartment();
      loadHeightWeightData();
      loadAgeGroupData();
      loadUserFitAttributes();
    }
  }, [user?.userId])

  // Load all age groups and fit attributes on component mount (only once)
  useEffect(() => {
    loadAllAgeGroups();
    loadAllFitAttributes();
  }, [])

  const loadPreferredDepartment = async () => {
    if (!user?.userId) return
    
    setPreferredDeptLoading(true);
    try {
      const result = await fetchPreferredDepartment(user.userId)
      if (result.preference) {
        const { department, gender } = result.preference
        setPreferredDepartment(department ?? gender ?? null)
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

  const loadAllAgeGroups = async () => {
    setAgeGroupsLoading(true);
    setAgeGroupsError(null);
    try {
      const result = await fetchAllAgeGroups();
      if (result.ageGroups) {
        setAllAgeGroups(result.ageGroups);
      } else {
        setAgeGroupsError(result.error?.message || 'Failed to load age groups');
      }
    } catch (error) {
      console.error('Failed to load age groups:', error);
      setAgeGroupsError('Failed to load age groups');
    } finally {
      setAgeGroupsLoading(false);
    }
  };

  const loadAgeGroupData = async () => {
    if (!user?.userId) return;
    
    setAgeGroupLoading(true);
    try {
      const result = await fetchUserAgeGroup(user.userId);
      if (result.userAgeGroup?.ageGroup) {
        setAgeGroup(result.userAgeGroup.ageGroup.ageRange);
        setAgeGroupId(result.userAgeGroup.ageGroupId);
      } else {
        setAgeGroup(null);
        setAgeGroupId(null);
      }
    } catch (error) {
      console.error('Failed to load age group data:', error);
    } finally {
      setAgeGroupLoading(false);
    }
  };

  const saveAgeGroupData = async (ageGroupId: string) => {
    if (!user?.userId) {
      console.error('User not authenticated');
      return false;
    }

    try {
      const result = await saveUserAgeGroup(user.userId, ageGroupId);
      if (result.userAgeGroup) {
        // Find the age group object to get the ageRange
        const selectedAgeGroup = allAgeGroups.find(ag => ag.id === ageGroupId);
        if (selectedAgeGroup) {
          setAgeGroup(selectedAgeGroup.ageRange);
          setAgeGroupId(ageGroupId);
        }
        
        // Show success message
        try {
          const { openSuccessWithDuration } = useUIStore.getState();
          openSuccessWithDuration(result.message || 'Age group saved successfully', 4000);
        } catch {}
        
        return true;
      } else {
        console.error('Failed to save age group:', result.error?.message);
        return false;
      }
    } catch (error) {
      console.error('Error saving age group:', error);
      return false;
    }
  };

  const clearAgeGroupData = async (): Promise<boolean> => {
    if (!user?.userId) {
      console.error('User not authenticated');
      return false;
    }

    try {
      const result = await removeUserAgeGroup(user.userId);
      if (result.success) {
        setAgeGroup(null);
        setAgeGroupId(null);
        return true;
      } else {
        console.error('Failed to clear age group:', result.error?.message);
        return false;
      }
    } catch (error) {
      console.error('Error clearing age group:', error);
      return false;
    }
  };

  const loadAllFitAttributes = async () => {
    setFitAttributesLoading(true);
    setFitAttributesError(null);
    try {
      const result = await fetchAllFitAttributes();
      
      if (result.fitAttributes) {
        setAllFitAttributes(result.fitAttributes);
      } else {
        setFitAttributesError(result.error?.message || 'Failed to load fit attributes');
      }
    } catch (error) {
      console.error('Failed to load fit attributes:', error);
      setFitAttributesError('Failed to load fit attributes');
    } finally {
      setFitAttributesLoading(false);
    }
  };

  const loadUserFitAttributes = async () => {
    if (!user?.userId) return;
    
    try {
      const result = await fetchUserFitAttributes(user.userId);
      if (result.userFitAttributes) {
        setUserFitAttributes(result.userFitAttributes);
        setFitAttributesLastUpdated(result.lastUpdated || null);
      } else {
        setUserFitAttributes([]);
        setFitAttributesLastUpdated(null);
      }
    } catch (error) {
      console.error('Failed to load user fit attributes:', error);
    }
  };

  const saveFitAttributesData = async (attributes: Array<{ fitAttributeId: string; value: string }>) => {
    if (!user?.userId) {
      console.error('User not authenticated');
      return false;
    }

    try {
      const result = await batchSaveFitAttributes(user.userId, attributes);
      if (result.success) {
        // Reload user fit attributes to get updated data
        await loadUserFitAttributes();
        
        // Show success message
        try {
          const { openSuccessWithDuration } = useUIStore.getState();
          openSuccessWithDuration(result.message || 'Fit attributes saved successfully', 4000);
        } catch {}
        
        return true;
      } else {
        console.error('Failed to save fit attributes:', result.error?.message);
        return false;
      }
    } catch (error) {
      console.error('Error saving fit attributes:', error);
      return false;
    }
  };

  const clearFitAttributesData = async (): Promise<boolean> => {
    if (!user?.userId) {
      console.error('User not authenticated');
      return false;
    }

    try {
      const { removeAllFitAttributes } = await import('../api/fitAttributes');
      const result = await removeAllFitAttributes(user.userId);
      if (result.success) {
        setUserFitAttributes([]);
        setFitAttributesLastUpdated(null);
        return true;
      } else {
        console.error('Failed to clear fit attributes:', result.error?.message);
        return false;
      }
    } catch (error) {
      console.error('Error clearing fit attributes:', error);
      return false;
    }
  };

  return (
    <main className="app-main" id="profile-page" data-testid="profile-page">
      <section className="container p-6">
        <header id="profile-header" data-testid="profile-header" style={{display:'flex', alignItems:'center', gap:16, marginBottom:16}}>
          <div id="profile-avatar" data-testid="profile-avatar" style={{width:64, height:64, borderRadius:'50%', background:'var(--color-border)'}} aria-hidden="true" />
          <div>
            <h1 id="profile-name" data-testid="profile-name" style={{margin:0}}>{profileName}</h1>
            {profileEmail && (
              <div id="profile-email" data-testid="profile-email" style={{opacity:0.8, marginTop:4}}>{profileEmail}</div>
            )}
          </div>
        </header>

        <div className="card p-0" role="region" aria-label="Profile preferences" id="profile-preferences" data-testid="profile-preferences">
          <div style={{borderBottom:'1px solid var(--color-border)', padding:16, display:'flex', alignItems:'center', gap:12}}>
            <button id="profile-tab-clothing" data-testid="profile-tab-clothing" className="btn btn-ghost" aria-current="page">Clothing and Shoes</button>
            <div id="profile-tab-subtitle" data-testid="profile-tab-subtitle" className="surface" style={{padding:'6px 12px', borderRadius:'var(--radius-sm)', border:'1px solid var(--color-border)'}}>Size, fit and price</div>
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
              <AgeGroupRow
                value={ageGroup}
                onAdd={() => setAgeGroupModalOpen(true)}
                onUpdate={() => setAgeGroupModalOpen(true)}
                onClear={() => setAgeGroupClearOpen(true)}
                loading={ageGroupLoading}
              />
            </section>

            <section aria-label="Department preferences" id="dept-preferences-section" data-testid="dept-preferences-section" style={{marginTop:12}}>
              <h2 id="dept-preferences-title" data-testid="dept-preferences-title" style={{fontSize:16, fontWeight:700}}>Department preferences</h2>
              <p id="dept-preferences-subtitle" data-testid="dept-preferences-subtitle" style={{marginTop:4, opacity:0.85}}>Share preferences for each department to get improved recommendations when you shop there.</p>

              <div style={{marginTop:12}}>
                <FitAttributesRow 
                  category="womens"
                  fitAttributes={allFitAttributes}
                  userFitAttributes={userFitAttributes}
                  lastUpdated={fitAttributesLastUpdated}
                  loading={fitAttributesLoading}
                  onAdd={() => { setFitAttributesModalCategory('womens'); setFitAttributesModalOpen(true); }}
                  onUpdate={() => { setFitAttributesModalCategory('womens'); setFitAttributesModalOpen(true); }}
                  onClear={() => setFitAttributesClearOpen(true)}
                />
                <PreferenceRow label="Shoes" />
              </div>
            </section>

            <section aria-label="Interests" id="interests-section" data-testid="interests-section" style={{marginTop:12}}>
              <h2 id="interests-title" data-testid="interests-title" style={{fontSize:16, fontWeight:700}}>Interests</h2>
              <div id="interests-tags" data-testid="interests-tags" style={{display:'flex', flexWrap:'wrap', gap:8, marginTop:8}}>
                {['Skin Care','Storage & Organization','Interior Design','Dorm Essentials','Hair Care and Styling','Babies and Toddlers','Baking','Women\'s Attire','Men\'s Attire','Party Planning'].map(tag => (
                  <button key={tag} id={`interest-${tag.toLowerCase().replace(/[\s&']/g, '-')}`} data-testid={`interest-${tag.toLowerCase().replace(/[\s&']/g, '-')}`} className="btn" aria-label={`Add interest ${tag}`}>+ {tag}</button>
                ))}
              </div>
              <div style={{marginTop:16}}>
                <button id="interests-save" data-testid="interests-save" className="btn btn-primary">Save</button>
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

      {ageGroupModalOpen && (
        <AgeGroupModal
          open={ageGroupModalOpen}
          onClose={() => setAgeGroupModalOpen(false)}
          onSave={async (selectedAgeGroupId) => {
            const success = await saveAgeGroupData(selectedAgeGroupId);
            if (success) {
              setAgeGroupModalOpen(false);
            }
          }}
          currentAgeGroupId={ageGroupId}
          ageGroups={allAgeGroups}
          loading={ageGroupsLoading}
          error={ageGroupsError}
        />
      )}

      {ageGroupClearOpen && (
        <ConfirmClearAgeGroupModal
          onCancel={() => setAgeGroupClearOpen(false)}
          onConfirm={async () => {
            const ok = await clearAgeGroupData();
            if (ok) {
              try {
                const { openSuccessWithDuration } = useUIStore.getState();
                openSuccessWithDuration('Age group has been removed successfully', 4000);
              } catch {}
            }
            setAgeGroupClearOpen(false);
          }}
        />
      )}

      {fitAttributesModalOpen && (
        <FitAttributesModal
          open={fitAttributesModalOpen}
          onClose={() => setFitAttributesModalOpen(false)}
          onSave={saveFitAttributesData}
          category={fitAttributesModalCategory}
          fitAttributes={allFitAttributes}
          currentValues={userFitAttributes.filter(ua => {
            const attr = allFitAttributes.find(a => a.id === ua.fitAttributeId);
            return attr?.category === fitAttributesModalCategory;
          })}
          loading={fitAttributesLoading}
          error={fitAttributesError}
        />
      )}

      {fitAttributesClearOpen && (
        <ConfirmClearFitAttributesModal
          onCancel={() => setFitAttributesClearOpen(false)}
          onConfirm={async () => {
            const ok = await clearFitAttributesData();
            if (ok) {
              try {
                const { openSuccessWithDuration } = useUIStore.getState();
                openSuccessWithDuration('Fit attributes have been removed successfully', 4000);
              } catch {}
            }
            setFitAttributesClearOpen(false);
          }}
        />
      )}
    </main>
  )
}

type FitAttributesRowProps = {
  category: 'mens' | 'womens';
  fitAttributes: FitAttribute[];
  userFitAttributes: UserFitAttribute[];
  lastUpdated?: string | null;
  loading?: boolean;
  onAdd: () => void;
  onUpdate: () => void;
  onClear: () => void;
}

function FitAttributesRow({ 
  category, 
  fitAttributes, 
  userFitAttributes,
  lastUpdated = null,
  loading = false, 
  onAdd, 
  onUpdate,
  onClear 
}: FitAttributesRowProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  // Filter user attributes for the current category
  const userCategoryAttributes = userFitAttributes.filter(ua => {
    const attr = fitAttributes.find(a => a.id === ua.fitAttributeId);
    return attr?.category === category;
  });

  // Check if user has any fit attributes for this category
  const hasAttributes = userCategoryAttributes.length > 0;

  // Get display text for attributes
  const getDisplayText = () => {
    if (!hasAttributes) return '--';
    
    // Sort by display order
    const sortedUserAttrs = [...userCategoryAttributes].sort((a, b) => {
      const attrA = fitAttributes.find(fa => fa.id === a.fitAttributeId);
      const attrB = fitAttributes.find(fa => fa.id === b.fitAttributeId);
      return (attrA?.displayOrder || 0) - (attrB?.displayOrder || 0);
    });

    // Show all attributes in collapsed view with ellipsis if needed
    const text = sortedUserAttrs.map(ua => {
      const attr = fitAttributes.find(fa => fa.id === ua.fitAttributeId);
      return `${attr?.name}: ${ua.value}`;
    }).join(', ');
    
    // Truncate if too long
    if (text.length > 80) {
      return text.substring(0, 77) + '...';
    }
    return text;
  };

  // Format last updated date
  const formatLastUpdated = () => {
    if (!lastUpdated) return '';
    
    try {
      const date = new Date(lastUpdated);
      const month = date.toLocaleDateString('en-US', { month: 'short' });
      const day = date.getDate();
      const year = date.getFullYear();
      return `Last updated on ${month} ${day}, ${year}`;
    } catch (e) {
      return '';
    }
  };

  return (
    <div id="fit-attributes-row" data-testid="fit-attributes-row" style={{borderBottom:'1px solid var(--color-border)'}}>
      <div
        style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center', padding:'12px 0'}}
      >
        <div id="fit-attributes-label" data-testid="fit-attributes-label" style={{fontWeight:600, color: 'var(--color-text)'}}>Fit attributes</div>
        <div id="fit-attributes-value" data-testid="fit-attributes-value" style={{opacity: hasAttributes ? 1 : 0.7, color: 'var(--color-text)', fontSize: '14px'}}>
          {loading ? (
            <LoadingSpinner size="small" text="Loading..." />
          ) : getDisplayText()}
        </div>
        <button
          id="fit-attributes-toggle"
          data-testid="fit-attributes-toggle"
          className="btn"
          aria-expanded={expanded}
          aria-controls="fit-attributes-panel"
          onClick={() => setExpanded(v => !v)}
          style={{ color: 'var(--color-text)' }}
          disabled={loading}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div id="fit-attributes-panel" data-testid="fit-attributes-panel" style={{padding:'0 0 12px 0', display: 'flex', flexDirection: 'column', gap: 8}}>
          {!hasAttributes ? (
            <button
              id="fit-attributes-add"
              data-testid="fit-attributes-add"
              className="btn"
              style={{borderRadius:'var(--radius-full)', alignSelf: 'flex-start'}}
              onClick={onAdd}
              aria-label="Add fit attributes"
            >
              + Add
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {/* Display all attributes */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {userCategoryAttributes
                  .sort((a, b) => {
                    const attrA = fitAttributes.find(fa => fa.id === a.fitAttributeId);
                    const attrB = fitAttributes.find(fa => fa.id === b.fitAttributeId);
                    return (attrA?.displayOrder || 0) - (attrB?.displayOrder || 0);
                  })
                  .map(ua => {
                    const attr = fitAttributes.find(fa => fa.id === ua.fitAttributeId);
                    return (
                      <div key={ua.id} style={{ display: 'grid', gridTemplateColumns: '140px 1fr', gap: 8, fontSize: 14 }}>
                        <span style={{ fontWeight: 600, color: 'var(--color-text)' }}>{attr?.name}:</span>
                        <span style={{ color: 'var(--color-text)' }}>{ua.value}</span>
                      </div>
                    );
                  })}
              </div>
              
              {/* Edit and Clear buttons */}
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <button
                  id="fit-attributes-edit"
                  data-testid="fit-attributes-edit"
                  className="btn btn-primary"
                  style={{ borderRadius: 'var(--radius-full)', height: 32, padding: '0 16px', fontSize: 14 }}
                  onClick={onUpdate}
                  aria-label="Edit fit attributes"
                >
                  Edit
                </button>
                <button
                  id="fit-attributes-clear"
                  data-testid="fit-attributes-clear"
                  className="btn"
                  style={{ borderRadius: 'var(--radius-full)', height: 32, padding: '0 16px', fontSize: 14 }}
                  onClick={onClear}
                  aria-label="Clear fit attributes"
                >
                  Clear
                </button>
                {lastUpdated && (
                  <span style={{ fontSize: 14, color: 'var(--color-text)', opacity: 0.7, marginLeft: 8 }}>
                    {formatLastUpdated()}
                  </span>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
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
    <div id="height-weight-row" data-testid="height-weight-row" style={{borderBottom:'1px solid var(--color-border)'}}>
      <div
        style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center', padding:'12px 0'}}
      >
        <div id="height-weight-label" data-testid="height-weight-label" style={{fontWeight:600, color: 'var(--color-text)'}}>Height and weight</div>
        <div id="height-weight-value" data-testid="height-weight-value" style={{opacity: value ? 1 : 0.7, color: 'var(--color-text)'}}>
          {loading ? (
            <LoadingSpinner size="small" text="Loading..." />
          ) : value ? `${value.height} | ${value.weight}` : '--'}
        </div>
        <button
          id="height-weight-toggle"
          data-testid="height-weight-toggle"
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
        <div id="height-weight-panel" data-testid="height-weight-panel" style={{padding:'0 0 12px 0', display: 'flex', flexDirection: 'column', gap: 8}}>
          {!value ? (
            <button
              id="height-weight-add"
              data-testid="height-weight-add"
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
                <span id="height-weight-display" data-testid="height-weight-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
                  {value.height} | {value.weight}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="height-weight-update"
                  data-testid="height-weight-update"
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

type AgeGroupRowProps = {
  value: string | null;
  onAdd: () => void;
  onUpdate: () => void;
  onClear: () => void;
  loading?: boolean;
}

function AgeGroupRow({ value, onAdd, onUpdate, onClear, loading = false }: AgeGroupRowProps) {
  const [expanded, setExpanded] = useState<boolean>(false);
  
  return (
    <div id="age-group-row" data-testid="age-group-row" style={{borderBottom:'1px solid var(--color-border)'}}>
      <div
        style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center', padding:'12px 0'}}
      >
        <div id="age-group-label" data-testid="age-group-label" style={{fontWeight:600, color: 'var(--color-text)'}}>Age group</div>
        <div id="age-group-value" data-testid="age-group-value" style={{opacity: value ? 1 : 0.7, color: 'var(--color-text)'}}>
          {loading ? (
            <LoadingSpinner size="small" text="Loading..." />
          ) : value || '--'}
        </div>
        <button
          id="age-group-toggle"
          data-testid="age-group-toggle"
          className="btn"
          aria-expanded={expanded}
          aria-controls="age-group-panel"
          onClick={() => setExpanded(v => !v)}
          style={{ color: 'var(--color-text)' }}
          disabled={loading}
        >
          {expanded ? '▴' : '▾'}
        </button>
      </div>

      {expanded && (
        <div id="age-group-panel" data-testid="age-group-panel" style={{padding:'0 0 12px 0', display: 'flex', flexDirection: 'column', gap: 8}}>
          {!value ? (
            <button
              id="age-group-add"
              data-testid="age-group-add"
              className="btn"
              style={{borderRadius:'var(--radius-full)', alignSelf: 'flex-start'}}
              onClick={onAdd}
              aria-label="Add age group"
            >
              + Add
            </button>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <span id="age-group-display" data-testid="age-group-display" style={{ fontSize: 22, fontWeight: 800, color: 'var(--color-text)' }}>
                  {value}
                </span>
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  id="age-group-update"
                  data-testid="age-group-update"
                  className="btn btn-primary"
                  style={{ borderRadius: 'var(--radius-full)', height: 32, padding: '0 12px', fontSize: 14 }}
                  onClick={onUpdate}
                  aria-label="Update age group"
                >
                  Update
                </button>
                <button
                  id="age-group-clear"
                  data-testid="age-group-clear"
                  className="btn"
                  style={{ borderRadius: 'var(--radius-full)', height: 32, padding: '0 12px', fontSize: 14 }}
                  onClick={onClear}
                  aria-label="Clear age group"
                >
                  Clear
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
        onChange(result.department.department ?? opt.label)
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
    <div id="pref-dept-row" data-testid="pref-dept-row" style={{borderBottom:'1px solid var(--color-border)'}}>
      <div
        style={{display:'grid', gridTemplateColumns:'240px 1fr auto', gap:12, alignItems:'center', padding:'12px 0'}}
      >
        <div id="pref-dept-label" data-testid="pref-dept-label" style={{fontWeight:600}}>Preferred department</div>
        <div id="pref-dept-value" data-testid="pref-dept-value" style={{opacity: value ? 1 : 0.7}}>
          {loading ? (
            <LoadingSpinner size="small" text="Loading..." />
          ) : value ?? '--'}
        </div>
        <button
          id="pref-dept-toggle"
          data-testid="pref-dept-toggle"
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
        <div id="pref-dept-panel" data-testid="pref-dept-panel" style={{padding:'0 0 12px 0'}}>
          <div>
            {!value ? (
              <div style={{display:'flex', gap:8, alignItems:'center'}}>
                <button
                  id="pref-dept-add"
                  data-testid="pref-dept-add"
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
                <div id="pref-dept-display" data-testid="pref-dept-display" style={{fontSize:22, fontWeight:800, marginBottom:8}}>{value}</div>
                <div style={{display:'flex', gap:8, alignItems:'center'}}>
                  <button
                    id="pref-dept-update"
                    data-testid="pref-dept-update"
                    className="btn btn-primary"
                    style={{borderRadius:9999, height:32, padding:'0 12px', fontSize:14}}
                    onClick={openPickerAndLoad}
                    aria-label="Update preferred department"
                  >
                    Update
                  </button>
                  <button
                    id="pref-dept-clear"
                    data-testid="pref-dept-clear"
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
            await savePreferred(opt)
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
    <div role="dialog" aria-modal="true" aria-label="Preferred Department" id="dept-picker-modal" data-testid="dept-picker-modal" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:60}}>
      <div className="card" data-testid="dept-picker-modal-content" style={{background:'#fff', color:'#000', padding:0, minWidth:520, position:'relative', borderRadius:16, boxShadow:'0 10px 24px rgba(0,0,0,0.45)'}}>
        <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'16px 20px', background:'#f3f4f6', borderTopLeftRadius:16, borderTopRightRadius:16, borderBottom:'1px solid #e5e7eb'}}>
          <h3 id="dept-picker-title" data-testid="dept-picker-title" style={{margin:0, fontWeight:800, color:'#000'}}>Preferred department</h3>
          <button
            id="dept-picker-close"
            data-testid="dept-picker-close"
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
            <div id="dept-picker-loading" data-testid="dept-picker-loading">Loading…</div>
          ) : error ? (
            <div id="dept-picker-error" data-testid="dept-picker-error" style={{color:'#b91c1c'}}>Failed to load options</div>
          ) : (
            <div id="dept-picker-options" data-testid="dept-picker-options" style={{display:'flex', gap:12, flexWrap:'wrap'}}>
              {(options ?? []).map((opt) => {
                const isSelected = choice?.id === opt.id
                return (
                  <button
                    key={opt.id}
                    id={`dept-option-${opt.id}`}
                    data-testid={`dept-option-${opt.id}`}
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
              id="dept-picker-save"
              data-testid="dept-picker-save"
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
    <div role="dialog" aria-modal="true" aria-label="Confirm clear" id="confirm-clear-modal" data-testid="confirm-clear-modal" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70}}>
      <div className="card" data-testid="confirm-clear-modal-content" style={{background:'#fff', color:'#000', padding:20, minWidth:420, position:'relative', borderRadius:16}}>
        <h3 id="confirm-clear-title" data-testid="confirm-clear-title" style={{margin:'0 0 8px 0', fontWeight:800, color:'#000'}}>Are you sure want to clear?</h3>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:16}}>
          <button id="confirm-clear-no" data-testid="confirm-clear-no" className="btn" onClick={onCancel} style={{borderRadius:9999, height:36, padding:'0 14px'}}>No</button>
          <button id="confirm-clear-yes" data-testid="confirm-clear-yes" className="btn btn-primary" onClick={onConfirm} style={{borderRadius:9999, height:36, padding:'0 14px'}}>Yes</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmClearAgeGroupModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm clear age group" id="confirm-clear-age-group-modal" data-testid="confirm-clear-age-group-modal" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70}}>
      <div className="card" data-testid="confirm-clear-age-group-content" style={{background:'var(--color-card)', color:'var(--color-text)', padding:20, minWidth:420, position:'relative', borderRadius:16, boxShadow:'var(--elev-3)'}}>
        <h3 id="confirm-clear-age-group-title" data-testid="confirm-clear-age-group-title" style={{margin:'0 0 8px 0', fontWeight:800, color:'var(--color-text)'}}>Are you sure want to clear?</h3>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:16}}>
          <button id="confirm-clear-age-group-no" data-testid="confirm-clear-age-group-no" className="btn" onClick={onCancel} style={{borderRadius:'var(--radius-full)', height:36, padding:'0 14px'}}>No</button>
          <button id="confirm-clear-age-group-yes" data-testid="confirm-clear-age-group-yes" className="btn btn-primary" onClick={onConfirm} style={{borderRadius:'var(--radius-full)', height:36, padding:'0 14px'}}>Yes</button>
        </div>
      </div>
    </div>
  )
}

function ConfirmClearFitAttributesModal({ onCancel, onConfirm }: { onCancel: () => void; onConfirm: () => void }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="Confirm clear fit attributes" id="confirm-clear-fit-attributes-modal" data-testid="confirm-clear-fit-attributes-modal" style={{position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:70}}>
      <div className="card" data-testid="confirm-clear-fit-attributes-content" style={{background:'var(--color-card)', color:'var(--color-text)', padding:20, minWidth:420, position:'relative', borderRadius:16, boxShadow:'var(--elev-3)'}}>
        <h3 id="confirm-clear-fit-attributes-title" data-testid="confirm-clear-fit-attributes-title" style={{margin:'0 0 8px 0', fontWeight:800, color:'var(--color-text)'}}>Are you sure want to clear?</h3>
        <div style={{display:'flex', justifyContent:'flex-end', gap:8, marginTop:16}}>
          <button id="confirm-clear-fit-attributes-no" data-testid="confirm-clear-fit-attributes-no" className="btn" onClick={onCancel} style={{borderRadius:'var(--radius-full)', height:36, padding:'0 14px'}}>No</button>
          <button id="confirm-clear-fit-attributes-yes" data-testid="confirm-clear-fit-attributes-yes" className="btn btn-primary" onClick={onConfirm} style={{borderRadius:'var(--radius-full)', height:36, padding:'0 14px'}}>Yes</button>
        </div>
      </div>
    </div>
  )
}


