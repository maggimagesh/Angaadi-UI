import { useState, useEffect } from 'react'
import { BaseModal } from './BaseModal'
import { useUIStore } from '../store/ui'
import { forgotPassword, verifyOTP, resetPassword } from '../api/user'
import { isStrongPassword } from '../utils/password'
import LoadingSpinner from './LoadingSpinner'

export default function ForgotPasswordModal() {
  const {
    forgotPasswordOpen,
    forgotPasswordStep,
    forgotPasswordEmail,
    forgotPasswordResetToken,
    closeForgotPassword,
    setForgotPasswordStep,
    setForgotPasswordEmail,
    setForgotPasswordResetToken,
    openSuccess
  } = useUIStore()

  const [email, setEmail] = useState('')
  const [otp, setOtp] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPasswords, setShowPasswords] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [otpTimer, setOtpTimer] = useState(0)

  // Reset form when modal opens/closes
  useEffect(() => {
    if (forgotPasswordOpen) {
      setEmail('')
      setOtp('')
      setNewPassword('')
      setConfirmPassword('')
      setShowPasswords(false)
      setError(null)
      setOtpTimer(0)
    }
  }, [forgotPasswordOpen])

  // OTP timer countdown
  useEffect(() => {
    if (otpTimer > 0) {
      const timer = setTimeout(() => setOtpTimer(otpTimer - 1), 1000)
      return () => clearTimeout(timer)
    }
  }, [otpTimer])

  // Auto-dismiss error messages after 5 seconds
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000)
      return () => clearTimeout(timer)
    }
  }, [error])

  const handleEmailSubmit = async () => {
    if (!email.trim()) {
      setError('Please enter your email address')
      return
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await forgotPassword({ email })
      if (result.error) {
        setError(result.error.message)
        return
      }

      setForgotPasswordEmail(email)
      setForgotPasswordStep('otp')
      setOtpTimer(30) // 30 seconds for resend
      openSuccess('OTP sent to your email')
    } catch (err) {
      setError('Failed to send OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleOTPSubmit = async () => {
    console.log('OTP Submit clicked', { otp, email: forgotPasswordEmail })
    
    if (!otp.trim()) {
      setError('Please enter the OTP')
      return
    }

    if (!/^\d{6}$/.test(otp)) {
      setError('Please enter a valid 6-digit OTP')
      return
    }

    if (!forgotPasswordEmail) {
      setError('Email not found. Please start over.')
      return
    }

    setIsLoading(true)
    setError(null)
    console.log('Calling verifyOTP API...')

    try {
      const result = await verifyOTP({ email: forgotPasswordEmail, otp })
      console.log('verifyOTP response:', result)
      
      if (result.error) {
        console.error('OTP verification error:', result.error)
        setError(result.error.message || 'Invalid OTP. Please try again.')
        setIsLoading(false)
        return
      }

      if (result.resetToken) {
        console.log('OTP verified successfully, resetToken received')
        setForgotPasswordResetToken(result.resetToken)
        setForgotPasswordStep('password')
        openSuccess('OTP verified successfully')
        setIsLoading(false)
      } else {
        console.error('No resetToken in response:', result)
        setError('OTP verification failed. Please try again.')
        setIsLoading(false)
      }
    } catch (err) {
      console.error('Exception during OTP verification:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to verify OTP. Please try again.'
      setError(errorMessage)
      setIsLoading(false)
    }
  }

  const handlePasswordSubmit = async () => {
    if (!newPassword.trim()) {
      setError('Please enter a new password')
      return
    }

    if (!confirmPassword.trim()) {
      setError('Please confirm your password')
      return
    }

    if (!isStrongPassword(newPassword)) {
      setError('Password is too weak. Please use at least 8 characters with uppercase, lowercase, number, and special character.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (!forgotPasswordResetToken) {
      setError('Reset token not found. Please start over.')
      return
    }

    setIsLoading(true)
    setError(null)

    try {
      const result = await resetPassword({ 
        resetToken: forgotPasswordResetToken, 
        newPassword, 
        confirmPassword 
      })
      if (result.error) {
        setError(result.error.message)
        return
      }

      setForgotPasswordStep('success')
      openSuccess('Password reset successfully')
    } catch (err) {
      setError('Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResendOTP = async () => {
    if (!forgotPasswordEmail) return

    setIsLoading(true)
    setError(null)

    try {
      const result = await forgotPassword({ email: forgotPasswordEmail })
      if (result.error) {
        setError(result.error.message)
        return
      }

      setOtpTimer(30) // Reset timer to 30 seconds
      openSuccess('OTP resent to your email')
    } catch (err) {
      setError('Failed to resend OTP. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const handleBack = () => {
    if (forgotPasswordStep === 'otp') {
      setForgotPasswordStep('email')
    } else if (forgotPasswordStep === 'password') {
      setForgotPasswordStep('otp')
    }
    setError(null)
  }

  const handleClose = () => {
    closeForgotPassword()
  }

  const getTitle = () => {
    switch (forgotPasswordStep) {
      case 'email': return 'Forgot Password'
      case 'otp': return 'Enter OTP'
      case 'password': return 'Create New Password'
      case 'success': return 'Password Reset Complete'
      default: return 'Forgot Password'
    }
  }

  const renderEmailStep = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <p style={{ color: 'var(--color-muted)', margin: 0 }}>
        Enter your email address and we'll send you a verification code to reset your password.
      </p>
      
      <div>
        <label className="label" htmlFor="forgot-email">Email Address</label>
        <input
          id="forgot-email"
          data-testid="forgot-email"
          className="input"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
          autoFocus
        />
      </div>

      {error && (
        <div role="alert" style={{ 
          color: 'var(--color-danger)', 
          wordBreak: 'break-word', 
          overflowWrap: 'break-word',
          whiteSpace: 'normal', 
          maxWidth: '100%',
          width: '100%',
          display: 'block'
        }}>
          {error}
        </div>
      )}

      <button
        className="btn btn-primary"
        onClick={handleEmailSubmit}
        disabled={isLoading}
        data-testid="send-otp-btn"
      >
        {isLoading ? <LoadingSpinner size="small" text="Sending..." /> : 'Send OTP'}
      </button>
    </div>
  )

  const renderOTPStep = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <p style={{ color: 'var(--color-muted)', margin: 0 }}>
        We've sent a 6-digit verification code to <strong>{forgotPasswordEmail}</strong>
      </p>
      
      <div>
        <label className="label" htmlFor="forgot-otp">Verification Code</label>
        <input
          id="forgot-otp"
          data-testid="forgot-otp"
          className="input"
          type="text"
          placeholder="123456"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
          onKeyDown={(e) => e.key === 'Enter' && handleOTPSubmit()}
          autoFocus
          maxLength={6}
        />
      </div>

      {otpTimer > 0 && (
        <div style={{ color: 'var(--color-muted)', fontSize: '14px' }}>
          Resend OTP in {otpTimer} seconds
        </div>
      )}

      {error && (
        <div role="alert" style={{ 
          color: 'var(--color-danger)', 
          wordBreak: 'break-word', 
          overflowWrap: 'break-word',
          whiteSpace: 'normal', 
          maxWidth: '100%',
          width: '100%',
          display: 'block'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn"
          onClick={handleBack}
          disabled={isLoading}
          data-testid="back-btn"
        >
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handleOTPSubmit}
          disabled={isLoading}
          data-testid="verify-otp-btn"
        >
          {isLoading ? <LoadingSpinner size="small" text="Verifying..." /> : 'Verify OTP'}
        </button>
      </div>

      {otpTimer === 0 && (
        <button
          className="btn btn-ghost"
          onClick={handleResendOTP}
          disabled={isLoading}
          data-testid="resend-otp-btn"
        >
          Resend OTP
        </button>
      )}
    </div>
  )

  const renderPasswordStep = () => (
    <div style={{ display: 'grid', gap: 16 }}>
      <p style={{ color: 'var(--color-muted)', margin: 0 }}>
        Please create a new password for your account.
      </p>
      
      <div>
        <label className="label" htmlFor="forgot-new-password">New Password</label>
        <input
          id="forgot-new-password"
          data-testid="forgot-new-password"
          className="input"
          type={showPasswords ? 'text' : 'password'}
          placeholder="Create a strong password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          autoFocus
        />
      </div>

      <div>
        <label className="label" htmlFor="forgot-confirm-password">Confirm New Password</label>
        <input
          id="forgot-confirm-password"
          data-testid="forgot-confirm-password"
          className="input"
          type={showPasswords ? 'text' : 'password'}
          placeholder="Confirm your password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handlePasswordSubmit()}
        />
      </div>

      <label style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
        <input
          type="checkbox"
          checked={showPasswords}
          onChange={(e) => setShowPasswords(e.target.checked)}
        />
        <span className="label">Show passwords</span>
      </label>

      {error && (
        <div role="alert" style={{ 
          color: 'var(--color-danger)', 
          wordBreak: 'break-word', 
          overflowWrap: 'break-word',
          whiteSpace: 'normal', 
          maxWidth: '100%',
          width: '100%',
          display: 'block'
        }}>
          {error}
        </div>
      )}

      <div style={{ display: 'flex', gap: 12 }}>
        <button
          className="btn"
          onClick={handleBack}
          disabled={isLoading}
          data-testid="back-btn"
        >
          Back
        </button>
        <button
          className="btn btn-primary"
          onClick={handlePasswordSubmit}
          disabled={isLoading}
          data-testid="reset-password-btn"
        >
          {isLoading ? <LoadingSpinner size="small" text="Resetting..." /> : 'Reset Password'}
        </button>
      </div>
    </div>
  )

  const renderSuccessStep = () => (
    <div style={{ display: 'grid', gap: 16, textAlign: 'center' }}>
      <div style={{ fontSize: '48px', color: 'var(--color-success)' }}>✓</div>
      <h3 style={{ margin: 0, color: 'var(--color-text)' }}>Password Reset Complete!</h3>
      <p style={{ color: 'var(--color-muted)', margin: 0 }}>
        Your password has been successfully reset. You can now sign in with your new password.
      </p>
      
      <button
        className="btn btn-primary"
        onClick={handleClose}
        data-testid="close-success-btn"
      >
        Close
      </button>
    </div>
  )

  const renderContent = () => {
    switch (forgotPasswordStep) {
      case 'email': return renderEmailStep()
      case 'otp': return renderOTPStep()
      case 'password': return renderPasswordStep()
      case 'success': return renderSuccessStep()
      default: return renderEmailStep()
    }
  }

  return (
    <BaseModal
      open={forgotPasswordOpen}
      onClose={handleClose}
      title={getTitle()}
      size="medium"
      testIdPrefix="forgot-password"
      showCloseButton={forgotPasswordStep !== 'success'}
    >
      {renderContent()}
    </BaseModal>
  )
}
