'use server'

import { Client } from '@notionhq/client'
import { revalidatePath } from 'next/cache'
import { getChapters, getProject, notionQuery } from '@/lib/notion'
import { 
    MASTER_AUTHOR_PERSONA, 
    buildProfessionalChapterPrompt, 
    buildGhostwriterSystemPrompt, 
    BookProjectContext 
} from '@/lib/prompts/authorPersona'

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
})

import { CHAPTERS_DB_ID, SERIES_DB_ID, statusMapping } from './constants';

function getGeminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
}

// function bulkCreateChapters at line 14
export async function bulkCreateChapters(projectId: string, chapterTitles: string[]) {
    if (!CHAPTERS_DB_ID) return { success: false, error: "Chapters DB ID not configured" };
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        // Safety Check: Check if chapters already exist to avoid duplicates (e.g. from N8N race condition)
        // We do a quick query.
        // Safety Check: Check if chapters already exist to avoid duplicates
        // We do a quick query using notionQuery helper
        const existingChapters = await notionQuery(CHAPTERS_DB_ID, {
            property: 'Wang-Aksorn Series',
            relation: { contains: projectId }
        });

        if (existingChapters.results.length > 0) {
            console.warn(`Chapters already exist for project ${projectId}. Skipping bulk creation to prevent duplicates.`);
            return { success: false, error: "Chapters already exist" };
        }

        console.log(`Bulk creating ${chapterTitles.length} chapters for project ${projectId}...`);

        // Create all chapters in parallel
        await Promise.all(chapterTitles.map((title, index) =>
            notion.pages.create({
                parent: { database_id: CHAPTERS_DB_ID! },
                properties: {
                    "Chapter Title": {
                        title: [{ text: { content: title } }],
                    },
                    "Chapter No.": {
                        number: index + 1,
                    },

                    "Wang-Aksorn Series": {
                        relation: [{ id: projectId }]
                    },
                    "Status": {
                        select: { name: "To Do" }
                    }
                },
            })
        ));

        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Bulk Create Error:", error);
        return { success: false, error };
    }
}

export async function createBriefing(projectName: string, persona: string, tone: string, goal: string, extraInfo?: any) {
    if (!SERIES_DB_ID) throw new Error("Series DB ID not configured");

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

        const response = await notion.pages.create({
            parent: { database_id: SERIES_DB_ID },
            properties: {
                "Book Title": {
                    title: [{ text: { content: projectName } }],
                },
                "Theme/Topic": {
                    rich_text: [{ text: { content: fullDescription.substring(0, 2000) } }],
                },
                "Target audience": {
                    rich_text: [{ text: { content: persona } }],
                },
                "Tone Of Voice": {
                    select: { name: tone }
                },
                "Status": {
                    select: { name: "Idea" }
                }
            },
        })

        // If Draft Structure exists, create chapters immediately!
        if (extraInfo?.draftStructure) {
            const lines = extraInfo.draftStructure.split('\n')
                .map((l: string) => l.trim())
                .filter((l: string) => l.length > 0 && !l.startsWith('==='))
                .map((l: string) => l.replace(/^[-*•\d\.]+\s+/, '').replace(/^[-*•]\s*/, '')); // Clean leading bullets

            if (lines.length > 0) {
                console.log(`[createBriefing] Auto-creating ${lines.length} chapters for new project ${response.id}`);
                const bulkResult = await bulkCreateChapters(response.id, lines);
                if (!bulkResult.success) {
                    console.warn(`[createBriefing] Chapters skipped (likely already exist): ${bulkResult.error}`);
                }
            }
        }

        revalidatePath('/briefing')
        return { success: true, id: response.id }
    } catch (error) {
        console.error("Notion Create Error:", error)
        return { success: false, error }
    }
}

export async function deleteProject(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" }

    try {
        console.log(`Deleting Project ${projectId} and its chapters...`);

        // 1. Fetch all chapters associated with this project
        const chapters = await getChapters(projectId);

        // 2. Archive all chapters (Cascade Delete)
        if (chapters.length > 0) {
            console.log(`Archiving ${chapters.length} chapters...`);
            await Promise.all(chapters.map(chapter =>
                notion.pages.update({ page_id: chapter.id, archived: true })
            ));
        }

        // 3. Archive the project itself
        await notion.pages.update({
            page_id: projectId,
            archived: true,
        });

        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Delete Project Error:", error);
        return { success: false, error };
    }
}

