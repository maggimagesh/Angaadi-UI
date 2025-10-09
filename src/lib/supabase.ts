import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  console.error('Missing Supabase environment variables:')
  console.error('- VITE_SUPABASE_URL:', supabaseUrl ? '✓ Set' : '✗ Missing')
  console.error('- VITE_SUPABASE_ANON_KEY:', supabaseAnonKey ? '✓ Set' : '✗ Missing')
  console.error('Please check your Vercel environment variables configuration.')
  
  // In production, show a user-friendly error instead of crashing
  if (import.meta.env.PROD) {
    document.body.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h1>Configuration Error</h1>
        <p>This application is not properly configured. Please contact the administrator.</p>
      </div>
    `
    throw new Error('Missing Supabase environment variables in production')
  } else {
    throw new Error('Missing Supabase environment variables. Please check your .env file.')
  }
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'pkce',
    // Enable popup support
    storage: window.localStorage,
    storageKey: 'supabase.auth.token'
  }
})

export const auth = {
  async signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/oauth-callback`,
        skipBrowserRedirect: true
      }
    })
    
    if (error) {
      throw error
    }
    
    return data
  },

  async getSession() {
    const { data: { session }, error } = await supabase.auth.getSession()
    
    if (error) {
      throw error
    }
    
    return session
  },

  async signOut() {
    const { error } = await supabase.auth.signOut()
    
    if (error) {
      throw error
    }
  },

  onAuthStateChange(callback: (event: string, session: any) => void) {
    return supabase.auth.onAuthStateChange(callback)
  },

  async getCurrentUser() {
    const { data: { user }, error } = await supabase.auth.getUser()
    
    if (error) {
      throw error
    }
    
    return user
  }
}

export default supabase
