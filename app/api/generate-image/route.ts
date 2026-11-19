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

        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            return NextResponse.json(
                {
                    success: false,
                    error: 'ยังไม่ได้ตั้งค่า GEMINI_API_KEY ในระบบ (.env) กรุณาเพิ่ม GEMINI_API_KEY เพื่อเปิดใช้งานการสร้างภาพด้วย Google Gemini/Imagen AI',
                },
                { status: 400 }
            );
        }

        const rawSubject = (prompt && String(prompt).trim()) ||
            `Conceptual editorial business illustration representing chapter "${chapterTitle || 'Modern AI Leadership'}" with strategic clarity and human-AI orchestration`;

        const styleDirective = STYLE_DIRECTIVES[(style as StylePreset)] || STYLE_DIRECTIVES.executive;
        const fullPrompt = `${rawSubject}. Art style: ${styleDirective} Strictly NO overlaid words, NO letters, NO garbled text, NO typography inside the artwork.`;

        const { buffer, mimeType, modelUsed } = await generateWithGeminiImageApi(apiKey, fullPrompt, aspectRatio);

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
