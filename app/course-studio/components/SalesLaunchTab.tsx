'use client'

import { useState } from 'react'
import {
  Copy,
  Check,
  Sparkles,
  Megaphone,
  Globe,
  Plus,
  Trash2,
  ShieldCheck,
  CheckCircle2,
  XCircle,
} from 'lucide-react'
import type {
  CourseProject,
  CourseSalesPage,
  LaunchChannel,
  LaunchPost,
} from '@/lib/courseStudioTypes'

interface SalesLaunchTabProps {
  course: CourseProject
  onChange: (updated: CourseProject) => void
}

const CHANNEL_BADGES: Record<LaunchChannel, { label: string; color: string }> = {
  facebook: { label: 'Facebook', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  'tiktok-reels': {
    label: 'TikTok / Reels',
    color: 'bg-pink-50 text-pink-700 border-pink-200',
  },
  'line-oa': {
    label: 'LINE OA',
    color: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  },
  email: { label: 'Email', color: 'bg-amber-50 text-amber-700 border-amber-200' },
}

export default function SalesLaunchTab({ course, onChange }: SalesLaunchTabProps) {
  const [subTab, setSubTab] = useState<'sales-preview' | 'sales-edit' | 'launch-posts'>(
    'sales-preview'
  )
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [aiPostLoadingId, setAiPostLoadingId] = useState<string | null>(null)

  const sp = course.salesPage

  function updateSalesPage(patch: Partial<CourseSalesPage>) {
    onChange({
      ...course,
      salesPage: { ...course.salesPage, ...patch },
    })
  }

  function updatePost(id: string, patch: Partial<LaunchPost>) {
    onChange({
      ...course,
      launchPosts: course.launchPosts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
    })
  }

  function addPost(channel: LaunchChannel) {
    const post: LaunchPost = {
      id: `post-${Date.now()}`,
      channel,
      label: `${CHANNEL_BADGES[channel].label} Post ใหม่`,
      title: `เปิดตัว ${course.title}`,
      hook: course.bigIdea,
      body: 'เขียนรายละเอียดเรื่องราวและสิ่งที่ผู้เรียนจะได้รับ...',
      cta: 'คอมเมนต์หรือทักแชทเพื่อรับสิทธิ์ Early Bird ครับ',
    }
    onChange({ ...course, launchPosts: [...course.launchPosts, post] })
  }

  async function copyText(id: string, text: string) {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 1800)
  }

  function buildSalesPageMarkdown(): string {
    return `# ${sp.heroHeadline}

**${sp.heroEyebrow}**
${sp.heroSubheadline}

---

## ${sp.painPointsTitle}
${sp.painPoints.map((p) => `- ${p}`).join('\n')}

## ${sp.bigIdeaTitle}
${sp.bigIdeaStory}

### ระบบ 3 สมอง
${sp.threeBrains.map((b) => `- **${b.brain}** (${b.role}): ${b.description}`).join('\n')}

## สิ่งที่คุณจะได้กลับบ้านจริงใน 1 วัน
${sp.deliverables.map((d) => `- **${d.title}** — ${d.detail}`).join('\n')}

## ตารางเรียน (${course.durationLabel})
${course.sessions.map((s) => `- **${s.timeRange}** | ${s.title} *(ชิ้นงาน: ${s.deliverable})*`).join('\n')}

## แพ็กเกจและราคา
${sp.pricingTiers
  .map(
    (t) =>
      `### ${t.name} — ${t.price}${t.originalPrice ? ` (ปกติ ${t.originalPrice})` : ''}\n${t.description}\n${t.features.map((f) => `- ${f}`).join('\n')}`
  )
  .join('\n\n')}

> **การรับประกัน:** ${sp.guarantee}