// function reorderChapters implementation

export async function reorderChapters(orderedIds: string[]) {
    if (!orderedIds || orderedIds.length === 0) return { success: false, error: "No IDs provided" }

    try {
        // We need to update each chapter's "Chapter No." based on its index + 1
        // Notion API has rate limits (3 requests per second on average), so we should be careful.
        // We can use Promise.all but with a small delay or concurrency limit if list is long.
        // For < 20 chapters, Promise.all is probably fine.

        const updates = orderedIds.map((id, index) => {
            return notion.pages.update({
                page_id: id,
                properties: {
                    "Chapter No.": {
                        number: index + 1
                    }
                }
            })
        })

        await Promise.all(updates)
        revalidatePath('/structure')
        return { success: true }
    } catch (error) {
        console.error("Reorder Chapters Error:", error);
        return { success: false, error }
    }
}

export async function deleteChapter(chapterId: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID" }
    try {
        await notion.pages.update({ page_id: chapterId, archived: true })
        revalidatePath('/structure')
        return { success: true }
    } catch (error) {
        console.error("Delete Chapter Error:", error);
        return { success: false, error }
    }
}

export async function renameChapter(chapterId: string, newTitle: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID" }
    try {
        await notion.pages.update({
            page_id: chapterId,
            properties: { "Chapter Title": { title: [{ text: { content: newTitle } }] } }
        })
        revalidatePath('/structure')
        return { success: true }
    } catch (error) {
        console.error("Rename Chapter Error:", error);
        return { success: false, error }
    }
}

export async function renameProject(projectId: string, newTitle: string) {
    if (!projectId) return { success: false, error: "No Project ID" }
    try {
        await notion.pages.update({
            page_id: projectId,
            properties: { "Book Title": { title: [{ text: { content: newTitle } }] } }
        })
        revalidatePath('/structure')
        return { success: true }
    } catch (error) {
        console.error("Rename Project Error:", error);
        return { success: false, error }
    }
}

export async function triggerExport(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" }

    try {
        await notion.pages.update({
            page_id: projectId,
            properties: {
                "Status": {
                    select: { name: "Publish" }
                }
            }
        });
        revalidatePath('/export');
        return { success: true };
    } catch (error) {
        console.error("Export Trigger Error:", error);
        return { success: false, error };
    }
}

export async function createChapter(projectId: string, title: string, chapterNo: number) {
    if (!CHAPTERS_DB_ID) return { success: false, error: "Missing Notion Config" };
    if (!projectId) return { success: false, error: "Missing Project ID (Series Linkage)" };

    try {
        // 1. DUPLICATE CHECK: Ensure this chapter number doesn't already exist for this project
        const existing = await notionQuery(CHAPTERS_DB_ID, {
            and: [
                {
                    property: 'Wang-Aksorn Series',
                    relation: { contains: projectId }
                },
                {
                    property: 'Chapter No.',
                    number: { equals: chapterNo }
                }
            ]
        });

        if (existing.results.length > 0) {
            console.warn(`Chapter ${chapterNo} already exists for project ${projectId}. Skipping creation.`);
            return { success: false, error: `Chapter ${chapterNo} already exists.` };
        }

        console.log(`Creating Chapter "${title}" for Project ${projectId}`);

        // 2. SERIES LINKAGE: Create with explicit relation
        await notion.pages.create({
            parent: { database_id: CHAPTERS_DB_ID! },
            properties: {
                "Chapter Title": {
                    title: [{ text: { content: title } }],
                },
                "Chapter No.": {
                    number: chapterNo,
                },
                "Status": {
                    select: { name: "To Do" }
                },
                "Wang-Aksorn Series": {
                    relation: [
                        { id: projectId } // Explicitly linking to the Series
                    ]
                }
            },
        });
        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Create Chapter Error:", error);
        return { success: false, error };
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

        // Step 1: Update Notion Status to Drafting
        await notion.pages.update({
            page_id: chapterId,
            properties: {
                "Status": {
                    select: { name: "Drafting" }
                }
            }
        });

        // Step 2: Directly execute full professional chapter generation
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
        await notion.pages.update({
            page_id: chapterId,
            properties: {
                "Chapter Title": {
                    title: [{ text: { content: newTitle } }],
                },
            },
        });
        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Update Title Error:", error);
        return { success: false, error };
    }
}

