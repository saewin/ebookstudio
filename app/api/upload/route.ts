import { NextRequest, NextResponse } from 'next/server';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
    try {
        const formData = await req.formData();
        const file = formData.get('file') as File | null;

        if (!file) {
            return NextResponse.json({ success: false, error: 'ไม่พบไฟล์รูปภาพ' }, { status: 400 });
        }

        // Validate MIME type
        if (!file.type.startsWith('image/')) {
            return NextResponse.json({ success: false, error: 'รองรับเฉพาะไฟล์รูปภาพเท่านั้น (PNG, JPG, WebP, GIF, SVG)' }, { status: 400 });
        }

        const bytes = await file.arrayBuffer();
        const buffer = Buffer.from(bytes);

        // Upload target directory: public/uploads
        const uploadsDir = path.join(process.cwd(), 'public', 'uploads');
        await mkdir(uploadsDir, { recursive: true });

        // Clean file extension and name (safe ASCII alphanumeric)
        const originalName = file.name || 'image.png';
        const ext = (path.extname(originalName) || '.png').toLowerCase();
        const rawBase = path.basename(originalName, ext);
        const cleanBase = rawBase.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').substring(0, 30) || 'img';
        const timestamp = Date.now();
        const uniqueFileName = `${timestamp}-${cleanBase}${ext}`;
        const filePath = path.join(uploadsDir, uniqueFileName);

        await writeFile(filePath, buffer);

        // Serve URL via dedicated streaming route: /api/uploads/<filename>
        const url = `/api/uploads/${uniqueFileName}`;

        return NextResponse.json({
            success: true,
            url,
            fileName: uniqueFileName,
            originalName,
            size: file.size,
            type: file.type
        });
    } catch (error: any) {
        console.error('File Upload Error:', error);
        return NextResponse.json(
            { success: false, error: error.message || 'เกิดข้อผิดพลาดในการบันทึกรูปภาพ' },
            { status: 500 }
        );
    }
}
