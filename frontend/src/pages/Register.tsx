import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Zap, Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'

export function Register() {
  const { t } = useTranslation()
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [passwordConfirm, setPasswordConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const navigate = useNavigate()
  const login = useAuthStore((state) => state.login)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')

    if (password !== passwordConfirm) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)

    try {
      const response = await api.post('auth/register/', {
        username,
        email,
        password,
        password_confirm: passwordConfirm,
        first_name: firstName,
        last_name: lastName,
        phone: phone || undefined,
      })

      const { tokens, user } = response.data
      login(tokens.access, tokens.refresh, user)
      navigate('/')
    } catch (err: unknown) {
      const error = err as { response?: { data?: Record<string, string[]> } }
      if (error.response?.data) {
        const messages = Object.values(error.response.data).flat()
        setError(messages.join(' '))
      } else {
        setError('Registration failed. Please try again.')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass =
    'h-11 w-full rounded-lg border border-border bg-background px-3.5 text-[14px] text-foreground outline-none transition-all placeholder:text-muted-foreground/40 focus:border-foreground/30 focus:ring-1 focus:ring-foreground/10'

  return (
    <div className="flex min-h-screen bg-background">
      {/* Left — Image */}
      <div className="hidden lg:block lg:w-[55%] relative overflow-hidden">
        <img
          src="https://images.pexels.com/photos/3965545/pexels-photo-3965545.jpeg?auto=compress&cs=tinysrgb&w=1920&h=1280&fit=crop"
          alt=""
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-black/10" />

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2, ease: 'easeOut' as const }}
          className="absolute bottom-0 left-0 right-0 p-12 xl:p-16"
        >
          <div className="flex items-center gap-2 mb-6">
            <div className="h-7 w-7 rounded-md bg-white/20 backdrop-blur-md flex items-center justify-center">
              <Zap className="h-3.5 w-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-bold text-white/90 tracking-wide">
              SwiftBill
            </span>
          </div>
          <h1 className="font-display text-4xl xl:text-5xl font-bold text-white leading-[1.1] mb-4 max-w-lg whitespace-pre-line">
            {t('auth.registerHeroTitle')}
          </h1>
          <p className="text-[15px] text-white/60 max-w-md leading-relaxed">
            {t('auth.registerHeroDesc')}
          </p>
        </motion.div>
      </div>

      {/* Right — Form */}
      <div className="flex w-full lg:w-[45%] items-center justify-center px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' as const }}
          className="w-full max-w-[380px]"
        >
          <div className="flex items-center gap-2 mb-12 lg:mb-14">
            <div className="h-8 w-8 rounded-lg bg-[hsl(var(--primary))] flex items-center justify-center">
              <Zap className="h-4 w-4 text-white" />
            </div>
            <span className="font-display text-lg font-bold tracking-tight">
              SwiftBill
            </span>
          </div>

          <div className="mb-8">
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">
              {t('auth.createAccount')}
            </h2>
            <p className="text-[14px] text-muted-foreground">
              {t('auth.createAccountDesc')}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-lg bg-destructive/6 border border-destructive/10 px-4 py-3 text-[13px] text-destructive"
              >
                {error}
              </motion.div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-foreground">
                  {t('auth.firstName')}
                </label>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                  placeholder="John"
                  required
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-foreground">
                  {t('auth.lastName')}
                </label>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                  placeholder="Doe"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground">
                {t('auth.email')}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="john@example.com"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground">
                {t('auth.username')}
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className={inputClass}
                placeholder="johndoe"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="block text-[13px] font-medium text-foreground">
                {t('auth.phone')}{' '}
                <span className="text-muted-foreground/50 font-normal">
                  ({t('auth.optional')})
                </span>
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className={inputClass}
                placeholder="+1 (555) 000-0000"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-foreground">
                  {t('auth.password')}
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${inputClass} pr-9`}
                    placeholder="Create"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground/40 hover:text-foreground transition-colors"
                  >
                    {showPassword ? (
                      <EyeOff className="h-3.5 w-3.5" />
                    ) : (
                      <Eye className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="block text-[13px] font-medium text-foreground">
                  {t('auth.confirmPassword')}
                </label>
                <input
                  type="password"
                  value={passwordConfirm}
                  onChange={(e) => setPasswordConfirm(e.target.value)}
                  className={inputClass}
                  placeholder="Confirm"
                  required
                />
              </div>
            </div>

            <motion.button
              type="submit"
              disabled={loading}
              className="relative flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-[hsl(var(--primary))] text-[14px] font-medium text-white transition-all hover:opacity-90 disabled:opacity-50"
              whileTap={{ scale: 0.985 }}
            >
              {loading ? (
                <motion.div
                  className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white"
                  animate={{ rotate: 360 }}
                  transition={{
                    duration: 0.75,
                    repeat: Infinity,
                    ease: 'linear',
                  }}
                />
              ) : (
                <>
                  {t('auth.creatingAccount')}
                  <ArrowRight className="h-4 w-4" />
                </>

              )}
            </motion.button>
          </form>

          <div className="mt-8 text-center">
            <span className="text-[13px] text-muted-foreground">
              {t('auth.haveAccount')}{' '}
            </span>
            <Link
              to="/login"
              className="text-[13px] font-medium text-foreground underline decoration-foreground/20 underline-offset-4 hover:decoration-foreground/60 transition-all"
            >
              {t('auth.signInLink')}
            </Link>
          </div>
        </motion.div>
      </div>
    </div>
  )
}