export async function updateChapterNumber(chapterId: string, newNumber: number) {
    if (!chapterId || newNumber === undefined) return { success: false, error: "Missing ID or Number" };

    try {
        await notion.pages.update({
            page_id: chapterId,
            properties: {
                "Chapter No.": {
                    number: newNumber,
                },
            },
        });
        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Update Number Error:", error);
        return { success: false, error };
    }
}

export async function triggerAgentA(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        await notion.pages.update({
            page_id: projectId,
            properties: {
                "Status": {
                    select: { name: "Generating Content" }
                }
            }
        });
        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Trigger Agent A Error:", error);
        return { success: false, error };
    }
}

export async function triggerBookBinder(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        let webhookUrl = process.env.N8N_BOOK_BINDER_WEBHOOK || '';

        // If the URL is missing or looks like a placeholder, use the hardcoded fallback
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

// ... existing code

export async function fetchChapterDetails(chapterId: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };

    try {
        const response = await notion.pages.retrieve({ page_id: chapterId }) as any;
        const props = response.properties;
        const title = props['Chapter Title']?.title?.[0]?.plain_text || 'Untitled';
        const richText = props['Content(HTML)']?.rich_text || [];
        const content = richText.map((t: any) => t.plain_text).join('');
        const chapterNo = props['Chapter No.']?.number || 0;
        const keyTakeaways = props['Key Takeaways']?.rich_text?.[0]?.plain_text || '';
        const keyTerminology = props['Key Terminology']?.rich_text?.[0]?.plain_text || '';
        const seriesRelation = props['Wang-Aksorn Series']?.relation || [];
        const projectId = seriesRelation[0]?.id || '';

        return { 
            success: true, 
            data: { 
                id: chapterId,
                title, 
                content, 
                chapterNo, 
                keyTakeaways, 
                keyTerminology, 
                projectId 
            } 
        };
    } catch (error) {
        console.error("Fetch Chapter Details Error:", error);
        return { success: false, error };
    }
}



export async function fetchAllProjectChapters(projectId: string) {
    if (!projectId) return { success: false, error: "No Project ID provided" };

    try {
        const response = await notionQuery(CHAPTERS_DB_ID!, {
            property: 'Wang-Aksorn Series',
            relation: {
                contains: projectId,
            },
        }, [
            {
                property: 'Chapter No.',
                direction: 'ascending',
            },
        ]);

        const chapters = response.results.map((page: any) => {
            const props = page.properties;
            const title = props['Chapter Title']?.title?.[0]?.plain_text || 'Untitled';
            const chapterNo = props['Chapter No.']?.number || 0;

            // For export, we need the full content.
            const richText = props['Content(HTML)']?.rich_text || [];
            const content = richText.map((t: any) => t.plain_text).join('');

            const image1Url = props['Image 1 URL']?.rich_text?.[0]?.plain_text || '';
            const image2Url = props['Image 2 URL']?.rich_text?.[0]?.plain_text || '';
            const image3Url = props['Image 3 URL']?.rich_text?.[0]?.plain_text || '';
            const imagePrompt = props['Image Prompt']?.rich_text?.[0]?.plain_text || props['Image_Prompt_1']?.rich_text?.[0]?.plain_text || '';
            const chapterImageFiles = props['Chapter Image']?.files || [];
            const chapterImage = chapterImageFiles[0]?.file?.url || chapterImageFiles[0]?.external?.url || '';
            const keyTakeaways = props['Key Takeaways']?.rich_text?.[0]?.plain_text || '';
            const keyTerminology = props['Key Terminology']?.rich_text?.[0]?.plain_text || '';

            return {
                id: page.id,
                title,
                chapterNo,
                content,
                image1Url,
                image2Url,
                image3Url,
                imagePrompt,
                chapterImage,
                keyTakeaways,
                keyTerminology,
            };
        });

        return { success: true, data: chapters };
    } catch (error) {
        console.error("Fetch All Chapters Error:", error);
        return { success: false, error };
    }
}

// ... existing code

// ... existing code

