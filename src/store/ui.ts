import { create } from 'zustand'

type ForgotPasswordStep = 'email' | 'otp' | 'password' | 'success'

type UIState = {
  successOpen: boolean
  successMessage: string | null
  successDurationMs: number
  openSuccess: (message: string) => void
  openSuccessWithDuration: (message: string, durationMs: number) => void
  closeSuccess: () => void
  termsOpen: boolean
  termsTitle: string | null
  termsBody: string | null
  openDoc: (title: string, body: string) => void
  closeDoc: () => void
  signInModalOpen: boolean
  signInModalCallback: (() => void) | null
  openSignInModal: (callback?: () => void) => void
  closeSignInModal: () => void
  forgotPasswordOpen: boolean
  forgotPasswordStep: ForgotPasswordStep
  forgotPasswordEmail: string | null
  forgotPasswordResetToken: string | null
  openForgotPassword: () => void
  closeForgotPassword: () => void
  setForgotPasswordStep: (step: ForgotPasswordStep) => void
  setForgotPasswordEmail: (email: string) => void
  setForgotPasswordResetToken: (resetToken: string) => void
  cookieBannerShown: boolean
  setCookieBannerShown: (shown: boolean) => void
}

export const useUIStore = create<UIState>((set) => ({
  successOpen: false,
  successMessage: null,
  successDurationMs: 2000,
  openSuccess: (message: string) => set({ successOpen: true, successMessage: message, successDurationMs: 2000 }),
  openSuccessWithDuration: (message: string, durationMs: number) => set({ successOpen: true, successMessage: message, successDurationMs: durationMs }),
  closeSuccess: () => set({ successOpen: false, successMessage: null }),
  termsOpen: false,
  termsTitle: null,
  termsBody: null,
  openDoc: (title: string, body: string) => set({ termsOpen: true, termsTitle: title, termsBody: body }),
  closeDoc: () => set({ termsOpen: false, termsTitle: null, termsBody: null }),
  signInModalOpen: false,
  signInModalCallback: null,
  openSignInModal: (callback?: () => void) => set({ signInModalOpen: true, signInModalCallback: callback || null }),
  closeSignInModal: () => set({ signInModalOpen: false, signInModalCallback: null }),
  forgotPasswordOpen: false,
  forgotPasswordStep: 'email',
  forgotPasswordEmail: null,
  forgotPasswordResetToken: null,
  openForgotPassword: () => set({ forgotPasswordOpen: true, forgotPasswordStep: 'email', forgotPasswordEmail: null, forgotPasswordResetToken: null }),
  closeForgotPassword: () => set({ forgotPasswordOpen: false, forgotPasswordStep: 'email', forgotPasswordEmail: null, forgotPasswordResetToken: null }),
  setForgotPasswordStep: (step: ForgotPasswordStep) => set({ forgotPasswordStep: step }),
  setForgotPasswordEmail: (email: string) => set({ forgotPasswordEmail: email }),
  setForgotPasswordResetToken: (resetToken: string) => set({ forgotPasswordResetToken: resetToken }),
  cookieBannerShown: (() => {
    try {
      if (typeof document === 'undefined') return false
      const match = document.cookie.split('; ').find((row) => row.startsWith('cookie-preferences='))
      return !!match
    } catch {
      return false
    }
  })(),
  setCookieBannerShown: (shown: boolean) => set({ cookieBannerShown: shown }),
}))


