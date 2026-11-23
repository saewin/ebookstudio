import { NextRequest, NextResponse } from 'next/server';
import { uploadBookAsset } from '@/lib/storage';
import * as localDb from '@/lib/localDb';

export const dynamic = 'force-dynamic';

type StylePreset = 'executive' | 'editorial' | 'minimal' | 'tech';

const STYLE_DIRECTIVES: Record<StylePreset, string> = {
    executive:
        'Clean modern editorial business illustration aesthetic, deep navy blue (#0f172a) and warm gold amber accents on crisp light studio background, vector-clean corporate publishing art direction, zero blurry artifacts.',
    editorial:
        'Modern luxury book illustration, warm ivory and slate contrast, magazine editorial artwork, crisp clean geometric lines.',
    minimal:
        'Minimalist Scandinavian business line-art & soft duotone vector illustration, emerald and slate accents on white paper background.',
    tech:
        'Sleek enterprise AI architecture isometric illustration, indigo and cyan luminous accents on clean deep navy canvas, crisp precision aesthetic.',
};

async function generateWithGeminiImageApi(
    apiKey: string,
    fullPrompt: string,
    aspectRatio: string
): Promise<{ buffer: Buffer; mimeType: string; modelUsed: string }> {
    // 1. Primary: Google Gemini 2.5 Flash Image (generativelanguage.googleapis.com)
    const geminiModels = ['gemini-2.5-flash-image', 'gemini-2.0-flash-exp-image-generation'];
    const errors: string[] = [];

    for (const model of geminiModels) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: fullPrompt }] }],
                    generationConfig: {
                        responseModalities: ['IMAGE'],
                        imageConfig: { aspectRatio },
                    },
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                errors.push(`${model}: HTTP ${res.status} - ${errText.slice(0, 220)}`);
                continue;
            }

            const data = await res.json();
            const parts = data?.candidates?.[0]?.content?.parts || [];
            for (const part of parts) {
                const inlineData = part.inlineData || part.inline_data;
                if (inlineData?.data) {
                    const mimeType = inlineData.mimeType || inlineData.mime_type || 'image/png';
                    const buffer = Buffer.from(inlineData.data, 'base64');
                    return { buffer, mimeType, modelUsed: model };
                }
            }
            errors.push(`${model}: No image data returned in candidates`);
        } catch (err: any) {
            errors.push(`${model}: ${err?.message || String(err)}`);
        }
    }

    // 2. Fallback: Google Imagen 3.0 Predict API
    const imagenModels = ['imagen-3.0-generate-002', 'imagen-3.0-fast-generate-001'];
    for (const model of imagenModels) {
        try {
            const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:predict?key=${encodeURIComponent(apiKey)}`;
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    instances: [{ prompt: fullPrompt }],
                    parameters: {
                        sampleCount: 1,
                        aspectRatio: aspectRatio === '16:9' || aspectRatio === '3:4' || aspectRatio === '4:3' || aspectRatio === '1:1' ? aspectRatio : '16:9',
                    },
                }),
            });

            if (!res.ok) {
                const errText = await res.text();
                errors.push(`${model}: HTTP ${res.status} - ${errText.slice(0, 220)}`);
                continue;
            }

            const data = await res.json();
            const pred = data?.predictions?.[0];
            if (pred?.bytesBase64Encoded) {
                const mimeType = pred.mimeType || 'image/png';
                const buffer = Buffer.from(pred.bytesBase64Encoded, 'base64');
                return { buffer, mimeType, modelUsed: model };
            }
            errors.push(`${model}: No predictions returned`);
        } catch (err: any) {
            errors.push(`${model}: ${err?.message || String(err)}`);
        }
    }

    throw new Error(`Google Imagen/Gemini Image generation failed: ${errors.join(' | ')}`);
}

async function generateWithFalFallback(
    falApiKey: string,
    fullPrompt: string,
    aspectRatio: string
): Promise<{ buffer: Buffer; mimeType: string; modelUsed: string } | null> {
    if (!falApiKey) return null;
    try {
        const imageSize = aspectRatio === '1:1' ? 'square_hd' : aspectRatio === '3:4' ? 'portrait_4_3' : 'landscape_16_9';
        const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
            method: 'POST',
            headers: {
                Authorization: `Key ${falApiKey}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                prompt: fullPrompt.slice(0, 950),
                image_size: imageSize,
                num_images: 1,
                enable_safety_checker: true,
            }),
        });
        if (!res.ok) return null;
        const data = await res.json();
        const url = data?.images?.[0]?.url;
        if (typeof url === 'string' && url.startsWith('http')) {
            const imgRes = await fetch(url);
            if (imgRes.ok) {
                const ct = imgRes.headers.get('content-type') || 'image/jpeg';
                return { buffer: Buffer.from(await imgRes.arrayBuffer()), mimeType: ct, modelUsed: 'fal-ai/flux/schnell' };
            }
        }
        return null;
    } catch {
        return null;
    }
}

