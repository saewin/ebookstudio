'use client'

import { useEffect, useRef, useState } from 'react'
import { Mic, MicOff } from 'lucide-react'

interface VoiceInputButtonProps {
  onTranscript: (text: string) => void
  className?: string
  label?: string
}

export default function VoiceInputButton({
  onTranscript,
  className = '',
  label = 'พูดภาษาไทย',
}: VoiceInputButtonProps) {
  const [supported, setSupported] = useState(false)
  const [listening, setListening] = useState(false)
  const recognitionRef = useRef<any>(null)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SR =
        (window as any).SpeechRecognition ||
        (window as any).webkitSpeechRecognition
      if (SR) {
        setSupported(true)
      }
    }
    return () => {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
    }
  }, [])

  if (!supported) return null

  function toggleListening() {
    if (listening) {
      try {
        recognitionRef.current?.stop()
      } catch {
        // ignore
      }
      setListening(false)
      return
    }

    const SR =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition
    if (!SR) return

    const recognition = new SR()
    recognition.lang = 'th-TH'
    recognition.continuous = true
    recognition.interimResults = false

    recognition.onstart = () => setListening(true)
    recognition.onerror = () => setListening(false)
    recognition.onend = () => setListening(false)
    recognition.onresult = (event: any) => {
      let chunk = ''
      for (let i = event.resultIndex; i < event.results.length; i++) {
        if (event.results[i].isFinal) {
          chunk += event.results[i][0].transcript + ' '
        }
      }
      if (chunk.trim()) {
        onTranscript(chunk.trim())
      }
    }

    recognitionRef.current = recognition
    try {
      recognition.start()
    } catch {
      setListening(false)
    }
  }

  return (
    <button
      type="button"
      onClick={toggleListening}
      title={listening ? 'กดเพื่อหยุดฟังเสียง' : 'กดแล้วพูดภาษาไทยได้เลย'}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
        listening
          ? 'bg-red-600 text-white border-red-600 animate-pulse shadow-sm'
          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
      } ${className}`}
    >
      {listening ? <MicOff size={14} /> : <Mic size={14} className="text-red-500" />}
      <span>{listening ? 'กำลังฟัง... (กดหยุด)' : label}</span>
    </button>
  )
}
