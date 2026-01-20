'use server'

import { Client } from '@notionhq/client'
import { revalidatePath } from 'next/cache'

const notion = new Client({
    auth: process.env.NOTION_API_KEY,
})

const SERIES_DB_ID = '2e9e19eb-e8da-807f-9fbd-ec5224452851';
const CHAPTERS_DB_ID = process.env.NOTION_DATABASE_ID;

export async function createBriefing(projectName: string, persona: string, tone: string, goal: string) {
    if (!SERIES_DB_ID) throw new Error("Series DB ID not configured");

    try {
        const response = await notion.pages.create({
            parent: { database_id: SERIES_DB_ID },
            properties: {
                "Book Title": {
                    title: [{ text: { content: projectName } }],
                },
                "Theme/Topic": {
                    rich_text: [{ text: { content: goal } }], // Mapping 'Goal' to Theme for now, or add description
                },
                "Target audience": {
                    rich_text: [{ text: { content: persona } }],
                },
                "Tone Of Voice": {
                    select: { name: tone }
                },
                "Status": {
                    select: { name: "Idea" } // Default status
                }
            },
        })
        revalidatePath('/briefing')
        return { success: true, id: response.id }
    } catch (error) {
        console.error("Notion Create Error:", error)
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
                    select: { name: "Drafting" } // or "To Do"
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

import { notionQuery } from './notion';

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
ถ้าผู้ใช้สั่งให้ "แก้" "เขียนเพิ่ม" "ปรับปรุง" หรือ "เปลี่ยน" เนื้อหาในบท:
1. ให้คุณเขียนเนื้อหา *ใหม่ทั้งหมด* หรือ *เฉพาะส่วนที่แก้* (แล้วแต่ความเหมาะสม)
2. ห้ามตอบแค่ว่า "ได้ครับ" แต่ต้องส่งเนื้อหาที่แก้แล้วมาด้วย
3. ถ้าจะอัพเดทเนื้อหาจริง ให้ครอบเนื้อหาใหม่ด้วย tag นี้:
<UPDATE_CONTENT>
...เนื้อหา HTML ที่แก้แล้ว...
</UPDATE_CONTENT>

(ให้ส่งมาเฉพาะ HTML content ไม่เอา markdown backticks)
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
        let reply = data.choices?.[0]?.message?.content || "ไม่สามารถสร้างคำตอบได้";

        // Check for Update Tags
        const updateMatch = reply.match(/<UPDATE_CONTENT>([\s\S]*?)<\/UPDATE_CONTENT>/);
        if (updateMatch && chapterId) {
            const newContent = updateMatch[1].trim();
            console.log(`Auto-updating content for Chapter ${chapterId}`);

            // Call update function
            await updateChapterContent(chapterId, newContent);

            // Remove tags from reply to show user
            reply = reply.replace(/<UPDATE_CONTENT>[\s\S]*?<\/UPDATE_CONTENT>/, "\n\n✅ *อัพเดทเนื้อหาเรียบร้อยแล้วครับ!*");
        }

        return { success: true, reply };
    } catch (error) {
        console.error("Chat Error:", error);
        return { success: false, error: "Failed to get response" };
    }
}
