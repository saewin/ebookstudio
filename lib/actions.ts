'use server'

import { revalidatePath } from 'next/cache'
import * as localDb from './localDb'
import { getChapters, getProject } from '@/lib/notion'
import { 
    MASTER_AUTHOR_PERSONA, 
    buildProfessionalChapterPrompt, 
    buildGhostwriterSystemPrompt, 
    BookProjectContext 
} from '@/lib/prompts/authorPersona'
import { statusMapping } from './constants';
import { sanitizeBookContent } from './sanitize';

function getGeminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
}

// function bulkCreateChapters
export async function bulkCreateChapters(projectId: string, chapterTitles: string[]) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        const existingChapters = await localDb.getChapters(projectId);
        if (existingChapters.length > 0) {
            console.warn(`Chapters already exist for project ${projectId}. Skipping bulk creation to prevent duplicates.`);
            return { success: false, error: "Chapters already exist" };
        }

        console.log(`Bulk creating ${chapterTitles.length} chapters for project ${projectId}...`);
        await localDb.bulkCreateChapters(projectId, chapterTitles);

        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Bulk Create Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function createBriefing(projectName: string, persona: string, tone: string, goal: string, extraInfo?: any) {
    try {
        let fullDescription = goal;

        // Append extra structured data if provided
        if (extraInfo) {
            fullDescription += `\n\n=== Strategic Context ===\n`;
            if (extraInfo.painPoints) fullDescription += `Pain Points:\n${extraInfo.painPoints}\n\n`;
            if (extraInfo.transformation) fullDescription += `Transformation:\n${extraInfo.transformation}\n\n`;
            if (extraInfo.coreMessage) fullDescription += `Core Message: ${extraInfo.coreMessage}\n\n`;
            if (extraInfo.antiGoals) fullDescription += `Anti-Goals: ${extraInfo.antiGoals}\n\n`;
            if (extraInfo.roleOfBook) fullDescription += `Role: ${extraInfo.roleOfBook}\n\n`;
            if (extraInfo.draftStructure) fullDescription += `=== Draft Structure ===\n${extraInfo.draftStructure}\n`;
        }

        const project = await localDb.saveProject({
            title: projectName,
            theme: fullDescription,
            audience: persona,
            tone: tone || 'Professional',
            status: 'Idea',
            extraInfo: extraInfo || {},
        });

        // If Draft Structure exists, create chapters immediately!
        if (extraInfo?.draftStructure) {
            const lines = extraInfo.draftStructure.split('\n')
                .map((l: string) => l.trim())
                .filter((l: string) => l.length > 0 && !l.startsWith('==='))
                .map((l: string) => l.replace(/^[-*•\d\.]+\s+/, '').replace(/^[-*•]\s*/, '')); // Clean leading bullets

            if (lines.length > 0) {
                console.log(`[createBriefing] Auto-creating ${lines.length} chapters for new project ${project.id}`);
                const bulkResult = await bulkCreateChapters(project.id, lines);
                if (!bulkResult.success) {
                    console.warn(`[createBriefing] Chapters skipped: ${bulkResult.error}`);
                }
            }
        }

        revalidatePath('/briefing');
        revalidatePath('/');
        return { success: true, id: project.id };
    } catch (error: any) {
        console.error("Create Briefing Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function deleteProject(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        console.log(`Deleting Project ${projectId} and its chapters...`);
        await localDb.deleteProject(projectId);
        revalidatePath('/structure');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error("Delete Project Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function reorderChapters(orderedIds: string[]) {
    if (!orderedIds || orderedIds.length === 0) return { success: false, error: "No IDs provided" };

    try {
        await localDb.reorderChapters(orderedIds);
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Reorder Chapters Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function deleteChapter(chapterId: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID" };
    try {
        await localDb.deleteChapter(chapterId);
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Delete Chapter Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function renameChapter(chapterId: string, newTitle: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID" };
    try {
        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({ ...ch, title: newTitle });
        }
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Rename Chapter Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function renameProject(projectId: string, newTitle: string) {
    if (!projectId) return { success: false, error: "No Project ID" };
    try {
        const p = await localDb.getProject(projectId);
        if (p) {
            await localDb.saveProject({ ...p, title: newTitle });
        }
        revalidatePath('/structure');
        revalidatePath('/');
        return { success: true };
    } catch (error: any) {
        console.error("Rename Project Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function triggerExport(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        const p = await localDb.getProject(projectId);
        if (p) {
            await localDb.saveProject({ ...p, status: "Publish" });
        }
        revalidatePath('/export');
        return { success: true };
    } catch (error: any) {
        console.error("Export Trigger Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function createChapter(projectId: string, title: string, chapterNo: number) {
    if (!projectId) return { success: false, error: "Missing Project ID (Series Linkage)" };

    try {
        const existing = await localDb.getChapters(projectId);
        if (existing.some(c => c.chapterNo === chapterNo)) {
            console.warn(`Chapter ${chapterNo} already exists for project ${projectId}.`);
            return { success: false, error: `Chapter ${chapterNo} already exists.` };
        }

        console.log(`Creating Chapter "${title}" for Project ${projectId}`);
        await localDb.saveChapter({
            projectId,
            title,
            chapterNo,
            status: "To Do",
            content: '',
        });
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Create Chapter Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function triggerGhostwriter(
    chapterId: string, 
    projectId?: string, 
    provider: 'gemini' | 'openrouter' = 'gemini'
) {
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };

    try {
        console.log(`Triggering AI Chapter Generation for Chapter ${chapterId} with provider: ${provider}`);

        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({
                ...ch,
                status: "Drafting",
            });
        }

        const res = await generateFullProfessionalChapter(chapterId, projectId, provider);
        if (!res.success) {
            console.error("AI Chapter Generation failed:", res.error);
            await resetChapterStatus(chapterId);
            return { success: false, error: res.error };
        }

        revalidatePath('/structure');
        revalidatePath('/writing');
        return { success: true, data: res.data };
    } catch (error: any) {
        console.error("Trigger Ghostwriter Error:", error);
        await resetChapterStatus(chapterId);
        return { success: false, error: error.message || error };
    }
}

export async function updateChapterTitle(chapterId: string, newTitle: string) {
    if (!chapterId || !newTitle) return { success: false, error: "Missing ID or Title" };

    try {
        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({ ...ch, title: newTitle });
        }
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Update Title Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function updateChapterNumber(chapterId: string, newNumber: number) {
    if (!chapterId || newNumber === undefined) return { success: false, error: "Missing ID or Number" };

    try {
        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({ ...ch, chapterNo: newNumber });
        }
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Update Number Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function triggerAgentA(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        const p = await localDb.getProject(projectId);
        if (p) {
            await localDb.saveProject({ ...p, status: "Generating Content" });
        }
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Trigger Agent A Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function triggerBookBinder(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        let webhookUrl = process.env.N8N_BOOK_BINDER_WEBHOOK || '';

        if (!webhookUrl || !webhookUrl.startsWith('http')) {
            webhookUrl = 'https://flow.supralawyer.com/webhook/book-binder-v2';
        }

        console.log(`Triggering Book Binder for Project ${projectId} at ${webhookUrl}...`);
        const response = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ projectId })
        });

        if (!response.ok) {
            const text = await response.text();
            return { success: false, error: `N8N Error: ${text}` };
        }

        const data = await response.json();
        return { success: true, url: data.docUrl };

    } catch (error: any) {
        console.error("Trigger Book Binder Error:", error);
        return { success: false, error: error?.message || String(error) };
    }
}

export async function fetchChapterDetails(chapterId: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };

    try {
        const chapter = await localDb.getChapter(chapterId);
        if (!chapter) return { success: false, error: "Chapter not found" };

        return { 
            success: true, 
            data: { 
                id: chapter.id,
                title: chapter.title, 
                content: chapter.content, 
                chapterNo: chapter.chapterNo, 
                keyTakeaways: chapter.keyTakeaways, 
                keyTerminology: chapter.keyTerminology, 
                projectId: chapter.projectId,
                image1Url: chapter.image1Url || chapter.chapterImage || ''
            } 
        };
    } catch (error: any) {
        console.error("Fetch Chapter Details Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function updateChapterImage(chapterId: string, imageUrl: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };
    try {
        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({
                ...ch,
                image1Url: imageUrl.trim(),
            });
        }
        revalidatePath('/writing');
        revalidatePath('/export');
        return { success: true };
    } catch (error: any) {
        console.error("Update Chapter Image Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function fetchAllProjectChapters(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        const chapters = await localDb.getChapters(projectId);
        return { success: true, data: chapters };
    } catch (error: any) {
        console.error("Fetch All Chapters Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function updateChapterContent(chapterId: string, newContent: string) {
    if (!chapterId || !newContent) return { success: false, error: "Missing ID or Content" };

    try {
        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({
                ...ch,
                content: newContent,
                hasContent: Boolean(newContent.trim()),
                status: ch.status === 'To Do' ? 'Reviewing' : ch.status,
            });
        }
        revalidatePath('/writing');
        return { success: true };
    } catch (error: any) {
        console.error("Update Content Error:", error);
        return { success: false, error: error?.message || error };
    }
}

// Unified LLM caller supporting both Google Gemini API (Free tier from Google AI Studio) and OpenRouter
export async function executeLLMCompletion({
    messages,
    maxTokens = 3000,
    temperature = 0.7,
    provider = 'gemini',
    jsonMode = false,
    model,
}: {
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    temperature?: number;
    provider?: 'gemini' | 'openrouter';
    jsonMode?: boolean;
    model?: string;
}): Promise<string> {
    const geminiKey = getGeminiApiKey();
    const openrouterKey = process.env.OPENROUTER_API_KEY;

    // Selected Mode: OpenRouter
    if (provider === 'openrouter') {
        if (!openrouterKey) {
            throw new Error('ยังไม่ได้กำหนด OPENROUTER_API_KEY ในระบบ กรุณาตรวจสอบการตั้งค่า');
        }

        const bodyPayload: any = {
            model: 'google/gemini-2.5-flash',
            messages,
            max_tokens: maxTokens,
            temperature
        };
        if (jsonMode) {
            bodyPayload.response_format = { type: 'json_object' };
        }

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${openrouterKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ebookstudio.aimar.cloud',
                'X-Title': 'Ebook Creator Studio'
            },
            body: JSON.stringify(bodyPayload)
        });

        if (!response.ok) {
            const status = response.status;
            const errText = await response.text();
            let parsedMsg = errText;
            try {
                const j = JSON.parse(errText);
                parsedMsg = j.error?.message || errText;
            } catch {}

            if (status === 402) {
                throw new Error('เครดิตในบัญชี OpenRouter หมด (ยอดคงเหลือ 0 USD) กรุณาเติมเครดิตที่ https://openrouter.ai/settings/credits หรือกดใช้ปุ่ม "Gemini (ฟรี)" แทนครับ');
            }
            if (status === 401) {
                throw new Error('OpenRouter API Key ไม่ถูกต้อง กรุณาตรวจสอบ OPENROUTER_API_KEY');
            }
            if (status === 429) {
                throw new Error('การเรียก OpenRouter เกินโควตาชั่วคราว (Rate limit) กรุณารอสักครู่แล้วลองใหม่');
            }
            throw new Error(`OpenRouter Error (${status}): ${parsedMsg}`);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || '';
    }

    // Selected Mode: Gemini Free (Direct Native Google AI Studio Endpoint - High Speed)
    if (!geminiKey) {
        throw new Error('ยังไม่ได้กำหนด GEMINI_API_KEY ในระบบ');
    }

    const candidateModels = Array.from(new Set([
        ...(model ? [model] : []),
        'gemini-2.5-flash',
        'gemini-1.5-flash',
        'gemini-flash-lite-latest',
        'gemini-3.5-flash-lite',
        'gemini-3.8-flash'
    ]));

    const systemInstruction = messages.find(m => m.role === 'system')?.content;
    const contents = messages
        .filter(m => m.role !== 'system')
        .map(m => ({
            role: m.role === 'assistant' ? 'model' : 'user',
            parts: [{ text: m.content }]
        }));

    if (contents.length === 0 && systemInstruction) {
        contents.push({ role: 'user', parts: [{ text: systemInstruction }] });
    }

    const nativeBody: any = {
        contents,
        generationConfig: {
            maxOutputTokens: maxTokens,
            temperature,
            ...(jsonMode ? { responseMimeType: "application/json" } : {})
        }
    };
    if (systemInstruction && contents.length > 0 && contents[0].parts[0].text !== systemInstruction) {
        nativeBody.systemInstruction = { parts: [{ text: systemInstruction }] };
    }

    let lastGeminiError: any = null;

    for (const model of candidateModels) {
        try {
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(nativeBody)
            });

            if (res.status === 503 || res.status === 429) {
                const warnText = await res.text();
                console.warn(`[Gemini Native] Model ${model} is busy (${res.status}), trying next candidate...`);
                lastGeminiError = new Error(`Google Gemini (${model} - ${res.status}): ${warnText}`);
                continue;
            }

            if (!res.ok) {
                const errText = await res.text();
                lastGeminiError = new Error(`Google Gemini API (${model} - ${res.status}): ${errText}`);
                if (res.status === 404) continue;
                throw lastGeminiError;
            }

            const data = await res.json();
            const content = data.candidates?.[0]?.content?.parts?.[0]?.text || '';
            if (content) {
                return content;
            }
        } catch (err: any) {
            console.warn(`[Gemini Native] Attempt on ${model} failed:`, err?.message || err);
            lastGeminiError = err;
        }
    }

    throw lastGeminiError || new Error('Google Gemini API ไม่สามารถให้บริการได้ในขณะนี้ กรุณาลองใหม่อีกครั้ง');
}

export async function callGeminiNative(
    messages: Array<{ role: string; content: string }>,
    modelName: string = 'gemini-2.5-flash',
    jsonMode: boolean = false
): Promise<string> {
    const hasGemini = !!getGeminiApiKey();
    const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
    const provider = hasGemini ? 'gemini' : (hasOpenRouter ? 'openrouter' : 'gemini');

    return executeLLMCompletion({
        messages,
        provider,
        maxTokens: 4000,
        temperature: 0.7,
        jsonMode,
        model: modelName
    });
}




// Ghostwriter Chat - Direct API to OpenRouter with Veteran DNA & Global Context
export async function chatWithGhostwriter(
    message: string,
    chapterContent: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[],
    chapterId?: string,
    provider: 'gemini' | 'openrouter' = 'gemini'
) {
    if (provider === 'gemini' && !getGeminiApiKey()) {
        return { success: false, error: "ยังไม่ได้กำหนด GEMINI_API_KEY ในระบบ" };
    }
    if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
        return { success: false, error: "ยังไม่ได้กำหนด OPENROUTER_API_KEY ในระบบ" };
    }

    try {
        let systemPrompt = MASTER_AUTHOR_PERSONA;

        // If chapterId is provided, enrich context with book title and sibling chapters
        if (chapterId) {
            try {
                const chapRes = await fetchChapterDetails(chapterId);
                if (chapRes.success && chapRes.data) {
                    const currentChap = chapRes.data;
                    let projectTitle = "หนังสือคู่มือปฏิบัติการธุรกิจและไอที";
                    let allChapters: { id: string; chapterNo: number; title: string }[] = [];

                    if (currentChap.projectId) {
                        const [proj, chaps] = await Promise.all([
                            getProject(currentChap.projectId),
                            getChapters(currentChap.projectId)
                        ]);
                        if (proj) projectTitle = proj.title;
                        if (chaps && chaps.length > 0) {
                            allChapters = chaps.map(c => ({ id: c.id, chapterNo: c.chapterNo, title: c.title }));
                        }
                    }

                    systemPrompt = buildGhostwriterSystemPrompt({
                        projectTitle,
                        chapterTitle: currentChap.title,
                        chapterNo: currentChap.chapterNo,
                        allChapters
                    });
                }
            } catch (ctxErr) {
                console.warn("Could not enrich ghostwriter context:", ctxErr);
            }
        }

        const enrichedSystemPrompt = `
${systemPrompt}

เนื้อหาบทปัจจุบันที่กำลังแก้ไข (Reference Content):
---
${chapterContent.substring(0, 7000)}
---

คำสั่งพิเศษสำหรับการตอบ:
1. ตอบเป็นภาษาไทยเสมอ ในฐานะ Senior Consultant & IT/E-commerce Veteran (25 ปี)
2. เมื่อผู้ใช้ขอให้ปรับปรุง, เพิ่มเคส, สอดแทรก War Story หรือสรุป ให้ตอบเสนอเนื้อหาที่มีคุณภาพสูงพร้อมใช้งาน
3. ถ้าเป็นโค้ด HTML หรือบล็อกพิเศษ (เช่น <div class="war-story-box">, <div class="case-study-box">, <div class="key-terms-box">, <div class="action-checklist">) ให้ใส่ใน Markdown code block เพื่อให้ผู้ใช้กด Copy ไปวางในเนื้อหาได้ง่าย
4. อธิบายเหตุผลเบื้องหลังสั้นกระชับว่าส่วนที่เสริมนี้ช่วยแก้ปัญหาหรือเพิ่มคุณค่าอย่างไรตามมุมมอง System Analysis & Direct Marketing
`;

        const messages = [
            { role: 'system', content: enrichedSystemPrompt },
            ...chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
        ];

        const reply = await executeLLMCompletion({
            messages,
            maxTokens: 4000,
            temperature: 0.7,
            provider
        });

        return { success: true, reply: reply || "ไม่สามารถสร้างคำตอบได้" };
    } catch (error: any) {
        console.error("Chat Error:", error);
        return { success: false, error: error.message || "Failed to get response" };
    }
}

// Full Professional Chapter Generator following 7-Pillar Anatomical Framework
export async function generateFullProfessionalChapter(
    chapterId: string, 
    projectId?: string,
    provider: 'gemini' | 'openrouter' = 'gemini'
) {
    if (provider === 'gemini' && !getGeminiApiKey()) {
        return { success: false, error: "ยังไม่ได้กำหนด GEMINI_API_KEY ในระบบ" };
    }
    if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
        return { success: false, error: "ยังไม่ได้กำหนด OPENROUTER_API_KEY ในระบบ" };
    }
    if (!chapterId) return { success: false, error: "Missing Chapter ID" };

    try {
        console.log(`Generating Full Professional Chapter for ${chapterId} using provider: ${provider}...`);

        // 1. Fetch current chapter details
        const chapRes = await fetchChapterDetails(chapterId);
        if (!chapRes.success || !chapRes.data) {
            return { success: false, error: "Chapter not found in Notion" };
        }
        const currentChapter = chapRes.data;
        const effectiveProjectId = projectId || currentChapter.projectId;

        // 2. Fetch Project & Outline Context
        let projectContext: BookProjectContext = {
            title: "คู่มือปฏิบัติการธุรกิจและไอทีฉบับมืออาชีพ",
            targetAudience: "ผู้ประกอบการ, ผู้บริหาร, และผู้พัฒนาระบบ",
            theme: "การวางระบบและการตลาดเชิงกลยุทธ์",
            tone: "Pragmatic Veteran"
        };
        let allChapters: { id: string; chapterNo: number; title: string }[] = [];

        if (effectiveProjectId) {
            const [proj, chaps] = await Promise.all([
                getProject(effectiveProjectId),
                getChapters(effectiveProjectId)
            ]);
            if (proj) {
                projectContext = {
                    title: proj.title,
                    targetAudience: proj.audience || projectContext.targetAudience,
                    theme: proj.theme || projectContext.theme,
                    tone: proj.tone || "Pragmatic Veteran"
                };
            }
            if (chaps && chaps.length > 0) {
                allChapters = chaps.map(c => ({ id: c.id, chapterNo: c.chapterNo, title: c.title }));
            }
        }

        if (allChapters.length === 0) {
            allChapters = [{ id: chapterId, chapterNo: currentChapter.chapterNo, title: currentChapter.title }];
        }

        // 3. Build Prompt with 7 Pillars & Global Context
        const prompt = buildProfessionalChapterPrompt({
            project: projectContext,
            currentChapter: {
                id: chapterId,
                chapterNo: currentChapter.chapterNo,
                title: currentChapter.title,
                existingContent: currentChapter.content
            },
            allChapters
        });

        // 4. Call LLM
        const rawContent = await executeLLMCompletion({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 6000,
            temperature: 0.7,
            provider
        });

        let jsonStr = (rawContent || "{}").trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsed: any = {};
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            parsed = {
                contentHtml: rawContent,
                keyTakeaways: "สรุปประเด็นสำคัญประจำบทเรียบร้อยแล้ว",
                keyTerminology: ""
            };
        }

        const finalContent = sanitizeBookContent(parsed.contentHtml || rawContent);
        const finalTakeaways = sanitizeBookContent(parsed.keyTakeaways || "");
        const finalTerminology = sanitizeBookContent(parsed.keyTerminology || "");

        // 5. Update Local DB
        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({
                ...ch,
                content: finalContent,
                keyTakeaways: finalTakeaways,
                keyTerminology: finalTerminology,
                status: "Reviewing",
                hasContent: true,
            });
        }

        revalidatePath('/writing');
        revalidatePath('/structure');
        revalidatePath('/export');

        return { 
            success: true, 
            data: {
                content: finalContent,
                keyTakeaways: finalTakeaways,
                keyTerminology: parsed.keyTerminology || "",
                crossReferences: parsed.crossReferences || []
            } 
        };

    } catch (error: any) {
        console.error("Generate Full Professional Chapter Error:", error);
        return { success: false, error: error.message || "Failed to generate professional chapter" };
    }
}

export async function generateBriefingSuggestions(
    topic: string, 
    targetAudience: string, 
    tone: string,
    provider: 'gemini' | 'openrouter' = 'gemini',
    chapterCount: number = 7
) {
    if (provider === 'gemini' && !getGeminiApiKey()) {
        return { success: false, error: "ยังไม่ได้กำหนด GEMINI_API_KEY ในระบบ" };
    }
    if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
        return { success: false, error: "ยังไม่ได้กำหนด OPENROUTER_API_KEY ในระบบ" };
    }

    try {
        const count = Math.max(3, Math.min(25, chapterCount || 7));
        const prompt = `คุณคือผู้เชี่ยวชาญการวางกลยุทธ์หนังสือ (Strategic Book Editor)
ช่วยวางแผน Strategic Briefing สำหรับ E-book เล่มนี้:
- ชื่อหนังสือ: "${topic}"
- กลุ่มผู้อ่านเป้าหมาย: "${targetAudience}"
- โทนการเล่า: "${tone}"
- จำนวนบทที่ต้องการ: ${count} บท

จงตอบเป็น JSON object ที่สั้น กระชับ ตรงประเด็น ทรงพลัง:
{
  "painPoints": "- ปัญหา 1\\n- ปัญหา 2\\n- ปัญหา 3",
  "transformation": "การเปลี่ยนแปลงที่ผู้อ่านจะได้รับใน 1-2 ประโยค",
  "coreMessage": "ใจความสำคัญแก่นแท้ของหนังสือ 1 ประโยค",
  "antiGoals": "- สิ่งที่หนังสือเล่มนี้ไม่ได้สอนหรือไม่ใช่เป้าหมาย",
  "roleOfBook": "บทบาทของหนังสือในธุรกิจ (เช่น Lead Magnet, Authority Builder)",
  "draftStructure": "บทที่ 1: ...\\nบทที่ 2: ...\\n... จนครบ ${count} บทพอดี (ต้องเรียงลำดับทีละบรรทัดจนครบ ${count} บท)"
}
ตอบเฉพาะ JSON object เท่านั้น ห้ามใส่คำอธิบายอื่น`;

        const content = await executeLLMCompletion({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: Math.max(1200, count * 150),
            temperature: 0.5,
            provider,
            jsonMode: true
        });

        let jsonStr = (content || "{}").trim();
        // Robust regex extraction for JSON object
        const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            jsonStr = jsonMatch[0];
        }

        const suggestions = JSON.parse(jsonStr);

        return { success: true, data: suggestions };

    } catch (error: any) {
        console.error("Generate Briefing Error:", error);
        return { success: false, error: error.message || "Failed to generate suggestions" };
    }
}

export async function generateChapterStructureOnly(
    topic: string,
    targetAudience: string,
    tone: string,
    chapterCount: number = 7,
    provider: 'gemini' | 'openrouter' = 'gemini'
) {
    if (provider === 'gemini' && !getGeminiApiKey()) {
        return { success: false, error: "ยังไม่ได้กำหนด GEMINI_API_KEY ในระบบ" };
    }
    if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
        return { success: false, error: "ยังไม่ได้กำหนด OPENROUTER_API_KEY ในระบบ" };
    }

    try {
        const count = Math.max(3, Math.min(25, chapterCount || 7));
        const prompt = `คุณคือผู้เชี่ยวชาญการวางโครงสร้างสารบัญหนังสือ (Book Structure Architect)
ช่วยวางแผนโครงสร้างสารบัญสำหรับหนังสือเรื่อง: "${topic}"
- ผู้อ่านเป้าหมาย: "${targetAudience}"
- โทน: "${tone}"
- จำนวนบทที่ต้องการ: ${count} บท

กฎการสร้าง:
1. ออกแบบกระบวนการเรียนรู้แบบมีขั้นมีตอน (Logical Progression / Journey from Pain to Solution & Mastery)
2. เขียนรายชื่อบทเรียงลำดับทีละบรรทัด รูปแบบ:
บทที่ 1: [ชื่อบทและจุดเน้นสำคัญ]
บทที่ 2: [ชื่อบทและจุดเน้นสำคัญ]
...
จนครบ ${count} บทพอดี
3. ห้ามใส่ข้อความเกริ่นนำหรือคำส่งท้าย ส่งเฉพาะรายชื่อบททีละบรรทัดเท่านั้น`;

        const content = await executeLLMCompletion({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: Math.max(1000, count * 120),
            temperature: 0.6,
            provider
        });

        const lines = (content || '').trim();
        return { success: true, draftStructure: lines };
    } catch (error: any) {
        console.error("Generate Chapter Structure Error:", error);
        return { success: false, error: error.message || "Failed to generate structure" };
    }
}

export async function refreshChapters(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        const rawChapters = await getChapters(projectId);

        // Mapping Notion Status (English) -> UI Status (Thai) - Imported from constants

        const chapters = rawChapters.map((c: any) => ({
            ...c,
            statusDisplay: statusMapping[c.status] || c.status
        }));

        return { success: true, data: chapters };
    } catch (error) {
        console.error("Refresh Chapters Error:", error);
        return { success: false, error };
    }
}

