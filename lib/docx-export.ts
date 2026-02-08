
import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } from 'docx';
import { saveAs } from 'file-saver';

interface Chapter {
    id: string;
    title: string;
    chapterNo: number;
    content: string;
}

export async function exportToDocx(projectTitle: string, chapters: Chapter[]) {
    // 1. Clean HTML/Markdown from content (Simple version for now)
    const cleanContent = (html: string) => {
        return html
            .replace(/<[^>]*>?/gm, '') // Remove HTML tags
            .replace(/###/g, '')       // Remove Markdown headers
            .replace(/\*\*/g, '')      // Remove Bold
            .replace(/\*/g, '')        // Remove Italic
            .trim();
    };

    const doc = new Document({
        sections: [
            {
                properties: {},
                children: [
                    // Title Page
                    new Paragraph({
                        text: projectTitle,
                        heading: HeadingLevel.TITLE,
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 2400, after: 1200 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({
                                text: "ฉบับตรวจทาน (Draft)",
                                italics: true,
                                size: 28, // 14pt
                            }),
                        ],
                        alignment: AlignmentType.CENTER,
                        spacing: { after: 4800 },
                    }),

                    // Chapters
                    ...chapters.flatMap((chapter) => [
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: `บทที่ ${chapter.chapterNo}`,
                                    bold: true,
                                    size: 24, // 12pt
                                    color: "666666",
                                }),
                            ],
                            spacing: { before: 800, after: 200 },
                            alignment: AlignmentType.CENTER,
                        }),
                        new Paragraph({
                            text: chapter.title,
                            heading: HeadingLevel.HEADING_1,
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 400 },
                        }),
                        new Paragraph({
                            children: [
                                new TextRun({
                                    text: cleanContent(chapter.content),
                                    size: 32, // 16pt (MEB Standard)
                                }),
                            ],
                            spacing: { after: 800, line: 360 }, // 1.5 line height approx
                        }),
                        new Paragraph({
                            text: "* * *",
                            alignment: AlignmentType.CENTER,
                            spacing: { after: 1200 },
                        }),
                    ]),
                ],
            },
        ],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `${projectTitle}.docx`);
}