## คำถามที่พบบ่อย (FAQ)
${sp.faqs.map((f) => `**Q: ${f.question}**\nA: ${f.answer}`).join('\n\n')}
`
  }

  async function handleAiRewritePost(post: LaunchPost) {
    setAiPostLoadingId(post.id)
    try {
      const res = await fetch('/api/course-studio/ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate-post',
          courseTitle: course.title,
          bigIdea: course.bigIdea,
          targetAudience: course.targetAudience,
          context: { channel: post.channel },
          instruction: `เขียนโพสต์ใหม่ให้น่าสนใจและตรงช่องทาง ${CHANNEL_BADGES[post.channel].label} โดยชู Big Idea "${course.bigIdea}" เป็นแก่นหลัก`,
        }),
      })
      const json = await res.json()
      if (json?.success && json.data) {
        updatePost(post.id, {
          title: json.data.title || post.title,
          hook: json.data.hook || post.hook,
          body: json.data.body || post.body,
          cta: json.data.cta || post.cta,
        })
      } else {
        alert(json?.error || 'AI ไม่สามารถสร้างโพสต์ได้')
      }
    } catch {
      alert('เกิดข้อผิดพลาดในการเชื่อมต่อ AI')
    } finally {
      setAiPostLoadingId(null)
    }
  }

  return (
    <div className="space-y-5">
      {/* Sub-navigation */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-slate-200 rounded-xl px-4 py-3">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSubTab('sales-preview')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              subTab === 'sales-preview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Globe size={14} /> พรีวิว Sales Page
          </button>
          <button
            type="button"
            onClick={() => setSubTab('sales-edit')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer ${
              subTab === 'sales-edit'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            แก้ไขเนื้อหา Sales Page
          </button>
          <button
            type="button"
            onClick={() => setSubTab('launch-posts')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer ${
              subTab === 'launch-posts'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
            }`}
          >
            <Megaphone size={14} /> โพสต์เปิดตัวขายคอร์ส ({course.launchPosts.length})
          </button>
        </div>

        <button
          type="button"
          onClick={() => copyText('sales-md', buildSalesPageMarkdown())}
          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
        >
          {copiedId === 'sales-md' ? (
            <>
              <Check size={14} className="text-emerald-600" /> คัดลอก Sales Page แล้ว!
            </>
          ) : (
            <>
              <Copy size={14} /> คัดลอก Sales Page (Markdown)
            </>
          )}
        </button>
      </div>

      {/* Live High-Converting Sales Page Preview */}
      {subTab === 'sales-preview' && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-sm">
          {/* Hero */}
          <div className="bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 text-white px-8 py-14 text-center space-y-5">
            <div className="inline-block px-3.5 py-1 rounded-full bg-blue-500/20 border border-blue-400/40 text-sky-300 text-xs font-bold tracking-wider uppercase">
              {sp.heroEyebrow}
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold max-w-3xl mx-auto leading-tight">
              &ldquo;{sp.heroHeadline}&rdquo;
            </h1>
            <p className="text-sm md:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
              {sp.heroSubheadline}
            </p>
            <div className="pt-2">
              <span className="inline-flex items-center gap-2 px-7 py-3.5 rounded-xl bg-blue-600 text-white font-bold text-sm shadow-lg shadow-blue-600/30">
                {sp.heroCta}
              </span>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 md:px-10 py-12 space-y-12">
            {/* Pain Points */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 text-center">
                {sp.painPointsTitle}
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                {sp.painPoints.map((p, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-red-100 bg-red-50/40 text-sm text-slate-700 leading-relaxed"
                  >
                    <span className="font-bold text-red-600 mr-1.5">✕</span>
                    {p}
                  </div>
                ))}
              </div>
            </section>

            {/* Big Idea & 3 Brains */}
            <section className="space-y-5">
              <div className="text-center space-y-2">
                <h2 className="text-2xl font-bold text-slate-900">{sp.bigIdeaTitle}</h2>
                <p className="text-sm text-slate-600 leading-relaxed max-w-2xl mx-auto">
                  {sp.bigIdeaStory}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sp.threeBrains.map((b, i) => (
                  <div
                    key={i}
                    className="p-5 rounded-xl border border-blue-200 bg-blue-50/40 space-y-2"
                  >
                    <div className="text-xs font-bold text-blue-700 uppercase">
                      {b.brain}
                    </div>
                    <div className="text-sm font-bold text-slate-900">{b.role}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      {b.description}
                    </p>
                  </div>
                ))}
              </div>
            </section>

            {/* 4 Deliverables */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 text-center">
                4 ชิ้นงานจริงที่คุณจะได้กลับบ้านใน 1 วัน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sp.deliverables.map((d, i) => (
                  <div
                    key={i}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/60 space-y-1"
                  >
                    <div className="text-sm font-bold text-slate-900">{d.title}</div>
                    <p className="text-xs text-slate-600 leading-relaxed">{d.detail}</p>
                  </div>
                ))}
              </div>
            </section>

            {/* Who is it for / not for */}
            <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-5 rounded-xl border border-emerald-200 bg-emerald-50/40 space-y-3">
                <h3 className="text-sm font-bold text-emerald-900 flex items-center gap-1.5">
                  <CheckCircle2 size={16} className="text-emerald-600" />
                  คอร์สนี้เหมาะกับใคร?
                </h3>
                <ul className="space-y-2 text-xs text-slate-700">
                  {sp.whoIsFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-emerald-600 font-bold">✓</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="p-5 rounded-xl border border-slate-200 bg-slate-50 space-y-3">
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <XCircle size={16} className="text-slate-500" />
                  คอร์สนี้ยังไม่เหมาะกับใคร?
                </h3>
                <ul className="space-y-2 text-xs text-slate-600">
                  {sp.whoIsNotFor.map((item, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-400 font-bold">–</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* Pricing Tiers */}
            <section className="space-y-4">
              <h2 className="text-xl font-bold text-slate-900 text-center">
                แพ็กเกจและสิทธิ์การเข้าเรียน
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {sp.pricingTiers.map((tier) => (
                  <div
                    key={tier.id}
                    className={`p-5 rounded-xl border flex flex-col justify-between space-y-4 ${
                      tier.highlighted
                        ? 'border-blue-600 bg-blue-50/30 ring-2 ring-blue-600/15'
                        : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <h3 className="text-sm font-bold text-slate-900">{tier.name}</h3>
                        {tier.badge && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-600 text-white">
                            {tier.badge}
                          </span>
                        )}
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-extrabold text-blue-700">
                          {tier.price}
                        </span>
                        {tier.originalPrice && (
                          <span className="text-xs text-slate-400 line-through">
                            {tier.originalPrice}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">{tier.description}</p>
                      <ul className="space-y-1.5 pt-2 text-xs text-slate-700">
                        {tier.features.map((f, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-blue-600 font-bold">✓</span>
                            <span>{f}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 flex items-start gap-3 text-xs text-emerald-900">
                <ShieldCheck size={18} className="text-emerald-600 shrink-0 mt-0.5" />
                <span>{sp.guarantee}</span>
              </div>
            </section>

            {/* FAQ */}
            <section className="space-y-3">
              <h2 className="text-lg font-bold text-slate-900">คำถามที่พบบ่อย (FAQ)</h2>
              <div className="space-y-2.5">
                {sp.faqs.map((faq) => (
                  <div
                    key={faq.id}
                    className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1"
                  >
                    <div className="text-sm font-bold text-slate-900">
                      Q: {faq.question}
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">
                      A: {faq.answer}
                    </p>
                  </div>
                ))}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* Sales Page Editor */}
      {subTab === 'sales-edit' && (
        <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hero Headline (พาดหัวหลัก ชู Big Idea)
              </label>
              <input
                type="text"
                value={sp.heroHeadline}
                onChange={(e) => updateSalesPage({ heroHeadline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-sm font-bold"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Hero Subheadline
              </label>
              <textarea
                rows={2}
                value={sp.heroSubheadline}
                onChange={(e) => updateSalesPage({ heroSubheadline: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ข้อความปุ่ม CTA
              </label>
              <input
                type="text"
                value={sp.heroCta}
                onChange={(e) => updateSalesPage({ heroCta: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                ข้อความรับประกัน (Guarantee)
              </label>
              <input
                type="text"
                value={sp.guarantee}
                onChange={(e) => updateSalesPage({ guarantee: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                Pain Points (บรรทัดละ 1 ข้อ)
              </label>
              <textarea
                rows={4}
                value={sp.painPoints.join('\n')}
                onChange={(e) =>
                  updateSalesPage({
                    painPoints: e.target.value.split('\n').filter((l) => l.trim()),
                  })
                }
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs leading-relaxed"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-slate-600 mb-1">
                เรื่องราว Big Idea
              </label>
              <textarea
                rows={4}
                value={sp.bigIdeaStory}
                onChange={(e) => updateSalesPage({ bigIdeaStory: e.target.value })}
                className="w-full px-3.5 py-2 rounded-lg border border-slate-200 text-xs leading-relaxed"
              />
            </div>
          </div>
        </div>
      )}

      {/* Launch Posts */}
      {subTab === 'launch-posts' && (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              ชุดโพสต์เปิดตัวขายคอร์สครบทุกช่องทาง — กดคัดลอกไปโพสต์ได้ทันที หรือให้ AI ช่วยเขียนเวอร์ชันใหม่
            </p>
            <div className="flex items-center gap-1.5">
              {(['facebook', 'tiktok-reels', 'line-oa'] as LaunchChannel[]).map((ch) => (
                <button
                  key={ch}
                  type="button"
                  onClick={() => addPost(ch)}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-medium text-slate-700 cursor-pointer"
                >
                  <Plus size={12} /> {CHANNEL_BADGES[ch].label}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            {course.launchPosts.map((post) => {
              const badge = CHANNEL_BADGES[post.channel] || CHANNEL_BADGES.facebook
              const fullCopy = `${post.hook}\n\n${post.body}\n\n${post.cta}`
              return (
                <div
                  key={post.id}
                  className="rounded-xl border border-slate-200 bg-white p-5 space-y-3 shadow-xs"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.color}`}
                      >
                        {badge.label}
                      </span>
                      <span className="text-sm font-bold text-slate-900">
                        {post.title}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleAiRewritePost(post)}
                        disabled={aiPostLoadingId === post.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-semibold cursor-pointer disabled:opacity-50"
                      >
                        <Sparkles size={12} />
                        {aiPostLoadingId === post.id ? 'กำลังเขียน...' : 'AI เขียนใหม่'}
                      </button>
                      <button
                        type="button"
                        onClick={() => copyText(post.id, fullCopy)}
                        className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold cursor-pointer"
                      >
                        {copiedId === post.id ? (
                          <>
                            <Check size={12} className="text-emerald-400" /> คัดลอกแล้ว
                          </>
                        ) : (
                          <>
                            <Copy size={12} /> คัดลอกโพสต์
                          </>
                        )}
                      </button>
                      {course.launchPosts.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            onChange({
                              ...course,
                              launchPosts: course.launchPosts.filter(
                                (p) => p.id !== post.id
                              ),
                            })
                          }
                          className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Hook (ประโยคเปิดหยุดนิ้ว)
                      </label>
                      <input
                        type="text"
                        value={post.hook}
                        onChange={(e) => updatePost(post.id, { hook: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-md border border-slate-200 text-xs font-semibold text-slate-900"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        เนื้อหาโพสต์
                      </label>
                      <textarea
                        rows={7}
                        value={post.body}
                        onChange={(e) => updatePost(post.id, { body: e.target.value })}
                        className="w-full px-3 py-2 rounded-md border border-slate-200 text-xs leading-relaxed"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-500 mb-1">
                        Call-to-Action (ปิดการขาย)
                      </label>
                      <input
                        type="text"
                        value={post.cta}
                        onChange={(e) => updatePost(post.id, { cta: e.target.value })}
                        className="w-full px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50/40 text-xs font-semibold text-blue-900"
                      />
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
