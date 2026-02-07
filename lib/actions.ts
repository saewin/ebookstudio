'use server'

import { Client } from '@notionhq/client'
import { revalidatePath } from 'next/cache'
import { getChapters, notionQuery } from '@/lib/notion'

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
})

const SERIES_DB_ID = '2e9e19eb-e8da-807f-9fbd-ec5224452851';
const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;

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
                parent: { database_id: CHAPTERS_DB_ID },
                properties: {
                    "Chapter Title": {
                        title: [{ text: { content: title } }],
                    },
                    "Chapter No.": {
                        number: index + 1,
                    },

                    "Wang-Aksorn Series": {
                        relation: [{ id: projectId }]
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
    if (!CHAPTERS_DB_ID || !projectId) return { success: false, error: "Missing Config" };

    try {
        console.log(`Creating Chapter "${title}" for Project ${projectId}`);
        await notion.pages.create({
            parent: { database_id: CHAPTERS_DB_ID },
            properties: {
                "Chapter Title": {
                    title: [{ text: { content: title } }],
                },
                "Chapter No.": {
                    number: chapterNo,
                },
                "Status": {
                    select: { name: "Drafting" }
                },
                "Wang-Aksorn Series": {
                    relation: [
                        { id: projectId }
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

export async function triggerGhostwriter(chapterId: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };

    try {
        console.log(`Triggering Ghostwriter for Chapter ${chapterId}`);

        // Step 1: Update Notion Status to Drafting
        await notion.pages.update({
            page_id: chapterId,
            properties: {
                "Status": {
                    select: { name: "Drafting" }
                }
            }
        });

        // Step 2: Trigger n8n Webhook (Agent B)
        const webhookUrl = process.env.N8N_GHOSTWRITER_WEBHOOK || 'https://flow.supralawyer.com/webhook/ghostwriter';
        try {
            await fetch(webhookUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ chapterId })
            });
            console.log(`Webhook triggered: ${webhookUrl}`);
        } catch (webhookError) {
            console.error("Webhook Error (non-blocking):", webhookError);
            // Don't fail the whole operation if webhook fails
        }

        revalidatePath('/structure');
        return { success: true };
    } catch (error) {
        console.error("Trigger Ghostwriter Error:", error);
        return { success: false, error };
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
        const webhookUrl = process.env.N8N_BOOK_BINDER_WEBHOOK || 'https://flow.supralawyer.com/webhook/book-binder';

        // Wait for response to get the Google Doc URL
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

    } catch (error) {
        console.error("Trigger Book Binder Error:", error);
        return { success: false, error };
    }
}

// ... existing code

export async function fetchChapterDetails(chapterId: string) {
    if (!chapterId) return { success: false, error: "No Chapter ID provided" };

    try {
        const response = await notion.pages.retrieve({ page_id: chapterId }) as any;
        const props = response.properties;
        const title = props['Chapter Title']?.title[0]?.plain_text || 'Untitled';
        const richText = props['Content(HTML)']?.rich_text || [];
        const content = richText.map((t: any) => t.plain_text).join('');
        const chapterNo = props['Chapter No.']?.number || 0;

        return { success: true, data: { title, content, chapterNo } };
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

        const chapters = await Promise.all(response.results.map(async (page: any) => {
            const props = page.properties;
            const title = props['Chapter Title']?.title[0]?.plain_text || 'Untitled';
            const chapterNo = props['Chapter No.']?.number || 0;

            // For export, we need the full content.
            const richText = props['Content(HTML)']?.rich_text || [];
            const content = richText.map((t: any) => t.plain_text).join('');

            return { id: page.id, title, chapterNo, content };
        }));

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

// Ghostwriter Chat - Direct API to OpenRouter
export async function chatWithGhostwriter(
    message: string,
    chapterContent: string,
    chatHistory: { role: 'user' | 'assistant', content: string }[],
    chapterId?: string
) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        return { success: false, error: "OpenRouter API Key not configured" };
    }

    try {
        const systemPrompt = `คุณคือ "ผู้ช่วยนักเขียน (Ghostwriter)"
หน้าที่: ช่วยผู้ใช้เขียน ปรับปรุง หรือแก้ไขเนื้อหาในบทหนังสือ
บริบท:
- ผู้ใช้กำลังเขียนเรื่องราวใน Editor
- คุณต้องตอบเป็นภาษาไทยเสมอ
- สไตล์การตอบ: เป็นกันเอง มืออาชีพ สั้นกระชับ

เนื้อหาบทปัจจุบัน (Reference):
---
${chapterContent.substring(0, 5000)}
---

คำสั่งพิเศษ:
ถ้าผู้ใช้สั่งให้ "แก้" "เขียนเพิ่ม" "ปรับปรุง" หรือ "เปลี่ยน" เนื้อหา:
1. ให้เสนอเนื้อหาใหม่เฉพาะส่วนที่ต้องแก้
2. ไม่ต้องส่งเนื้อหาทั้งบทมา (เพื่อประหยัด Token)
3. ให้ผู้ใช้ Copy ไปวางเอง
4. ถ้าเป็นโค้ด HTML ให้ใส่ Code Block เพื่อให้ Copy ง่ายๆ
`;

        const messages = [
            { role: 'system', content: systemPrompt },
            ...chatHistory.map(m => ({ role: m.role, content: m.content })),
            { role: 'user', content: message }
        ];

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ebook-creator.studio',
                'X-Title': 'Ebook Creator Studio'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: messages,
                max_tokens: 4000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error("OpenRouter Error:", errorText);
            return { success: false, error: "AI service error" };
        }

        const data = await response.json();
        const reply = data.choices?.[0]?.message?.content || "ไม่สามารถสร้างคำตอบได้";

        return { success: true, reply };
    } catch (error) {
        console.error("Chat Error:", error);
        return { success: false, error: "Failed to get response" };
    }
}

export async function generateBriefingSuggestions(topic: string, targetAudience: string, tone: string) {
    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) return { success: false, error: "OpenRouter API Key not configured" };

    try {
        const prompt = `
Context: You are an expert book editor and strategist helping a user plan a non-fiction book (E-book).
Task: Based on the "Working Title/Topic" and "Target Reader" provided, generate high-quality strategic content for the book briefing.
Language: Thai (ภาษาไทย) ONLY.

Input:
- Working Title/Topic: "${topic}"
- Target Reader: "${targetAudience}"
- Desired Tone: "${tone}"

Output: Provide a JSON object with the following fields:
1. "painPoints": (String) 3-5 key problems the reader is facing (bullet points).
2. "transformation": (String) How the reader's life/business will change after reading.
3. "coreMessage": (String) The one single message/takeaway of the book.
4. "antiGoals": (String) What this book is NOT about (to avoid scope creep).
5. "roleOfBook": (String) The role of this book in the author's business (e.g., Lead Magnet, Authority Builder).
6. "draftStructure": (String) A rough list of 5-10 chapter titles.

Make the content compelling, professional, and marketable.
Return ONLY the JSON object, no markdown formatting.
`;

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${apiKey}`,
                'Content-Type': 'application/json',
                'HTTP-Referer': 'https://ebook-creator.studio',
                'X-Title': 'Ebook Creator Studio'
            },
            body: JSON.stringify({
                model: 'google/gemini-2.0-flash-001',
                messages: [
                    { role: 'user', content: prompt }
                ],
                max_tokens: 2000,
                temperature: 0.7
            })
        });

        if (!response.ok) {
            throw new Error(`OpenRouter API Error: ${response.statusText}`);
        }

        const data = await response.json();
        const content = data.choices?.[0]?.message?.content || "{}";

        let jsonStr = content.trim();
        // Remove markdown code blocks if present
        if (jsonStr.startsWith('```json')) {
            jsonStr = jsonStr.replace(/^```json/, '').replace(/```$/, '');
        } else if (jsonStr.startsWith('```')) {
            jsonStr = jsonStr.replace(/^```/, '').replace(/```$/, '');
        }

        const suggestions = JSON.parse(jsonStr);

        return { success: true, data: suggestions };

    } catch (error) {
        console.error("Generate Briefing Error:", error);
        return { success: false, error: "Failed to generate suggestions" };
    }
}
