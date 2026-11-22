'use client'

import { useEffect, useState } from 'react'
import { Smartphone, Check, X, Share, Download } from 'lucide-react'

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

export default function PwaRegister() {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null)
  const [installed, setInstalled] = useState(false)
  const [guideOpen, setGuideOpen] = useState(false)
  const [isIos, setIsIos] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return

    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Silent failure if SW cannot register in restricted context
      })
    }

    const handleBeforeInstall = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
    }

    const handleInstalled = () => {
      setInstalled(true)
      setDeferredPrompt(null)
    }

    window.addEventListener('beforeinstallprompt', handleBeforeInstall)
    window.addEventListener('appinstalled', handleInstalled)

    const ua = window.navigator.userAgent
    const iosCheck = /iPad|iPhone|iPod/.test(ua)
    const standaloneCheck =
      window.matchMedia('(display-mode: standalone)').matches ||
      Boolean((window.navigator as { standalone?: boolean }).standalone)

    const timer = window.setTimeout(() => {
      if (iosCheck) setIsIos(true)
      if (standaloneCheck) setInstalled(true)
    }, 0)

    return () => {
      window.clearTimeout(timer)
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  async function handleInstallClick() {
    if (deferredPrompt) {
      await deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        setInstalled(true)
      }
      setDeferredPrompt(null)
      return
    }
    setGuideOpen(true)
  }

  return (
    <>
      <button
        type="button"
        onClick={handleInstallClick}
        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-colors cursor-pointer ${
          installed
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-white hover:bg-slate-50 text-slate-700 border-slate-200'
        }`}
        title="ติดตั้ง CeoBrain เป็นแอปบนมือถือและหน้าจอหลัก"
      >
        {installed ? (
          <>
            <Check size={14} className="text-emerald-600" />
            <span className="hidden sm:inline">ติดตั้ง PWA แล้ว</span>
          </>
        ) : (
          <>
            <Smartphone size={14} className="text-blue-600" />
            <span>ติดตั้งแอป (PWA)</span>
          </>
        )}
      </button>

      {guideOpen && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-[1px] flex items-center justify-center p-4"
          onClick={() => setGuideOpen(false)}
        >
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="pwa-guide-title"
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 text-white flex items-center justify-center">
                  <Smartphone size={18} />
                </div>
                <div>
                  <h3
                    id="pwa-guide-title"
                    className="text-base font-bold text-slate-900"
                  >
                    ติดตั้ง CeoBrain ลงมือถือ
                  </h3>
                  <p className="text-xs text-slate-500">
                    เปิดใช้งานเต็มจอเหมือนแอป Native พร้อมเก็บฉบับร่างออฟไลน์
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 cursor-pointer"
                aria-label="ปิดหน้าต่าง"
              >
                <X size={16} />
              </button>
            </div>

            {isIos ? (
              <ol className="space-y-2.5 text-xs text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    1
                  </span>
                  <span>
                    เปิดหน้านี้ด้วย <strong>Safari</strong> แล้วแตะไอคอน{' '}
                    <Share size={12} className="inline mx-0.5 text-blue-600" />{' '}
                    <strong>Share</strong> ด้านล่างหน้าจอ
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    2
                  </span>
                  <span>
                    เลื่อนลงแล้วเลือก{' '}
                    <strong>&ldquo;Add to Home Screen&rdquo;</strong>{' '}
                    (เพิ่มไปยังหน้าจอโฮม)
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-slate-700 bg-slate-50 rounded-xl p-4 border border-slate-200">
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    1
                  </span>
                  <span>
                    ในเบราว์เซอร์ Chrome / Edge ให้แตะปุ่มเมนู <strong>⋮</strong>{' '}
                    มุมขวาบน (หรือไอคอน{' '}
                    <Download size={12} className="inline mx-0.5 text-blue-600" />{' '}
                    ที่แถบ URL บนคอม)
                  </span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-slate-900 text-white flex items-center justify-center text-[11px] font-bold shrink-0">
                    2
                  </span>
                  <span>
                    เลือก <strong>&ldquo;Install CeoBrain&rdquo;</strong> หรือ{' '}
                    <strong>&ldquo;Add to Home screen&rdquo;</strong>
                  </span>
                </li>
              </ol>
            )}

            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setGuideOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold cursor-pointer"
              >
                เข้าใจแล้ว
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