export async function resetChapterStatus(chapterId: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };

    try {
        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({
                ...ch,
                status: "To Do",
            });
        }
        revalidatePath('/structure');
        return { success: true };
    } catch (error: any) {
        console.error("Reset Chapter Status Error:", error);
        return { success: false, error: error?.message || error };
    }
}

export async function typesetChapterContent(params: {
    chapterId: string;
    rawContent: string;
    chapterTitle?: string;
    provider?: 'gemini' | 'openrouter';
}) {
    const { chapterId, rawContent, chapterTitle = '', provider = 'gemini' } = params;
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };
    if (!rawContent || !rawContent.trim()) return { success: false, error: "ไม่มีเนื้อหาให้จัดหน้า" };

    try {
        const prompt = `คุณคือ Master Book Typesetter & Executive Editor มืออาชีพ

หน้าที่สำคัญที่สุด:
คุณได้รับ "เนื้อหาดิบ" สำหรับบท "${chapterTitle}" ซึ่งผู้เขียนอาจพิมพ์ต่อเนื่องกันมา หรือคัดลอกจากภายนอกโดยยังไม่ได้จัดย่อหน้า
จงนำเนื้อหาทั้งหมดนี้มาจัดหน้าเป็นบทหนังสือระดับ Best-Seller คุณภาพสูง โดยปฏิบัติตามกฎเหล็ก:

1. **ห้ามตัดทอนเนื้อหาสาระสำคัญทิ้งเด็ดขาด (100% Content Preservation):**
   - รักษาประโยค ใจความ และสำนวนเดิมของผู้เขียนไว้ให้ครบถ้วนสมบูรณ์ ห้ามแต่งเรื่องใหม่ หรือตัดทอนทิ้ง

2. **แบ่งย่อหน้าและจัดโครงสร้างให้อ่านง่าย สบายตา สไตล์หนังสือเล่มจริง:**
   - ใส่หัวข้อหลัก (##) และหัวข้อย่อย (###) ให้ชัดเจนตามจังหวะเนื้อหา
   - แยกข้อความที่ติดกันเป็นพืด ให้กลายเป็นย่อหน้าที่สวยงาม สมดุล (แต่ละย่อหน้าเว้นวรรคด้วยบรรทัดว่าง 2 บรรทัด)
   - หากมีรายการ ขั้นตอน เวิร์กโฟลว์ หรือ Before vs After ให้จัดเป็น Bullet Points (- หรือ 1.) ที่อ่านง่าย

3. **ตรวจจับและสอดแทรก Semantic Callout Boxes ให้ดูพรีเมียม (ถ้าเนื้อหาสอดคล้อง):**
   - เรื่องเล่า ประสบการณ์จริง หรือบทเรียนราคาแพง ให้ครอบด้วย:
     <div class="war-story-box" data-title="ประสบการณ์จริงจากสนามรบ">
     ...เนื้อหาเรื่องเล่า...
     </div>
   - เคสตัวอย่าง ธุรกิจจริง สถิติ หรือ Before vs After ให้ครอบด้วย:
     <div class="case-study-box" data-title="กรณีศึกษาและงานวิจัยรองรับ">
     ...เนื้อหาเคสศึกษา...
     </div>
   - นิยามคำศัพท์สำคัญประจำบท ให้ครอบด้วย:
     <div class="key-terms-box" data-title="คลังคำศัพท์สำคัญประจำบท">
     ...คำศัพท์และนิยาม...
     </div>
   - เช็กลิสต์ปฏิบัติการ แบบฝึกหัด หรือสิ่งที่ต้องลงมือทำ ให้ครอบด้วย:
     <div class="action-checklist" data-title="เช็กลิสต์ปฏิบัติการทันที (Action Items)">
     ...รายการสิ่งที่ต้องทำ...
     </div>

4. **สรุปท้ายบท:**
   - จัดทำข้อสรุป 3-5 ข้อสำหรับ Key Takeaways ท้ายบท
   - คัดคำศัพท์เด่น 2-4 คำสำหรับ Key Terminology

เนื้อหาดิบของผู้เขียน:
---
${rawContent}
---

รูปแบบผลลัพธ์ (ส่งคืนเป็น JSON Object เท่านั้น ห้ามมีข้อความอื่นนอก JSON):
{
  "formattedContent": "เนื้อหาทั้งหมดที่จัดรูปแบบด้วย Markdown ผสม Custom HTML Boxes เรียบร้อยแล้ว",
  "keyTakeaways": "สรุปประเด็นสำคัญ 3-5 ข้อสำหรับกล่อง Key Takeaways ท้ายบท",
  "keyTerminology": "คำศัพท์สำคัญพร้อมคำอธิบายสั้นๆ"
}
`;

        const responseText = await executeLLMCompletion({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 6000,
            temperature: 0.3,
            provider
        });

        let jsonStr = (responseText || "{}").trim();
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
        }

        let parsed: any = {};
        try {
            parsed = JSON.parse(jsonStr);
        } catch (e) {
            parsed = {
                formattedContent: responseText,
                keyTakeaways: "",
                keyTerminology: ""
            };
        }

        const finalContent = sanitizeBookContent(parsed.formattedContent || responseText);
        const finalTakeaways = sanitizeBookContent(parsed.keyTakeaways || "");
        const finalTerminology = sanitizeBookContent(parsed.keyTerminology || "");

        const ch = await localDb.getChapter(chapterId);
        if (ch) {
            await localDb.saveChapter({
                ...ch,
                content: finalContent,
                keyTakeaways: finalTakeaways,
                keyTerminology: finalTerminology,
                status: "Reviewing",
                hasContent: true,
            });
        }

        revalidatePath('/writing');
        revalidatePath('/structure');
        revalidatePath('/export');

        return {
            success: true,
            data: {
                content: finalContent,
                keyTakeaways: finalTakeaways,
                keyTerminology: finalTerminology
            }
        };

    } catch (error: any) {
        console.error("Typeset Chapter Content Error:", error);
        return { success: false, error: error?.message || "เกิดข้อผิดพลาดในการจัดหน้า" };
    }
}