export async function updateChapterContent(chapterId: string, newContent: string) {
    if (!chapterId || !newContent) return { success: false, error: "Missing ID or Content" };

    try {
        // Build Notion blocks from HTML is complex, but for now we are using a single text property "Content(HTML)"
        // Note: Notion text limits are 2000 chars per block, but rich_text property is different.
        // We will split content into chunks of 2000 characters to be safe for rich_text array.

        const chunks = [];
        for (let i = 0; i < newContent.length; i += 2000) {
            chunks.push({
                text: { content: newContent.substring(i, i + 2000) }
            });
        }

        await notion.pages.update({
            page_id: chapterId,
            properties: {
                "Content(HTML)": {
                    rich_text: chunks
                },
            },
        });
        revalidatePath('/writing'); // Revalidate the writing page
        return { success: true };
    } catch (error) {
        console.error("Update Content Error:", error);
        return { success: false, error };
    }
}

// Unified LLM caller supporting both Google Gemini API (Free tier from Google AI Studio) and OpenRouter
async function executeLLMCompletion({
    messages,
    maxTokens = 3000,
    temperature = 0.7,
    provider = 'gemini',
    jsonMode = false,
}: {
    messages: Array<{ role: string; content: string }>;
    maxTokens?: number;
    temperature?: number;
    provider?: 'gemini' | 'openrouter';
    jsonMode?: boolean;
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

    const candidateModels = [
        'gemini-3.5-flash-lite',
        'gemini-flash-lite-latest',
        'gemini-3.8-flash'
    ];

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

        const finalContent = parsed.contentHtml || rawContent;
        const finalTakeaways = parsed.keyTakeaways || "";

        // Helper chunk for Notion rich_text 2000 char limit
        const chunkText = (str: string) => {
            const arr = [];
            for (let i = 0; i < str.length; i += 1900) {
                arr.push({ text: { content: str.substring(i, i + 1900) } });
            }
            return arr;
        };

        // 5. Update Notion
        await notion.pages.update({
            page_id: chapterId,
            properties: {
                "Content(HTML)": {
                    rich_text: chunkText(finalContent)
                },
                "Key Takeaways": {
                    rich_text: chunkText(finalTakeaways)
                },
                "Status": {
                    select: { name: "Reviewing" }
                }
            }
        });

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
    provider: 'gemini' | 'openrouter' = 'gemini'
) {
    if (provider === 'gemini' && !getGeminiApiKey()) {
        return { success: false, error: "ยังไม่ได้กำหนด GEMINI_API_KEY ในระบบ" };
    }
    if (provider === 'openrouter' && !process.env.OPENROUTER_API_KEY) {
        return { success: false, error: "ยังไม่ได้กำหนด OPENROUTER_API_KEY ในระบบ" };
    }

    try {
        const prompt = `คุณคือผู้เชี่ยวชาญการวางกลยุทธ์หนังสือ (Strategic Book Editor)
ช่วยวางแผน Strategic Briefing สำหรับ E-book เล่มนี้:
- ชื่อหนังสือ: "${topic}"
- กลุ่มผู้อ่านเป้าหมาย: "${targetAudience}"
- โทนการเล่า: "${tone}"

จงตอบเป็น JSON object ที่สั้น กระชับ ตรงประเด็น ทรงพลัง (ความยาวรวมไม่เกิน 400 คำ เพื่อความรวดเร็วและชัดเจน):
{
  "painPoints": "- ปัญหา 1\\n- ปัญหา 2\\n- ปัญหา 3",
  "transformation": "การเปลี่ยนแปลงที่ผู้อ่านจะได้รับใน 1-2 ประโยค",
  "coreMessage": "ใจความสำคัญแก่นแท้ของหนังสือ 1 ประโยค",
  "antiGoals": "- สิ่งที่หนังสือเล่มนี้ไม่ได้สอนหรือไม่ใช่เป้าหมาย",
  "roleOfBook": "บทบาทของหนังสือในธุรกิจ (เช่น Lead Magnet, Authority Builder)",
  "draftStructure": "บทที่ 1: ...\\nบทที่ 2: ...\\nบทที่ 3: ...\\nบทที่ 4: ...\\nบทที่ 5: ..."
}
ตอบเฉพาะ JSON object เท่านั้น ห้ามใส่คำอธิบายอื่น`;

        const content = await executeLLMCompletion({
            messages: [{ role: 'user', content: prompt }],
            maxTokens: 1000,
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
        await notion.pages.update({
            page_id: chapterId,
            properties: {
                "Status": {
                    select: { name: "To Do" }
                }
            }
        });
        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Reset Chapter Status Error:", error);
        return { success: false, error };
    }
}
