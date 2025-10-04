import { useEffect, useMemo, useState } from 'react'
import type { ShoeWidth, ShoeSizeValue } from '../api/shoeSize'
import LoadingSpinner from './LoadingSpinner'

export type ShoeSelection = { size: ShoeSizeValue; width: ShoeWidth }

type ShoesModalProps = {
  open: boolean
  onClose: () => void
  onSave: (selection: ShoeSelection) => void
  initialValue?: ShoeSelection | null
  shoeSizes: ShoeSizeValue[]
  widths: ShoeWidth[]
  loading?: boolean
  error?: string | null
}

export default function ShoesModal({ open, onClose, onSave, initialValue = null, shoeSizes = [], widths = [], loading = false, error = null }: ShoesModalProps) {
  const [selectedSize, setSelectedSize] = useState<ShoeSizeValue | null>(null)
  const [selectedWidth, setSelectedWidth] = useState<ShoeWidth | null>(null)

  useEffect(() => {
    if (open) {
      const normalizedInitialSize = initialValue?.size ?? null
      const availableWidths = widths.length > 0 ? widths : []
      const initialWidth = initialValue?.width && availableWidths.includes(initialValue.width)
        ? initialValue.width
        : availableWidths[0] ?? null
      setSelectedSize(normalizedInitialSize)
      setSelectedWidth(initialWidth)
    }
  }, [open, initialValue, widths])

  useEffect(() => {
    if (!open) return
    if (selectedWidth && widths.includes(selectedWidth)) {
      return
    }
    const fallbackWidth = initialValue?.width && widths.includes(initialValue.width)
      ? initialValue.width
      : widths[0] ?? null
    setSelectedWidth(fallbackWidth)
  }, [open, widths, selectedWidth, initialValue?.width])

  const normalizedSizes = useMemo(() => {
    if (!Array.isArray(shoeSizes)) return []
    return [...shoeSizes]
      .map(size => size)
      .sort((a, b) => {
        const aNum = Number(a)
        const bNum = Number(b)
        const aIsNumber = !Number.isNaN(aNum)
        const bIsNumber = !Number.isNaN(bNum)
        if (aIsNumber && bIsNumber) {
          return aNum - bNum
        }
        if (aIsNumber) return -1
        if (bIsNumber) return 1
        return a.localeCompare(b)
      })
  }, [shoeSizes])

  const canSave = useMemo(() => {
    if (!selectedWidth || !selectedSize) return false
    if (!initialValue) return true
    return selectedWidth !== initialValue.width || selectedSize !== initialValue.size
  }, [selectedSize, selectedWidth, initialValue])

  if (!open) return null

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label="Shoes"
      id="shoes-modal"
      data-testid="shoes-modal"
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 70,
        padding: 20
      }}
    >
      <div
        className="card modal-surface"
        data-testid="shoes-modal-content"
        style={{
          background: 'var(--color-card)',
          color: 'var(--color-text)',
          padding: 0,
          minWidth: 640,
          maxWidth: '96vw',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--elev-3)',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
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
          <h3 id="shoes-modal-title" data-testid="shoes-modal-title" style={{ margin: 0, fontSize: 20, fontWeight: 800, color: 'var(--color-text)' }}>
            Shoes
          </h3>
          <button
            id="shoes-modal-close"
            data-testid="shoes-modal-close"
            aria-label="Close"
            onClick={onClose}
            style={{
              width: 40,
              height: 40,
              borderRadius: 12,
              border: '1px solid var(--color-border)',
              background: 'var(--color-card)',
              color: 'var(--color-text)',
              fontSize: 18,
              lineHeight: 1,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            ×
          </button>
        </div>

        <div style={{ padding: '20px 28px 16px', display: 'flex', flexDirection: 'column', gap: 20, background: 'var(--color-card)' }}>
          {loading ? (
            <div id="shoe-size-loading" data-testid="shoe-size-loading" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
              <LoadingSpinner size="medium" text="Loading shoe sizes..." />
            </div>
          ) : error ? (
            <div id="shoe-size-error" data-testid="shoe-size-error" style={{ 
              backgroundColor: 'var(--color-danger-container)', 
              color: 'var(--color-danger)', 
              padding: '10px', 
              borderRadius: 'var(--radius-md)', 
              marginBottom: '16px' 
            }}>
              {error}
            </div>
          ) : shoeSizes.length === 0 ? (
            <div style={{ 
              padding: '20px', 
              textAlign: 'center', 
              color: 'var(--color-text)', 
              opacity: 0.7 
            }}>
              No shoe sizes available. Please try again later.
            </div>
          ) : (
            <>
              <section aria-labelledby="shoe-size-label" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <h4 id="shoe-size-label" style={{ margin: 0, fontSize: 18, fontWeight: 800, color: 'var(--color-text)' }}>
                  What size shoe do you typically wear?
                </h4>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                      Size
                    </h5>
                    {normalizedSizes.length > 0 ? (
                      <div
                        id="shoe-size-options"
                        data-testid="shoe-size-options"
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(auto-fit, minmax(72px, 1fr))',
                          gap: 12
                        }}
                      >
                        {normalizedSizes.map((size: ShoeSizeValue) => {
                          const isSelected = size === selectedSize
                          const normalizedTestId = size.split('.').join('_')
                          return (
                            <button
                              key={`shoe-size-${size}`}
                              id={`shoe-size-${normalizedTestId}`}
                              data-testid={`shoe-size-${normalizedTestId}`}
                              onClick={() => setSelectedSize(size)}
                              style={{
                                borderRadius: 'var(--radius-md)',
                                padding: '12px 0',
                                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-outline)'}`,
                                background: isSelected ? 'var(--color-primary)' : 'var(--color-primary-container)',
                                color: isSelected ? 'var(--color-on-primary)' : 'var(--color-muted)',
                                fontWeight: 700,
                                fontSize: 16,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              aria-pressed={isSelected}
                            >
                              {size}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '12px 16px', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--color-border)', 
                        color: 'var(--color-text)', 
                        opacity: 0.7 
                      }}>
                        Shoe sizes are not available right now.
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    <h5 style={{ margin: 0, fontSize: 16, fontWeight: 700, color: 'var(--color-text)' }}>
                      Width
                    </h5>
                    {widths.length > 0 ? (
                      <div
                        id="shoe-width-options"
                        data-testid="shoe-width-options"
                        style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}
                      >
                        {widths.map((width: ShoeWidth) => {
                          const isSelected = width === selectedWidth
                          return (
                            <button
                              key={width}
                              id={`shoe-width-${width.toLowerCase()}`}
                              data-testid={`shoe-width-${width.toLowerCase()}`}
                              onClick={() => setSelectedWidth(width)}
                              style={{
                                borderRadius: 'var(--radius-full)',
                                padding: '10px 20px',
                                border: `1px solid ${isSelected ? 'var(--color-primary)' : 'var(--color-outline)'}`,
                                background: isSelected ? 'var(--color-primary)' : 'var(--color-primary-container)',
                                color: isSelected ? 'var(--color-on-primary)' : 'var(--color-muted)',
                                fontWeight: 700,
                                fontSize: 14,
                                cursor: 'pointer',
                                transition: 'all 0.2s ease'
                              }}
                              aria-pressed={isSelected}
                            >
                              {width}
                            </button>
                          )
                        })}
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '12px 16px', 
                        borderRadius: 'var(--radius-md)', 
                        border: '1px solid var(--color-border)', 
                        color: 'var(--color-text)', 
                        opacity: 0.7 
                      }}>
                        Width options are not available right now.
                      </div>
                    )}
                  </div>
                </div>
              </section>

              {selectedSize && selectedWidth && (
                <div style={{ 
                  padding: '12px 16px', 
                  background: 'var(--color-surface)', 
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--color-border)'
                }}>
                  <strong>Selected:</strong> Size {selectedSize} ({selectedWidth})
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  id="shoes-save"
                  data-testid="shoes-save"
                  onClick={() => {
                    if (canSave && selectedSize && selectedWidth) {
                      onSave({ size: selectedSize, width: selectedWidth })
                    }
                  }}
                  disabled={!canSave}
                  className="btn btn-primary"
                  style={{
                    borderRadius: 'var(--radius-full)',
                    padding: '10px 28px',
                    cursor: canSave ? 'pointer' : 'not-allowed',
                    opacity: canSave ? 1 : 0.6
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
  )
}
