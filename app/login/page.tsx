'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { Eye, EyeOff, Lock, LogIn, ShieldAlert, User } from 'lucide-react'

function LoginForm() {
  const searchParams = useSearchParams()
  const nextParam = searchParams.get('next')
  const errorParam = searchParams.get('error')

  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(
    errorParam === 'unconfigured'
      ? 'ยังไม่ได้ตั้งค่า STUDIO_USERNAME และ STUDIO_PASSWORD ใน Environment Variables ของเซิร์ฟเวอร์'
      : null
  )

  const getSafeNext = (value: string | null) => {
    if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) {
      return '/'
    }
    return value
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok) {
        setError(data?.error || 'เข้าสู่ระบบไม่สำเร็จ กรุณาลองใหม่')
        setSubmitting(false)
        return
      }

      window.location.assign(getSafeNext(nextParam))
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง')
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4 py-12">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl shadow-sm p-8 space-y-6">
        {/* Brand */}
        <div className="flex flex-col items-center text-center space-y-3">
          <div className="flex items-center gap-2.5">
            <span className="w-10 h-10 bg-primary text-white flex items-center justify-center rounded-lg text-lg font-bold shadow-xs">
              E
            </span>
            <span className="text-2xl font-bold tracking-tight text-slate-900">
              Studio
            </span>
          </div>
          <div>
            <h1 className="text-lg font-semibold text-slate-900">
              เข้าสู่ระบบ Ebook Studio
            </h1>
            <p className="text-sm text-slate-500 mt-0.5">
              กรุณายืนยันตัวตนก่อนเข้าใช้งานสตูดิโอ
            </p>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-700"
          >
            <ShieldAlert size={18} className="shrink-0 mt-0.5 text-red-600" />
            <span>{error}</span>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <label
              htmlFor="studio-username"
              className="block text-sm font-medium text-slate-700"
            >
              ชื่อผู้ใช้ (Username)
            </label>
            <div className="relative">
              <User
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="studio-username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="กรอกชื่อผู้ใช้"
                className="w-full pl-10 pr-3.5 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="studio-password"
              className="block text-sm font-medium text-slate-700"
            >
              รหัสผ่าน (Password)
            </label>
            <div className="relative">
              <Lock
                size={16}
                className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none"
              />
              <input
                id="studio-password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="กรอกรหัสผ่าน"
                className="w-full pl-10 pr-10 py-2.5 text-sm rounded-lg border border-slate-300 bg-white text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-600 transition-colors"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                aria-label={showPassword ? 'ซ่อนรหัสผ่าน' : 'แสดงรหัสผ่าน'}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full mt-2 bg-primary text-primary-foreground hover:opacity-95 disabled:opacity-60 py-2.5 px-4 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-all shadow-xs cursor-pointer"
          >
            <LogIn size={16} />
            {submitting ? 'กำลังตรวจสอบ...' : 'เข้าสู่ระบบ'}
          </button>
        </form>

        <p className="text-center text-xs text-slate-400 pt-2 border-t border-slate-100">
          Private Workspace · Protected Access
        </p>
      </div>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-slate-50 text-sm text-slate-500">
          กำลังโหลด...
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  )
}