async function generateWithOpenRouterFallback(
    openRouterKey: string,
    fullPrompt: string
): Promise<{ buffer: Buffer; mimeType: string; modelUsed: string } | null> {
    if (!openRouterKey) return null;
    const models = ['google/gemini-2.5-flash-image-preview', 'google/gemini-2.5-flash-image', 'black-forest-labs/flux.2-klein-4b'];
    for (const model of models) {
        try {
            const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${openRouterKey}`,
                    'Content-Type': 'application/json',
                    'HTTP-Referer': 'https://ebookstudio.aimar.cloud',
                    'X-Title': 'ebookStudio Image Generator',
                },
                body: JSON.stringify({
                    model,
                    messages: [{ role: 'user', content: fullPrompt }],
                    modalities: ['image', 'text'],
                }),
            });
            if (!res.ok) continue;
            const data = await res.json();
            const msg = data?.choices?.[0]?.message;
            const imgEntry = msg?.images?.[0]?.image_url?.url || msg?.images?.[0]?.url;
            if (typeof imgEntry === 'string' && imgEntry.startsWith('data:image/')) {
                const match = imgEntry.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
                if (match) {
                    return { buffer: Buffer.from(match[2], 'base64'), mimeType: match[1], modelUsed: `openrouter:${model}` };
                }
            }
            if (typeof imgEntry === 'string' && imgEntry.startsWith('http')) {
                const imgRes = await fetch(imgEntry);
                if (imgRes.ok) {
                    return {
                        buffer: Buffer.from(await imgRes.arrayBuffer()),
                        mimeType: imgRes.headers.get('content-type') || 'image/png',
                        modelUsed: `openrouter:${model}`,
                    };
                }
            }
        } catch {
            // try next model
        }
    }
    return null;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            prompt,
            chapterId,
            projectId,
            chapterNo,
            chapterTitle,
            targetType = 'chapter',
            aspectRatio = '16:9',
            style = 'executive',
        } = body;

        const apiKey = process.env.GEMINI_API_KEY?.trim() || '';
        const falApiKey = process.env.FAL_API_KEY?.trim() || '';
        const openRouterKey = process.env.OPENROUTER_API_KEY?.trim() || '';

        if (!apiKey && !falApiKey && !openRouterKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY, FAL_API_KEY หรือ OPENROUTER_API_KEY ในระบบ',
                },
                { status: 400 }
            );
        }

        const rawSubject = (prompt && String(prompt).trim()) ||
            `Conceptual editorial business illustration representing chapter "${chapterTitle || 'Modern AI Leadership'}" with strategic clarity and human-AI orchestration`;

        const styleDirective = STYLE_DIRECTIVES[(style as StylePreset)] || STYLE_DIRECTIVES.executive;
        const fullPrompt = `${rawSubject}. Art style: ${styleDirective} Strictly NO overlaid words, NO letters, NO garbled text, NO typography inside the artwork.`;

        let generated: { buffer: Buffer; mimeType: string; modelUsed: string } | null = null;
        let lastErrMsg = '';

        // Prefer FAL -> OpenRouter first (fast & reliable credits), then fallback to Google Gemini Direct
        if (falApiKey) {
            generated = await generateWithFalFallback(falApiKey, fullPrompt, aspectRatio);
        }

        if (!generated && openRouterKey) {
            generated = await generateWithOpenRouterFallback(openRouterKey, fullPrompt);
        }

        if (!generated && apiKey) {
            try {
                generated = await generateWithGeminiImageApi(apiKey, fullPrompt, aspectRatio);
            } catch (err: any) {
                lastErrMsg = err?.message || String(err);
                console.warn('[ebookStudio][generate-image] Gemini fallback failed:', lastErrMsg.slice(0, 200));
            }
        }

        if (!generated) {
            throw new Error(lastErrMsg || 'Image generation failed across FAL, OpenRouter, and Gemini');
        }

        const { buffer, mimeType, modelUsed } = generated;

        const ext = mimeType.includes('jpeg') || mimeType.includes('jpg') ? 'jpg' : mimeType.includes('webp') ? 'webp' : 'png';
        const prefix = chapterNo !== undefined ? `ch${chapterNo}` : (targetType === 'cover_front' ? 'cover_front' : 'ai_art');
        const uniqueFileName = `${Date.now()}-${prefix}.${ext}`;

        const stored = await uploadBookAsset({
            buffer,
            fileName: uniqueFileName,
            contentType: mimeType,
        });

        if (!stored.success || !stored.url) {
            return NextResponse.json(
                { success: false, error: stored.error || 'Failed to store generated image' },
                { status: 500 }
            );
        }

        // Persist onto chapter if requested
        if (chapterId && targetType === 'chapter') {
            try {
                const existing = await localDb.getChapter(chapterId);
                if (existing) {
                    await localDb.saveChapter({
                        ...existing,
                        image1Url: stored.url,
                        imagePrompt: rawSubject,
                    });
                }
            } catch (dbErr) {
                console.warn('Could not persist generated image onto chapter:', dbErr);
            }
        }

        return NextResponse.json({
            success: true,
            url: stored.url,
            fileName: stored.fileName,
            modelUsed,
            promptUsed: rawSubject,
            chapterId: chapterId || null,
            projectId: projectId || null,
        });
    } catch (error: any) {
        console.error('AI Image Generation Error:', error);
        return NextResponse.json(
            {
                success: false,
                error: error?.message || 'เกิดข้อผิดพลาดระหว่างสร้างภาพด้วย Google Gemini/Imagen',
            },
            { status: 500 }
        );
    }
}
