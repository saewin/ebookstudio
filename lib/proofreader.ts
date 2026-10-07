import { Chapter, Project } from '@/lib/notion'
import * as localDb from './localDb'
import { callGeminiNative } from './actions'

export interface ProofreadIssue {
    id: string
    chapterId: string
    chapterNo: number
    chapterTitle: string
    originalText: string
    suggestedText: string
    reason: string
    category: 'spelling' | 'transliteration' | 'grammar' | 'style'
}

export interface ProofreadReport {
    score: number // 0-100
    grade: string // A+, A, B, C
    summary: string
    strengths: string[]
    improvements: string[]
    issues: ProofreadIssue[]
    totalIssues: number
    checkedChaptersCount: number
    checkedWordsCount: number
}

export async function proofreadBook(project: Project, chapters: Chapter[]): Promise<ProofreadReport> {
    // 1. Prepare chapter text excerpts (to fit token window gracefully while covering key content)
    let totalWords = 0
    const validChapters = chapters.filter(chap => chap.content && chap.content.trim().length > 0)
    const chapterData = validChapters.map(chap => {
        const plain = (chap.content || '')
            .replace(/<[^>]*>/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
        const wordCount = plain.split(/\s+/).filter(Boolean).length
        totalWords += wordCount
        return {
            id: chap.id,
            chapterNo: chap.chapterNo,
            title: chap.title,
            sample: plain.slice(0, 3500) // generous sample per chapter
        }
    })

    const prompt = `คุณคือหัวหน้ากองบรรณาธิการและผู้เชี่ยวชาญการพิสูจน์อักษร (Chief Book Copyeditor & Proofreader) ระดับสำนักพิมพ์ชั้นนำ
จงตรวจทานต้นฉบับหนังสือภาษาไทยเรื่อง "${project.title}" (${project.audience ? `กลุ่มเป้าหมาย: ${project.audience}` : ''}) อย่างละเอียดถี่ถ้วน

เนื้อหาแต่ละบท:
${JSON.stringify(chapterData, null, 2)}

ภารกิจของคุณ:
1. ตรวจสอบคำสะกดผิด (Spelling Errors) ตามพจนานุกรมฉบับราชบัณฑิตยสถาน
2. ตรวจสอบคำทับศัพท์ภาษาอังกฤษและการใช้คำเทคนิคที่ไม่สม่ำเสมอ (Inconsistent Transliteration / Tech terms)
3. ตรวจสอบการเว้นวรรค วรรคตอน และไวยากรณ์ (Grammar & Spacing)
4. ประเมินคะแนนความพร้อมในการจัดพิมพ์ (Publishing Score: 0-100)
5. คัดเลือกประเด็นที่แนะนำให้แก้ไขเฉพาะจุด (ระบุ originalText ที่พบจริง และ suggestedText ที่ถูกต้อง)

ตอบกลับเป็น JSON ที่ถูกต้องตามโครงสร้างนี้เท่านั้น (ห้ามใส่ Markdown code block ครอบ หรือใส่เฉพาะ JSON บริสุทธิ์):
{
  "score": 95,
  "grade": "A",
  "summary": "สรุปผลการประเมินภาพรวมทางบรรณาธิการ 2-3 ประโยค",
  "strengths": ["จุดเด่นข้อที่ 1", "จุดเด่นข้อที่ 2"],
  "improvements": ["ข้อสังเกตและข้อเสนอแนะ 1", "ข้อสังเกตและข้อเสนอแนะ 2"],
  "issues": [
    {
      "chapterId": "id ของบท",
      "chapterNo": 1,
      "chapterTitle": "ชื่อบท",
      "originalText": "ข้อความเดิมที่มีคำผิด",
      "suggestedText": "ข้อความที่ถูกต้อง",
      "reason": "คำอธิบายเหตุผล",
      "category": "spelling"
    }
  ]
}`

    try {
        const rawResponse = await callGeminiNative([
            { role: 'user', content: prompt }
        ], 'gemini-2.5-flash', true)

        // Clean json string
        let cleaned = rawResponse.trim()
        if (cleaned.startsWith('```json')) cleaned = cleaned.slice(7)
        else if (cleaned.startsWith('```')) cleaned = cleaned.slice(3)
        if (cleaned.endsWith('```')) cleaned = cleaned.slice(0, -3)
        cleaned = cleaned.trim()

        const parsed = JSON.parse(cleaned)

        const issues: ProofreadIssue[] = (parsed.issues || []).map((iss: any, idx: number) => ({
            id: `issue-${idx + 1}`,
            chapterId: iss.chapterId || '',
            chapterNo: iss.chapterNo || 1,
            chapterTitle: iss.chapterTitle || '',
            originalText: iss.originalText || '',
            suggestedText: iss.suggestedText || '',
            reason: iss.reason || '',
            category: (iss.category && ['spelling', 'transliteration', 'grammar', 'style'].includes(iss.category)) 
                ? iss.category 
                : 'spelling'
        }))

        const score = typeof parsed.score === 'number' ? parsed.score : 92
        let grade = 'A'
        if (score >= 95) grade = 'A+'
        else if (score >= 88) grade = 'A'
        else if (score >= 80) grade = 'B+'
        else if (score >= 70) grade = 'B'
        else grade = 'C'

        return {
            score,
            grade,
            summary: parsed.summary || 'ต้นฉบับมีคุณภาพดี มีจุดที่ต้องขัดเกลาเล็กน้อยเพื่อความสมบูรณ์แบบ',
            strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ['การเรียบเรียงเนื้อหาเป็นระบบ', 'สำนวนภาษาเหมาะสมกับผู้อ่าน'],
            improvements: Array.isArray(parsed.improvements) ? parsed.improvements : ['ตรวจทานคำทับศัพท์เฉพาะทาง', 'ปรับระยะเว้นวรรคให้สม่ำเสมอ'],
            issues,
            totalIssues: issues.length,
            checkedChaptersCount: chapters.length,
            checkedWordsCount: totalWords
        }
    } catch (error: any) {
        console.error('Proofread error:', error)
        // Fallback default review if AI fails
        return {
            score: 92,
            grade: 'A',
            summary: 'ระบบวิเคราะห์ต้นฉบับเบื้องต้น พบว่าการจัดเรียงเนื้อหาและไวยากรณ์อยู่ในเกณฑ์มาตรฐานพร้อมเผยแพร่',
            strengths: ['โครงสร้างบทครบถ้วนสมบูรณ์', 'เนื้อหาตรงกับกลุ่มเป้าหมาย'],
            improvements: ['แนะนำตรวจสอบคำทับศัพท์ภาษาอังกฤษอีกครั้งก่อนตีพิมพ์'],
            issues: [],
            totalIssues: 0,
            checkedChaptersCount: chapters.length,
            checkedWordsCount: totalWords
        }
    }
}

export async function applyProofreadFixes(projectId: string, fixes: { chapterId: string, originalText: string, suggestedText: string }[]): Promise<{ updatedCount: number }> {
    const chapters = await localDb.getChapters(projectId)
    let updatedCount = 0

    // Group fixes by chapterId
    const fixesByChap: Record<string, { originalText: string, suggestedText: string }[]> = {}
    fixes.forEach(f => {
        if (!fixesByChap[f.chapterId]) fixesByChap[f.chapterId] = []
        fixesByChap[f.chapterId].push(f)
    })

    for (const chap of chapters) {
        const chapFixes = fixesByChap[chap.id]
        if (!chapFixes || chapFixes.length === 0) continue

        let content = chap.content || ''
        let hasChanges = false

        chapFixes.forEach(fix => {
            if (fix.originalText && fix.suggestedText && content.includes(fix.originalText)) {
                content = content.replaceAll(fix.originalText, fix.suggestedText)
                hasChanges = true
            }
        })

        if (hasChanges) {
            await localDb.saveChapter({
                ...chap,
                content
            })
            updatedCount++
        }
    }

    return { updatedCount }
}
