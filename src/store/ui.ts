import { create } from 'zustand'

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
}))


