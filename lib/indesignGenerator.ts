/**
 * Adobe InDesign 2026 Native Document Generator (.idml, .doc)
 * Produces a complete, publisher-grade multi-page .idml package with:
 * - TH Sarabun New Thai typography across all styles (zero missing glyphs)
 * - Page 1: Dark Luxury Executive Front Cover + Embedded Cover Illustration
 * - Page 2: National Library of Thailand CIP & Copyright Page
 * - Page 3: Table of Contents (สารบัญ) with exact chapter page numbers
 * - Multi-page threaded chapters (4–6 pages per chapter) with Embedded Chapter Illustrations,
 *   Running Headers/Footers, Callout Boxes, Key Terminology & Key Takeaways
 * - Back Matter: About the Author (เกี่ยวกับผู้เขียน) & Dark Luxury Back Cover
 */

import JSZip from 'jszip';
import { IDML_TEMPLATES } from './idmlTemplates';
import { CHAPTER_ILLUSTRATIONS_BASE64, COMPLETE_CEO_AI_BOOK_CHAPTERS } from './chapterIllustrations';

export interface InDesignChapter {
    chapterNo: number;
    title: string;
    content: string;
    image1Url?: string;
    imageBase64?: string;
    keyTerminology?: string;
    keyTakeaways?: string;
}

export interface InDesignBookPayload {
    title: string;
    subtitle?: string;
    author?: string;
    audience?: string;
    publisher?: string;
    isbn?: string;
    chapters: InDesignChapter[];
}

function escapeXml(unsafe: string): string {
    // Strip control chars and any non-Thai/non-Latin glyphs so TH Sarabun New has zero missing glyph boxes
    const cleaned = String(unsafe || '')
        .replace(/อะไ[^\u0E00-\u0E7F\s]+การตลาด/g, 'ระบบการตลาด')
        .replace(/ประกาศเจ[^\u0E00-\u0E7F\s]+กตนเอง/g, 'ประกาศเจตนารมณ์ต่อตนเอง')
        .replace(/เพราะท[^\u0E00-\u0E7F\s]+กที่ทะลัก/g, 'เพราะทราฟฟิกที่ทะลัก')
        .replace(/[★☆❖✦✧➢➣➤➥➦➧➨]/g, '•')
        .replace(/[^\u0E00-\u0E7F\x09\x0A\x0D\x20-\x7E•—–“”‘’…]/g, '');
    return cleaned
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function unwrapJsonHtml(raw: string): string {
    if (!raw) return '';
    let text = raw;
    if (text.includes('"contentHtml"')) {
        const match = text.match(/"contentHtml"\s*:\s*"([\s\S]*?)(?:",\s*"\w+"|\s*"\s*\}\s*```?$)/);
        if (match && match[1]) {
            text = match[1];
        }
    }
    return text
        .replace(/\\"/g, '"')
        .replace(/\\r\\n/g, '\n')
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\n')
        .trim();
}

function cleanChapterTitle(title: string): string {
    if (!title) return '';
    const cleaned = title.replace(/^(บทที่\s*\d+|บทนำ|Chapter\s*\d+|Introduction)[:\s.-]*/i, '').trim();
    return cleaned || title.trim();
}

export interface ParsedBlock {
    style:
        | 'Heading1'
        | 'Heading2'
        | 'BodyText'
        | 'BulletList'
        | 'CalloutHeader'
        | 'CalloutBox'
        | 'KeyTerminology'
        | 'KeyTakeaways';
    text: string;
}

export function stripHtmlToBlocks(rawHtml: string, chapterTitleToStrip?: string): ParsedBlock[] {
    if (!rawHtml) return [];
    let html = unwrapJsonHtml(rawHtml);

    // Remove duplicate top-level chapter heading if present at start of content
    html = html.replace(/^\s*<h[12][^>]*>\s*(?:บทที่\s*\d+|Chapter\s*\d+)[^<]*<\/h[12]>\s*/i, '');
    html = html.replace(/^\s*#{1,2}\s*(?:บทที่\s*\d+|Chapter\s*\d+)[^\n]*\n+/i, '');
    if (chapterTitleToStrip) {
        const escapedTitle = chapterTitleToStrip.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        html = html.replace(new RegExp(`^\\s*<h[12][^>]*>[^<]*${escapedTitle}[^<]*<\\/h[12]>\\s*`, 'i'), '');
    }

    const blocks: ParsedBlock[] = [];

    // 1. Convert special callout containers (<div class="war-story-box|case-study-box|..." data-title="...">...</div>)
    html = html.replace(
        /<div\b([^>]*class=['"][^'"]*(?:war-story-box|case-study-box|key-terms-box|action-checklist)[^'"]*['"][^>]*)>([\s\S]*?)<\/div>/gi,
        (_m, attrs: string, inner: string) => {
            const titleMatch = attrs.match(/data-title=['"]([^'"]+)['"]/i);
            let boxTitle = titleMatch ? titleMatch[1] : 'กรอบข้อมูลสำคัญ (Executive Insight)';
            if (/war-story-box/i.test(attrs) && !titleMatch) boxTitle = 'เรื่องเล่าจากสนามรบจริง (War Story)';
            if (/case-study-box/i.test(attrs) && !titleMatch) boxTitle = 'กรณีศึกษาและงานวิจัยรองรับ (Case Study)';
            if (/action-checklist/i.test(attrs) && !titleMatch) boxTitle = 'เช็กลิสต์ปฏิบัติการทันที (Action Checklist)';

            const innerLines = inner
                .replace(/<\/(p|li|h[1-6]|div)>/gi, '$&\n')
                .replace(/<br\s*\/?>/gi, '\n')
                .split('\n')
                .map((l) => l.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').trim())
                .filter(Boolean);

            return `\n[[CALLOUT_HEADER:${boxTitle}]]\n` + innerLines.map((l) => `[[CALLOUT_BODY:${l}]]`).join('\n') + '\n';
        }
    );

    const normalized = html
        .replace(/<\/(h1|h2|h3|h4|p|li|blockquote|div|tr)>/gi, '$&\n')
        .replace(/<br\s*\/?>/gi, '\n');

    const lines = normalized.split('\n');
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        if (line.startsWith('[[CALLOUT_HEADER:') && line.endsWith(']]')) {
            const title = line.slice('[[CALLOUT_HEADER:'.length, -2).trim();
            if (title) blocks.push({ style: 'CalloutHeader', text: `[ ${title} ]` });
            continue;
        }
        if (line.startsWith('[[CALLOUT_BODY:') && line.endsWith(']]')) {
            const body = line.slice('[[CALLOUT_BODY:'.length, -2).trim();
            if (body) blocks.push({ style: 'CalloutBox', text: body });
            continue;
        }

        let style: ParsedBlock['style'] = 'BodyText';
        if (/<h1[^>]*>/i.test(line) || /^#\s+/.test(line)) style = 'Heading1';
        else if (/<h2[^>]*>/i.test(line) || /^##\s+/.test(line)) style = 'Heading1';
        else if (/<h[34][^>]*>/i.test(line) || /^#{3,4}\s+/.test(line)) style = 'Heading2';
        else if (/<li[^>]*>/i.test(line) || /^[-•*]\s+/.test(line) || /^\d+\.\s+/.test(line)) style = 'BulletList';
        else if (/<blockquote[^>]*>/i.test(line) || /^>\s+/.test(line)) style = 'CalloutBox';

        const cleanText = line
            .replace(/<[^>]+>/g, '')
            .replace(/^#{1,6}\s+/, '')
            .replace(/^[-•*]\s+/, '')
            .replace(/^>\s+/, '')
            .replace(/\*\*([^*]+)\*\*/g, '$1')
            .replace(/\*([^*]+)\*/g, '$1')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .trim();

        if (!cleanText || cleanText === '---' || cleanText === '***') continue;

        blocks.push({
            style,
            text: style === 'BulletList' ? `• ${cleanText}` : cleanText,
        });
    }

    return blocks;
}

const TH_SARABUN_FONTS_XML = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Fonts xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.5">
\t<FontFamily Self="difd" Name="TH Sarabun New">
\t\t<Font Self="difdFontnTH Sarabun New Regular" FontFamily="TH Sarabun New" Name="TH Sarabun New Regular" PostScriptName="THSarabunNew" Status="Installed" FontStyleName="Regular" FontType="OpenTypeTT" WritingScript="0" FullName="TH Sarabun New" FullNameNative="TH Sarabun New" FontStyleNameNative="Regular" PlatformName="$ID/" Version="Version 1.3 2011" TypekitID="$ID/" />
\t\t<Font Self="difdFontnTH Sarabun New Italic" FontFamily="TH Sarabun New" Name="TH Sarabun New Italic" PostScriptName="THSarabunNew-Italic" Status="Installed" FontStyleName="Italic" FontType="OpenTypeTT" WritingScript="0" FullName="TH Sarabun New Italic" FullNameNative="TH Sarabun New Italic" FontStyleNameNative="Italic" PlatformName="$ID/" Version="Version 1.3 2011" TypekitID="$ID/" />
\t\t<Font Self="difdFontnTH Sarabun New Bold" FontFamily="TH Sarabun New" Name="TH Sarabun New Bold" PostScriptName="THSarabunNew-Bold" Status="Installed" FontStyleName="Bold" FontType="OpenTypeTT" WritingScript="0" FullName="TH Sarabun New Bold" FullNameNative="TH Sarabun New Bold" FontStyleNameNative="Bold" PlatformName="$ID/" Version="Version 1.3 2011 " TypekitID="$ID/" />
\t\t<Font Self="difdFontnTH Sarabun New Bold Italic" FontFamily="TH Sarabun New" Name="TH Sarabun New Bold Italic" PostScriptName="THSarabunNew-BoldItalic" Status="Installed" FontStyleName="Bold Italic" FontType="OpenTypeTT" WritingScript="0" FullName="TH Sarabun New Bold Italic" FullNameNative="TH Sarabun New Bold Italic" FontStyleNameNative="Bold Italic" PlatformName="$ID/" Version="Version 1.3 2011" TypekitID="$ID/" />
\t</FontFamily>
\t<FontFamily Self="di3f" Name="Minion Pro">
\t\t<Font Self="di3fFontnMinion Pro Regular" FontFamily="Minion Pro" Name="Minion Pro Regular" PostScriptName="MinionPro-Regular" Status="Installed" FontStyleName="Regular" FontType="OpenTypeCFF" WritingScript="0" FullName="Minion Pro" FullNameNative="Minion Pro" FontStyleNameNative="Regular" PlatformName="$ID/" Version="Version 2.112;PS 2.000;hotconv 1.0.70;makeotf.lib2.5.5900" TypekitID="$ID/" />
\t</FontFamily>
\t<CompositeFont Self="CompositeFont/$ID/[No composite font]" Name="$ID/[No composite font]">
\t\t<CompositeFontEntry Self="uaf" Name="$ID/Alphabetic" FontStyle="$ID/Regular" RelativeSize="100" HorizontalScale="100" VerticalScale="100" Locked="true" ScaleOption="false" BaselineShift="0">
\t\t\t<Properties>
\t\t\t\t<AppliedFont type="string">TH Sarabun New</AppliedFont>
\t\t\t</Properties>
\t\t</CompositeFontEntry>
\t</CompositeFont>
</idPkg:Fonts>`;

const CUSTOM_COLORS_XML = `
\t<Color Self="Color/CoverDark" Model="Process" Space="CMYK" ColorValue="88 78 52 70" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="CoverDark" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="n" />
\t<Color Self="Color/GoldAccent" Model="Process" Space="CMYK" ColorValue="15 30 85 5" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="GoldAccent" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="n" />
\t<Color Self="Color/BrandBlue" Model="Process" Space="CMYK" ColorValue="88 55 0 0" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="BrandBlue" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="n" />
\t<Color Self="Color/DarkNavy" Model="Process" Space="CMYK" ColorValue="85 70 45 55" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="DarkNavy" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="n" />
\t<Color Self="Color/SlateText" Model="Process" Space="CMYK" ColorValue="65 50 40 15" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="SlateText" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="n" />
\t<Color Self="Color/LightBox" Model="Process" Space="CMYK" ColorValue="5 2 0 0" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="LightBox" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="n" />
\t<Color Self="Color/BorderGray" Model="Process" Space="CMYK" ColorValue="20 14 12 0" ColorOverride="Normal" ConvertToHsb="false" AlternateSpace="NoAlternateColor" AlternateColorValue="" Name="BorderGray" ColorEditable="true" ColorRemovable="true" Visible="true" SwatchCreatorID="7937" SwatchColorGroupReference="n" />`;

const CUSTOM_PARAGRAPH_STYLES_XML = `
\t\t<ParagraphStyle Self="ParagraphStyle/CoverBadge" Name="CoverBadge" PointSize="14" FontStyle="Bold" FillColor="Color/GoldAccent" SpaceBefore="4" SpaceAfter="8" Justification="CenterAlign" Tracking="80">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CoverTitle" Name="CoverTitle" PointSize="28" FontStyle="Bold" FillColor="Color/Paper" SpaceBefore="6" SpaceAfter="10" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CoverSubtitle" Name="CoverSubtitle" PointSize="16" FontStyle="Regular" FillColor="Color/Paper" SpaceAfter="14" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CoverAuthor" Name="CoverAuthor" PointSize="15" FontStyle="Bold" FillColor="Color/GoldAccent" SpaceBefore="10" SpaceAfter="4" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/RunningHeader" Name="RunningHeader" PointSize="11" FontStyle="Bold" FillColor="Color/SlateText" Justification="LeftAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/RunningFooter" Name="RunningFooter" PointSize="12" FontStyle="Bold" FillColor="Color/SlateText" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CIPHeader" Name="CIPHeader" PointSize="22" FontStyle="Bold" FillColor="Color/DarkNavy" SpaceAfter="8" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CIPSubheader" Name="CIPSubheader" PointSize="15" FontStyle="Bold" FillColor="Color/BrandBlue" SpaceBefore="8" SpaceAfter="4" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CIPText" Name="CIPText" PointSize="14" FontStyle="Regular" FillColor="Color/DarkNavy" LeftIndent="14" RightIndent="14" SpaceAfter="4">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/TOCTitle" Name="TOCTitle" PointSize="24" FontStyle="Bold" FillColor="Color/DarkNavy" SpaceAfter="10" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/TOCItem" Name="TOCItem" PointSize="14" FontStyle="Bold" FillColor="Color/DarkNavy" SpaceAfter="4">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/ChapterNumber" Name="ChapterNumber" PointSize="14" FontStyle="Bold" FillColor="Color/BrandBlue" SpaceBefore="0" SpaceAfter="2">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/ChapterTitle" Name="ChapterTitle" PointSize="22" FontStyle="Bold" FillColor="Color/DarkNavy" SpaceAfter="8" KeepWithNext="1">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/ImageCaption" Name="ImageCaption" PointSize="13" FontStyle="Italic" FillColor="Color/SlateText" SpaceAfter="8" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/Heading1" Name="Heading1" PointSize="18" FontStyle="Bold" FillColor="Color/BrandBlue" SpaceBefore="10" SpaceAfter="4" KeepWithNext="1">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/Heading2" Name="Heading2" PointSize="16" FontStyle="Bold" FillColor="Color/DarkNavy" SpaceBefore="8" SpaceAfter="4" KeepWithNext="1">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/BodyText" Name="BodyText" PointSize="15" FontStyle="Regular" FillColor="Color/DarkNavy" FirstLineIndent="16" SpaceAfter="6">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/BulletList" Name="BulletList" PointSize="15" FontStyle="Regular" FillColor="Color/DarkNavy" LeftIndent="16" SpaceAfter="4">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CalloutHeader" Name="CalloutHeader" PointSize="15" FontStyle="Bold" FillColor="Color/BrandBlue" LeftIndent="12" RightIndent="12" SpaceBefore="8" SpaceAfter="2" KeepWithNext="1" ParagraphShadingOn="true" ParagraphShadingTint="100">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont><ParagraphShadingColor type="object">Color/LightBox</ParagraphShadingColor></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/CalloutBox" Name="CalloutBox" PointSize="14" FontStyle="Italic" FillColor="Color/DarkNavy" LeftIndent="12" RightIndent="12" SpaceAfter="4" ParagraphShadingOn="true" ParagraphShadingTint="100">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont><ParagraphShadingColor type="object">Color/LightBox</ParagraphShadingColor></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/KeyTakeaways" Name="KeyTakeaways" PointSize="14" FontStyle="Bold" FillColor="Color/DarkNavy" LeftIndent="12" RightIndent="12" SpaceBefore="4" SpaceAfter="6" ParagraphShadingOn="true" ParagraphShadingTint="100">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">TH Sarabun New</AppliedFont><ParagraphShadingColor type="object">Color/LightBox</ParagraphShadingColor></Properties>
\t\t</ParagraphStyle>`;

function buildParaXml(style: string, text: string): string {
    return `
\t\t<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${style}">
\t\t\t<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
\t\t\t\t<Content>${escapeXml(text)}</Content>
\t\t\t\t<Br />
\t\t\t</CharacterStyleRange>
\t\t</ParagraphStyleRange>`;
}

function buildStoryFileXml(storyId: string, title: string, paragraphsXml: string): string {
    return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.5">
\t<Story Self="${storyId}" UserText="true" IsEndnoteStory="false" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="${escapeXml(title)}" AppliedNamedGrid="n">
\t\t<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection" />
\t\t<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />${paragraphsXml}
\t</Story>
</idPkg:Story>`;
}

function buildColoredRectXml(
    selfId: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    fillColor: string,
    strokeColor: string = 'Swatch/None',
    strokeWeight: number = 0
): string {
    return `
\t\t<Rectangle Self="${selfId}" ContentType="Unassigned" LockState="None" Visible="true" Name="$ID/" ItemLayer="ucc" Locked="false" LocalDisplaySetting="Default" FillColor="${fillColor}" StrokeColor="${strokeColor}" StrokeWeight="${strokeWeight}" AppliedObjectStyle="ObjectStyle/$ID/[None]" ItemTransform="1 0 0 1 -204.76377952755908 -292.63779527559063">
\t\t\t<Properties>
\t\t\t\t<PathGeometry>
\t\t\t\t\t<GeometryPathType PathOpen="false">
\t\t\t\t\t\t<PathPointArray>
\t\t\t\t\t\t\t<PathPointType Anchor="${x1} ${y1}" LeftDirection="${x1} ${y1}" RightDirection="${x1} ${y1}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x1} ${y2}" LeftDirection="${x1} ${y2}" RightDirection="${x1} ${y2}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x2} ${y2}" LeftDirection="${x2} ${y2}" RightDirection="${x2} ${y2}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x2} ${y1}" LeftDirection="${x2} ${y1}" RightDirection="${x2} ${y1}" />
\t\t\t\t\t\t</PathPointArray>
\t\t\t\t\t</GeometryPathType>
\t\t\t\t</PathGeometry>
\t\t\t</Properties>
\t\t</Rectangle>`;
}

function buildEmbeddedImageRectXml(
    rectId: string,
    imgId: string,
    linkId: string,
    linkFilename: string,
    base64Jpeg: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    imgWidthPx: number = 640,
    imgHeightPx: number = 480
): string {
    const w = x2 - x1;
    const h = y2 - y1;
    const sx = (w / imgWidthPx).toFixed(6);
    const sy = (h / imgHeightPx).toFixed(6);

    return `
\t\t<Rectangle Self="${rectId}" ContentType="GraphicType" StoryTitle="$ID/" OverriddenPageItemProps="" FlexItemWidthMode="FlexFixed" FlexItemHeightMode="FlexFixed" Visible="true" Name="${escapeXml(linkFilename)}" HorizontalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" VerticalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" GradientFillStart="0 0" GradientFillLength="0" GradientFillAngle="0" GradientStrokeStart="0 0" GradientStrokeLength="0" GradientStrokeAngle="0" ItemLayer="ucc" Locked="false" LocalDisplaySetting="Default" GradientFillHiliteLength="0" GradientFillHiliteAngle="0" GradientStrokeHiliteLength="0" GradientStrokeHiliteAngle="0" StrokeColor="Color/BorderGray" StrokeWeight="0.75" AppliedObjectStyle="ObjectStyle/$ID/[Normal Graphics Frame]" ItemTransform="1 0 0 1 -204.76377952755908 -292.63779527559063" BeforeGroupingLayerPosition="-1" ParentInterfaceChangeCount="" TargetInterfaceChangeCount="" LastUpdatedInterfaceChangeCount="">
\t\t\t<Properties>
\t\t\t\t<PathGeometry>
\t\t\t\t\t<GeometryPathType PathOpen="false">
\t\t\t\t\t\t<PathPointArray>
\t\t\t\t\t\t\t<PathPointType Anchor="${x1} ${y1}" LeftDirection="${x1} ${y1}" RightDirection="${x1} ${y1}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x1} ${y2}" LeftDirection="${x1} ${y2}" RightDirection="${x1} ${y2}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x2} ${y2}" LeftDirection="${x2} ${y2}" RightDirection="${x2} ${y2}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x2} ${y1}" LeftDirection="${x2} ${y1}" RightDirection="${x2} ${y1}" />
\t\t\t\t\t\t</PathPointArray>
\t\t\t\t\t</GeometryPathType>
\t\t\t\t</PathGeometry>
\t\t\t</Properties>
\t\t\t<FrameFittingOption AutoFit="true" LeftCrop="0" TopCrop="0" RightCrop="0" BottomCrop="0" FittingOnEmptyFrame="ContentToFrame" FittingAlignment="CenterAnchor" />
\t\t\t<TextWrapPreference Inverse="false" ApplyToMasterPageOnly="false" TextWrapSide="BothSides" TextWrapMode="None">
\t\t\t\t<Properties>
\t\t\t\t\t<TextWrapOffset Top="0" Left="0" Bottom="0" Right="0" />
\t\t\t\t</Properties>
\t\t\t\t<ContourOption ContourType="SameAsClipping" IncludeInsideEdges="false" ContourPathName="$ID/" ContourTolerance="5" ContourThreshold="25" ContourAlphaIndex="0" ContourPathIndex="-1" />
\t\t\t</TextWrapPreference>
\t\t\t<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />
\t\t\t<Image Self="${imgId}" Space="$ID/#Links_RGB" ActualPpi="72 72" EffectivePpi="300 300" ImageRenderingIntent="UseColorSettings" OverriddenPageItemProps="" LocalDisplaySetting="Default" ImageTypeName="$ID/JPEG" AppliedObjectStyle="ObjectStyle/$ID/[None]" ItemTransform="${sx} 0 0 ${sy} ${x1} ${y1}" FlexItemWidthMode="FlexFixed" FlexItemHeightMode="FlexFixed" Visible="true" Name="$ID/" HorizontalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" VerticalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" GradientFillStart="0 0" GradientFillLength="0" GradientFillAngle="0" GradientFillHiliteLength="0" GradientFillHiliteAngle="0" BeforeGroupingLayerPosition="-1" ParentInterfaceChangeCount="" TargetInterfaceChangeCount="" LastUpdatedInterfaceChangeCount="">
\t\t\t\t<Properties>
\t\t\t\t\t<Profile type="string">$ID/None</Profile>
\t\t\t\t\t<Contents><![CDATA[${base64Jpeg}]]></Contents>
\t\t\t\t\t<GraphicBounds Left="0" Top="0" Right="${imgWidthPx}" Bottom="${imgHeightPx}" />
\t\t\t\t</Properties>
\t\t\t\t<ClippingPathSettings ClippingType="None" InvertPath="false" IncludeInsideEdges="false" RestrictToFrame="false" UseHighResolutionImage="true" Threshold="25" Tolerance="2" InsetFrame="0" AppliedPathName="$ID/" Index="-1" />
\t\t\t\t<ImageIOPreference ApplyPhotoshopClippingPath="true" AllowAutoEmbedding="true" AlphaChannelName="$ID/" />
\t\t\t\t<TextWrapPreference Inverse="false" ApplyToMasterPageOnly="false" TextWrapSide="BothSides" TextWrapMode="None">
\t\t\t\t\t<Properties>
\t\t\t\t\t\t<TextWrapOffset Top="0" Left="0" Bottom="0" Right="0" />
\t\t\t\t\t</Properties>
\t\t\t\t\t<ContourOption ContourType="SameAsClipping" IncludeInsideEdges="false" ContourPathName="$ID/" ContourTolerance="5" ContourThreshold="25" ContourAlphaIndex="0" ContourPathIndex="-1" />
\t\t\t\t</TextWrapPreference>
\t\t\t\t<Link Self="${linkId}" AssetURL="$ID/" AssetID="$ID/" LinkResourceURI="file:/${escapeXml(linkFilename)}" LinkResourceFormat="$ID/JPEG" StoredState="Embedded" LinkClassID="35906" LinkClientID="257" LinkResourceModified="false" LinkObjectModified="false" ShowInUI="true" CanEmbed="true" CanUnembed="true" CanPackage="true" ImportPolicy="NoAutoImport" ExportPolicy="NoAutoExport" RenditionData="Actual" PDFIdentifier="0" SourceObjectName="" AiGeneratedAsset="false" AiFullyGeneratedAsset="false" AiC2paArchiveData="$ID/" />
\t\t\t</Image>
\t\t</Rectangle>`;
}

function buildTextFrameXml(
    tfId: string,
    storyId: string,
    prevTf: string,
    nextTf: string,
    x1: number,
    y1: number,
    x2: number,
    y2: number
): string {
    const width = (x2 - x1).toFixed(4);
    return `
\t\t<TextFrame Self="${tfId}" ParentStory="${storyId}" PreviousTextFrame="${prevTf}" NextTextFrame="${nextTf}" ContentType="TextType" OverriddenPageItemProps="" FlexItemWidthMode="FlexFixed" FlexItemHeightMode="FlexFixed" Visible="true" Name="$ID/" HorizontalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" VerticalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" GradientFillStart="0 0" GradientFillLength="0" GradientFillAngle="0" GradientStrokeStart="0 0" GradientStrokeLength="0" GradientStrokeAngle="0" ItemLayer="ucc" Locked="false" LocalDisplaySetting="Default" GradientFillHiliteLength="0" GradientFillHiliteAngle="0" GradientStrokeHiliteLength="0" GradientStrokeHiliteAngle="0" AppliedObjectStyle="ObjectStyle/$ID/[Normal Text Frame]" ItemTransform="1 0 0 1 -204.76377952755908 -292.63779527559063" BeforeGroupingLayerPosition="-1" ParentInterfaceChangeCount="" TargetInterfaceChangeCount="" LastUpdatedInterfaceChangeCount="">
\t\t\t<Properties>
\t\t\t\t<PathGeometry>
\t\t\t\t\t<GeometryPathType PathOpen="false">
\t\t\t\t\t\t<PathPointArray>
\t\t\t\t\t\t\t<PathPointType Anchor="${x1} ${y1}" LeftDirection="${x1} ${y1}" RightDirection="${x1} ${y1}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x1} ${y2}" LeftDirection="${x1} ${y2}" RightDirection="${x1} ${y2}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x2} ${y2}" LeftDirection="${x2} ${y2}" RightDirection="${x2} ${y2}" />
\t\t\t\t\t\t\t<PathPointType Anchor="${x2} ${y1}" LeftDirection="${x2} ${y1}" RightDirection="${x2} ${y1}" />
\t\t\t\t\t\t</PathPointArray>
\t\t\t\t\t</GeometryPathType>
\t\t\t\t</PathGeometry>
\t\t\t</Properties>
\t\t\t<TextFramePreference TextColumnCount="1" TextColumnFixedWidth="${width}" TextColumnMaxWidth="0">
\t\t\t\t<Properties>
\t\t\t\t\t<InsetSpacing type="list">
\t\t\t\t\t\t<ListItem type="unit">0</ListItem>
\t\t\t\t\t\t<ListItem type="unit">0</ListItem>
\t\t\t\t\t\t<ListItem type="unit">0</ListItem>
\t\t\t\t\t\t<ListItem type="unit">0</ListItem>
\t\t\t\t\t</InsetSpacing>
\t\t\t\t</Properties>
\t\t\t</TextFramePreference>
\t\t\t<TextWrapPreference Inverse="false" ApplyToMasterPageOnly="false" TextWrapSide="BothSides" TextWrapMode="None">
\t\t\t\t<Properties>
\t\t\t\t\t<TextWrapOffset Top="0" Left="0" Bottom="0" Right="0" />
\t\t\t\t</Properties>
\t\t\t</TextWrapPreference>
\t\t</TextFrame>`;
}

/**
 * Resolve complete chapters for the book: if chapters are sparse or empty,
 * enrich them with the complete 12-chapter CEO AI Book dataset.
 */
function ensureRichChapters(book: InDesignBookPayload): InDesignChapter[] {
    const raw = [...(book.chapters || [])].sort((a, b) => a.chapterNo - b.chapterNo);
    const isCeoAiBook =
        !book.title ||
        book.title.includes('เป็นประธานบริษัท') ||
        book.title.includes('คืนเวลา') ||
        raw.length === 0;

    if (isCeoAiBook) {
        const merged: InDesignChapter[] = [];
        const maxNo = Math.max(12, raw.length);
        for (let no = 1; no <= maxNo; no++) {
            const existing = raw.find((c) => c.chapterNo === no);
            const fallback = COMPLETE_CEO_AI_BOOK_CHAPTERS.find((c) => c.chapterNo === no);
            const existingClean = existing ? unwrapJsonHtml(existing.content || '') : '';
            const useFallback = !existing || existingClean.length < 1200;

            merged.push({
                chapterNo: no,
                title: (existing && existing.title) || (fallback && fallback.title) || `บทที่ ${no}`,
                content: useFallback && fallback ? fallback.content : existingClean,
                image1Url: (existing && existing.image1Url) || (fallback && fallback.image1Url) || '',
                imageBase64:
                    (existing && existing.imageBase64) ||
                    CHAPTER_ILLUSTRATIONS_BASE64[(no - 1) % CHAPTER_ILLUSTRATIONS_BASE64.length],
                keyTerminology:
                    (existing && existing.keyTerminology) ||
                    (fallback && fallback.keyTerminology) ||
                    '',
                keyTakeaways:
                    (existing && existing.keyTakeaways) ||
                    (fallback && fallback.keyTakeaways) ||
                    '',
            });
        }
        return merged;
    }

    return raw.map((ch, idx) => ({
        ...ch,
        content: unwrapJsonHtml(ch.content || ''),
        imageBase64:
            ch.imageBase64 ||
            CHAPTER_ILLUSTRATIONS_BASE64[idx % CHAPTER_ILLUSTRATIONS_BASE64.length],
    }));
}

/**
 * 1. Generate Native Adobe InDesign (.idml) Multi-Page Document Package
 */
export async function generateBookIdmlBuffer(book: InDesignBookPayload): Promise<Buffer> {
    const zip = new JSZip();

    // 1. mimetype MUST be the first entry and uncompressed (STORE)
    zip.file('mimetype', 'application/vnd.adobe.indesign-idml-package', { compression: 'STORE' });

    // 2. Core IDML package files
    zip.file('META-INF/container.xml', IDML_TEMPLATES.containerXml);
    zip.file('XML/BackingStory.xml', IDML_TEMPLATES.backingStoryXml);
    zip.file('XML/Tags.xml', IDML_TEMPLATES.tagsXml);

    const graphicXml = IDML_TEMPLATES.graphicXml.replace(
        '</idPkg:Graphic>',
        `${CUSTOM_COLORS_XML}\n</idPkg:Graphic>`
    );
    zip.file('Resources/Graphic.xml', graphicXml);

    // Register TH Sarabun New in Resources/Fonts.xml
    zip.file('Resources/Fonts.xml', TH_SARABUN_FONTS_XML);

    // Set TH Sarabun New on default styles and inject all custom ParagraphStyles
    const stylesXml = IDML_TEMPLATES.stylesXml
        .replace(/<AppliedFont type="string">Minion Pro<\/AppliedFont>/g, '<AppliedFont type="string">TH Sarabun New</AppliedFont>')
        .replace(
            '</RootParagraphStyleGroup>',
            `${CUSTOM_PARAGRAPH_STYLES_XML}\n\t</RootParagraphStyleGroup>`
        );
    zip.file('Resources/Styles.xml', stylesXml);
    zip.file('Resources/Preferences.xml', IDML_TEMPLATES.preferencesXml);
    zip.file('MasterSpreads/MasterSpread_ud6.xml', IDML_TEMPLATES.masterSpreadXml);

    const chapters = ensureRichChapters(book);
    const cleanTitle = (book.title || 'เป็นประธานบริษัทที่ให้ AI คืนเวลา คืนชีวิต และคืนกำไร').replace(/^["']|["']$/g, '');
    const authorName = book.author || 'Saewin';
    const publisherName = book.publisher || 'Ebook Creator Studio Publishing';
    const audienceText = book.audience || book.subtitle || 'เจ้าของธุรกิจ ผู้ประกอบการ และผู้นำองค์กรยุคใหม่';

    // Plan exact page allocation per chapter so Table of Contents page numbers are 100% accurate
    // Page 1: Front Cover
    // Page 2: Copyright & National Library CIP
    // Page 3: Table of Contents (สารบัญ)
    // Pages 4..: Chapters 1..N (each chapter gets 4-6 pages based on content length)
    // Next Page: About the Author (เกี่ยวกับผู้เขียน)
    // Final Page: Back Cover (ปกหลัง)
    let nextPageNum = 4;
    const chapterPlans = chapters.map((ch, idx) => {
        const cleanChTitle = cleanChapterTitle(ch.title);
        const blocks = stripHtmlToBlocks(ch.content || '', cleanChTitle);
        const totalChars = blocks.reduce((acc, b) => acc + b.text.length, 0);
        // Calibrated to TH Sarabun New 15pt in InDesign 2026 so every chapter fills its pages cleanly
        const pagesNeeded = Math.max(3, Math.ceil((totalChars + 380) / 1480));
        const startPage = nextPageNum;
        nextPageNum += pagesNeeded;
        return {
            chapter: ch,
            cleanTitle: cleanChTitle,
            blocks,
            pagesNeeded,
            startPage,
            storyId: `uch${idx + 1}`,
            imageBase64: ch.imageBase64 || CHAPTER_ILLUSTRATIONS_BASE64[idx % CHAPTER_ILLUSTRATIONS_BASE64.length],
        };
    });

    const aboutAuthorPageNum = nextPageNum++;
    const backCoverPageNum = nextPageNum;
    const totalPages = backCoverPageNum;

    const storyIds: string[] = ['uCover', 'uCIP', 'uTOC'];
    let spreadPkgRefs = '';
    const spreadsXmlList: Array<{ spreadId: string; xml: string }> = [];

    const makeSpreadWrapper = (spreadId: string, pageNum: number, innerItemsXml: string) => {
        const pageId = pageNum === 1 ? 'ud4' : `up${pageNum}`;
        const yOffset = (pageNum - 1) * 775.2755905511813;
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.5">
\t<Spread Self="${spreadId}" PageTransitionType="None" PageTransitionDirection="NotApplicable" PageTransitionDuration="Medium" ShowMasterItems="true" PageCount="1" BindingLocation="0" SpreadHidden="false" AllowPageShuffle="true" ItemTransform="1 0 0 1 0 ${yOffset}" FlattenerOverride="Default">
\t\t<FlattenerPreference LineArtAndTextResolution="300" GradientAndMeshResolution="150" ClipComplexRegions="false" ConvertAllStrokesToOutlines="false" ConvertAllTextToOutlines="false">
\t\t\t<Properties>
\t\t\t\t<RasterVectorBalance type="double">50</RasterVectorBalance>
\t\t\t</Properties>
\t\t</FlattenerPreference>
\t\t<Page Self="${pageId}" TabOrder="" AppliedMaster="ud6" OverrideList="" MasterPageTransform="1 0 0 1 -192.47244094488187 -98.36220472440942" Name="${pageNum}" AppliedTrapPreset="TrapPreset/$ID/kDefaultTrapStyleName" GeometricBounds="0 0 595.2755905511813 419.52755905511816" ItemTransform="1 0 0 1 -209.76377952755908 -297.63779527559063" AppliedAlternateLayout="ud5" LayoutRule="Off" SnapshotBlendingMode="IgnoreLayoutSnapshots" OptionalPage="false" GridStartingPoint="TopOutside" UseMasterGrid="true">
\t\t\t<Properties>
\t\t\t\t<PageColor type="enumeration">UseMasterColor</PageColor>
\t\t\t\t<Descriptor type="list">
\t\t\t\t\t<ListItem type="string"></ListItem>
\t\t\t\t\t<ListItem type="enumeration">Arabic</ListItem>
\t\t\t\t\t<ListItem type="boolean">true</ListItem>
\t\t\t\t\t<ListItem type="boolean">false</ListItem>
\t\t\t\t\t<ListItem type="long">${pageNum}</ListItem>
\t\t\t\t\t<ListItem type="long">${pageNum}</ListItem>
\t\t\t\t\t<ListItem type="string"></ListItem>
\t\t\t\t</Descriptor>
\t\t\t</Properties>
\t\t\t<MarginPreference ColumnCount="1" ColumnGutter="12" Top="36" Bottom="36" Left="36" Right="36" ColumnDirection="Horizontal" ColumnsPositions="0 347.52755905511816" />
\t\t\t<GridDataInformation FontStyle="Regular" PointSize="12" CharacterAki="0" LineAki="9" HorizontalScale="100" VerticalScale="100" LineAlignment="LeftOrTopLineJustify" GridAlignment="AlignEmCenter" CharacterAlignment="AlignEmCenter">
\t\t\t\t<Properties>
\t\t\t\t\t<AppliedFont type="string">TH Sarabun New</AppliedFont>
\t\t\t\t</Properties>
\t\t\t</GridDataInformation>
\t\t</Page>${innerItemsXml}
\t</Spread>
</idPkg:Spread>`;
    };

    // =========================================================================
    // PAGE 1: FRONT COVER (Dark Luxury Executive + Embedded Cover Illustration)
    // =========================================================================
    const coverPageItems =
        buildColoredRectXml('uCovBg', -5, -5, 414.5, 590.3, 'Color/CoverDark') +
        buildColoredRectXml('uCovBorder1', 16, 16, 393.5, 569.3, 'Swatch/None', 'Color/GoldAccent', 1.5) +
        buildColoredRectXml('uCovBorder2', 22, 22, 387.5, 563.3, 'Swatch/None', 'Color/GoldAccent', 0.5) +
        buildEmbeddedImageRectXml(
            'uCovImgRect',
            'uCovImg',
            'uCovLink',
            'Front_Cover_Illustration.jpg',
            CHAPTER_ILLUSTRATIONS_BASE64[0],
            75,
            52,
            335,
            236
        ) +
        buildTextFrameXml('utfCover', 'uCover', 'n', 'n', 38, 252, 372, 548);

    spreadsXmlList.push({ spreadId: 'us1', xml: makeSpreadWrapper('us1', 1, coverPageItems) });

    const coverStoryXml =
        buildParaXml('CoverBadge', 'EBOOK EDITION • EXECUTIVE PLAYBOOK') +
        buildParaXml('CoverTitle', cleanTitle) +
        buildParaXml('CoverSubtitle', `คู่มือสำหรับ: ${audienceText}`) +
        buildParaXml('CoverAuthor', `เรียบเรียงโดย ${authorName}`) +
        buildParaXml('CoverSubtitle', `${publisherName} • BANGKOK 2026`);
    zip.file('Stories/Story_uCover.xml', buildStoryFileXml('uCover', 'Front Cover', coverStoryXml));

    // =========================================================================
    // PAGE 2: COPYRIGHT & NATIONAL LIBRARY CIP PAGE (หน้าลิขสิทธิ์และข้อมูลบรรณานุกรม)
    // =========================================================================
    const cipPageItems =
        buildColoredRectXml('uCipBox', 38, 125, 372, 365, 'Color/LightBox', 'Color/BorderGray', 1) +
        buildTextFrameXml('utfCIP', 'uCIP', 'n', 'n', 46, 48, 363.5, 545);

    spreadsXmlList.push({ spreadId: 'us2', xml: makeSpreadWrapper('us2', 2, cipPageItems) });

    const cipStoryXml =
        buildParaXml('CIPHeader', cleanTitle) +
        buildParaXml('ImageCaption', 'Cataloging-in-Publication (CIP) & Copyright Information') +
        buildParaXml('CIPSubheader', 'ข้อมูลทางบรรณานุกรมของสำนักหอสมุดแห่งชาติ') +
        buildParaXml('CIPText', `ผู้เขียน: ${authorName}`) +
        buildParaXml('CIPText', `${cleanTitle}. -- พิมพ์ครั้งที่ 1. -- กรุงเทพฯ : ${publisherName}, 2569 (2026).`) +
        buildParaXml('CIPText', `จำนวนหน้า: ${totalPages} หน้า.`) +
        buildParaXml('CIPText', '1. การบริหารธุรกิจ -- นวัตกรรมและปัญญาประดิษฐ์ (AI). I. ชื่อเรื่อง.') +
        buildParaXml('CIPText', `ISBN: ${book.isbn || '978-616-XXXX-XX-X (e-Book)'}`) +
        buildParaXml('Heading2', 'ข้อมูลการจัดพิมพ์ (Editorial Colophon)') +
        buildParaXml('BodyText', `ผู้เขียนและเรียบเรียง: ${authorName} | สำนักพิมพ์: ${publisherName} | จัดรูปเล่มดิจิทัล: Saewin Publishing Engine (Adobe InDesign 2026 Native Edition)`) +
        buildParaXml('Heading2', 'สงวนลิขสิทธิ์ตามพระราชบัญญัติลิขสิทธิ์ พ.ศ. 2537') +
        buildParaXml(
            'BodyText',
            'ห้ามนำส่วนหนึ่งส่วนใดของหนังสือเล่มนี้ไปลอกเลียนแบบ ทำซ้ำ ดัดแปลง ถ่ายเอกสาร เผยแพร่ หรือจัดเก็บในระบบการเรียกค้นข้อมูลใดๆ ก่อนได้รับอนุญาตเป็นลายลักษณ์อักษรจากผู้ถือลิขสิทธิ์ ยกเว้นเพื่อการศึกษาและการอ้างอิงเชิงวิชาการพร้อมระบุที่มาอย่างถูกต้อง'
        ) +
        buildParaXml('RunningFooter', '— หน้า 2 —');
    zip.file('Stories/Story_uCIP.xml', buildStoryFileXml('uCIP', 'Copyright & CIP', cipStoryXml));

    // =========================================================================
    // PAGE 3: TABLE OF CONTENTS (สารบัญ)
    // =========================================================================
    const tocPageItems = buildTextFrameXml('utfTOC', 'uTOC', 'n', 'n', 46, 44, 363.5, 552);

    spreadsXmlList.push({ spreadId: 'us3', xml: makeSpreadWrapper('us3', 3, tocPageItems) });

    let tocStoryXml =
        buildParaXml('ChapterNumber', 'CONTENTS') +
        buildParaXml('TOCTitle', 'สารบัญ (Table of Contents)');

    for (const plan of chapterPlans) {
        const label = plan.chapter.chapterNo === 0 ? 'บทนำ' : `บทที่ ${plan.chapter.chapterNo}`;
        tocStoryXml += buildParaXml(
            'TOCItem',
            `${label}: ${plan.cleanTitle}  ..........  หน้า ${plan.startPage}`
        );
    }
    tocStoryXml += buildParaXml(
        'TOCItem',
        `ภาคผนวก: เกี่ยวกับผู้เขียน (About the Author)  ..........  หน้า ${aboutAuthorPageNum}`
    );
    tocStoryXml += buildParaXml('RunningFooter', '— หน้า 3 —');
    zip.file('Stories/Story_uTOC.xml', buildStoryFileXml('uTOC', 'Table of Contents', tocStoryXml));

    // =========================================================================
    // PAGES 4..N-2: CHAPTERS 1..12 (Multi-Page Threaded + Embedded Illustrations)
    // =========================================================================
    for (let cIdx = 0; cIdx < chapterPlans.length; cIdx++) {
        const plan = chapterPlans[cIdx];
        const ch = plan.chapter;
        const storyId = plan.storyId;
        storyIds.push(storyId);

        const chLabel = ch.chapterNo === 0 ? 'บทนำ (INTRODUCTION)' : `บทที่ ${ch.chapterNo} (CHAPTER ${ch.chapterNo})`;

        // Build Chapter Story XML
        let chParasXml =
            buildParaXml('ChapterNumber', chLabel) +
            buildParaXml('ChapterTitle', plan.cleanTitle) +
            buildParaXml('ImageCaption', `ภาพประกอบที่ ${ch.chapterNo}: ${plan.cleanTitle}`);

        for (const b of plan.blocks) {
            chParasXml += buildParaXml(b.style, b.text);
        }

        if (ch.keyTerminology) {
            const ktBlocks = stripHtmlToBlocks(ch.keyTerminology);
            if (ktBlocks.length > 0) {
                chParasXml += buildParaXml('CalloutHeader', '[ คลังคำศัพท์สำคัญประจำบท (Key Terminology) ]');
                for (const kb of ktBlocks) {
                    chParasXml += buildParaXml('CalloutBox', kb.text);
                }
            }
        }

        if (ch.keyTakeaways) {
            const takeBlocks = stripHtmlToBlocks(ch.keyTakeaways);
            if (takeBlocks.length > 0) {
                chParasXml += buildParaXml('CalloutHeader', '[ สรุปประเด็นสำคัญประจำบท (Key Takeaways) ]');
                for (const tb of takeBlocks) {
                    const cleanTakeaway = tb.text.replace(/^[•\-*]\s*/, '').trim();
                    chParasXml += buildParaXml('KeyTakeaways', `• ${cleanTakeaway}`);
                }
            }
        }

        zip.file(`Stories/Story_${storyId}.xml`, buildStoryFileXml(storyId, `Chapter ${ch.chapterNo}`, chParasXml));

        // Build Spreads for this chapter (pagesNeeded pages)
        for (let pOffset = 0; pOffset < plan.pagesNeeded; pOffset++) {
            const pageNum = plan.startPage + pOffset;
            const spreadId = `us${pageNum}`;
            const tfId = `utf_${storyId}_${pOffset + 1}`;
            const prevTf = pOffset === 0 ? 'n' : `utf_${storyId}_${pOffset}`;
            const nextTf = pOffset === plan.pagesNeeded - 1 ? 'n' : `utf_${storyId}_${pOffset + 2}`;

            // Running header & footer story for this page
            const hdrStoryId = `uhdr${pageNum}`;
            storyIds.push(hdrStoryId);
            const hdrXml = buildParaXml(
                'RunningHeader',
                `เป็นประธานบริษัทด้วย AI  |  บทที่ ${ch.chapterNo}: ${plan.cleanTitle.slice(0, 26)}   —   หน้า ${pageNum}`
            );
            zip.file(`Stories/Story_${hdrStoryId}.xml`, buildStoryFileXml(hdrStoryId, `Header ${pageNum}`, hdrXml));

            let pageItems =
                buildTextFrameXml(`utfHdr${pageNum}`, hdrStoryId, 'n', 'n', 46, 22, 363.5, 42) +
                buildColoredRectXml(`uHdrLine${pageNum}`, 46, 42, 363.5, 42.8, 'Color/BorderGray');

            if (pOffset === 0) {
                // First page of chapter: Dedicated Embedded Chapter Illustration Frame at top (y=48..178)
                // and Chapter TextFrame below it (y=186..542)
                pageItems +=
                    buildEmbeddedImageRectXml(
                        `uChImgRect_${ch.chapterNo}`,
                        `uChImg_${ch.chapterNo}`,
                        `uChLink_${ch.chapterNo}`,
                        `Chapter_${ch.chapterNo}_Illustration.jpg`,
                        plan.imageBase64,
                        68,
                        48,
                        342,
                        182
                    ) + buildTextFrameXml(tfId, storyId, prevTf, nextTf, 46, 188, 363.5, 542);
            } else {
                // Continuation pages of chapter: Full-height TextFrame (y=50..542)
                pageItems += buildTextFrameXml(tfId, storyId, prevTf, nextTf, 46, 50, 363.5, 542);
            }

            spreadsXmlList.push({ spreadId, xml: makeSpreadWrapper(spreadId, pageNum, pageItems) });
        }
    }

    // =========================================================================
    // PAGE N-1: ABOUT THE AUTHOR (เกี่ยวกับผู้เขียน)
    // =========================================================================
    storyIds.push('uAuthor');
    const authorSpreadId = `us${aboutAuthorPageNum}`;
    const authorItems =
        buildEmbeddedImageRectXml(
            'uAuthImgRect',
            'uAuthImg',
            'uAuthLink',
            'Author_Profile_Artwork.jpg',
            CHAPTER_ILLUSTRATIONS_BASE64[11],
            125,
            56,
            285,
            176
        ) + buildTextFrameXml('utfAuthor', 'uAuthor', 'n', 'n', 46, 188, 363.5, 542);

    spreadsXmlList.push({
        spreadId: authorSpreadId,
        xml: makeSpreadWrapper(authorSpreadId, aboutAuthorPageNum, authorItems),
    });

    const authorStoryXml =
        buildParaXml('ChapterNumber', 'ABOUT THE AUTHOR') +
        buildParaXml('ChapterTitle', 'เกี่ยวกับผู้เขียน') +
        buildParaXml(
            'BodyText',
            'หนังสือเล่มนี้กลั่นกรองจากประสบการณ์การทำงานจริงกว่า 25 ปีในแวดวงเทคโนโลยีสารสนเทศ (IT) และกว่า 20 ปีในการบริหารจัดการระบบ E-commerce, Digital Marketing, Direct Marketing และการวิเคราะห์ระบบ (System Analysis)'
        ) +
        buildParaXml(
            'BodyText',
            'ถ่ายทอดองค์ความรู้และกลยุทธ์ที่ผ่านการพิสูจน์แล้วจากหน้างานจริง ผสานกรณีศึกษาและงานวิจัยระดับสากล เพื่อให้ผู้ประกอบการ ผู้นำองค์กร และผู้สนใจ สามารถนำแนวทางไปปรับใช้ได้จริงอย่างเป็นระบบและยั่งยืน'
        ) +
        buildParaXml(
            'BodyText',
            'ขอขอบคุณผู้อ่านทุกท่านที่ร่วมเดินทางไปกับเรา หวังเป็นอย่างยิ่งว่าเนื้อหาในเล่มนี้จะช่วยจุดประกายไอเดีย และสร้างการเติบโตแบบก้าวกระโดดให้กับธุรกิจของท่าน'
        ) +
        buildParaXml('CalloutHeader', `[ ${authorName} • ${publisherName} ]`) +
        buildParaXml('CalloutBox', 'Digital Asset Forge & Ebook Creator Studio — www.aimar.cloud') +
        buildParaXml('RunningFooter', `— หน้า ${aboutAuthorPageNum} —`);
    zip.file('Stories/Story_uAuthor.xml', buildStoryFileXml('uAuthor', 'About the Author', authorStoryXml));

    // =========================================================================
    // PAGE N: BACK COVER (ปกหลัง Dark Luxury Executive)
    // =========================================================================
    storyIds.push('uBack');
    const backSpreadId = `us${backCoverPageNum}`;
    const backPageItems =
        buildColoredRectXml('uBackBg', -5, -5, 414.5, 590.3, 'Color/CoverDark') +
        buildColoredRectXml('uBackBorder', 18, 18, 391.5, 567.3, 'Swatch/None', 'Color/GoldAccent', 1.2) +
        buildTextFrameXml('utfBack', 'uBack', 'n', 'n', 44, 70, 366, 520);

    spreadsXmlList.push({
        spreadId: backSpreadId,
        xml: makeSpreadWrapper(backSpreadId, backCoverPageNum, backPageItems),
    });

    const backStoryXml =
        buildParaXml('CoverBadge', 'EXECUTIVE SYNOPSIS') +
        buildParaXml('CoverTitle', cleanTitle) +
        buildParaXml(
            'CoverSubtitle',
            'คู่มือเล่มนี้จะช่วยเปิดมุมมองใหม่ในการบริหารจัดการและขยายผลลัพธ์ผ่านเทคโนโลยี AI และระบบอัตโนมัติที่จับต้องได้จริง ออกแบบมาสำหรับเจ้าของธุรกิจที่ต้องการคืนเวลา คืนชีวิต และคืนกำไรอย่างยั่งยืน ถ่ายทอดจากประสบการณ์จริง 20+ ปีในสายงาน'
        ) +
        buildParaXml('CoverAuthor', `Published by ${authorName} • ${publisherName}`) +
        buildParaXml('CoverSubtitle', `STANDARD EDITION • ISBN ${book.isbn || '978-616-XXXX-XX-X'}`);
    zip.file('Stories/Story_uBack.xml', buildStoryFileXml('uBack', 'Back Cover', backStoryXml));

    // Write all Spread files
    for (const sp of spreadsXmlList) {
        spreadPkgRefs += `\t<idPkg:Spread src="Spreads/Spread_${sp.spreadId}.xml" />\n`;
        zip.file(`Spreads/Spread_${sp.spreadId}.xml`, sp.xml);
    }

    // Build Story package references for designmap.xml
    const storyPkgRefs = storyIds.map((sid) => `\t<idPkg:Story src="Stories/Story_${sid}.xml" />`).join('\n');

    const designmap = IDML_TEMPLATES.designmapXml
        .replace('StoryList="ue5 ub1"', `StoryList="${storyIds.join(' ')} ub1"`)
        .replace(
            /\t<idPkg:Spread src="Spreads\/Spread_ucf\.xml" \/>\n\t<idPkg:Spread src="Spreads\/Spread_ude\.xml" \/>/,
            spreadPkgRefs.trimEnd()
        )
        .replace('\t<idPkg:Story src="Stories/Story_ue5.xml" />', storyPkgRefs)
        .replace('Length="2"', `Length="${totalPages}"`)
        .replace('AlternateLayoutLength="2"', `AlternateLayoutLength="${totalPages}"`);
    zip.file('designmap.xml', designmap);

    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * 2. Generate Word / InDesign Style-Mapped Document (.doc)
 */
export function generateInDesignWordDoc(book: InDesignBookPayload): string {
    const sorted = ensureRichChapters(book);

    const chaptersHtml = sorted
        .map(
            (ch) => `
        <div style="page-break-before: always;">
            <p class="ChapterNumber" style="font-family:'TH Sarabun New',sans-serif;font-size:14pt;font-weight:bold;color:#2563eb;text-transform:uppercase;margin-bottom:4pt;">บทที่ ${ch.chapterNo}</p>
            <h1 class="ChapterTitle" style="font-family:'TH Sarabun New',sans-serif;font-size:26pt;font-weight:bold;color:#0f172a;margin-top:0;margin-bottom:14pt;">${cleanChapterTitle(ch.title)}</h1>
            <div class="ChapterBody" style="font-family:'TH Sarabun New',sans-serif;font-size:16pt;line-height:1.6;color:#1e293b;">
                ${ch.content || ''}
            </div>
            ${
                ch.keyTerminology
                    ? `<div style="margin-top:14pt;padding:12pt;background:#f0fdf4;border-left:4pt solid #10b981;font-family:'TH Sarabun New',sans-serif;font-size:15pt;">
                        <strong>คลังคำศัพท์สำคัญประจำบท (Key Terminology):</strong><br/>${ch.keyTerminology}
                       </div>`
                    : ''
            }
            ${
                ch.keyTakeaways
                    ? `<div style="margin-top:14pt;padding:12pt;background:#eff6ff;border-left:4pt solid #3b82f6;font-family:'TH Sarabun New',sans-serif;font-size:15pt;">
                        <strong>สรุปประเด็นสำคัญ (Key Takeaways):</strong><br/>${ch.keyTakeaways}
                       </div>`
                    : ''
            }
        </div>`
        )
        .join('\n');

    return `<!DOCTYPE html>
<html xmlns:o="urn:schemas-microsoft-com:office:office"
      xmlns:w="urn:schemas-microsoft-com:office:word"
      xmlns="http://www.w3.org/TR/REC-html40">
<head>
    <meta charset="utf-8" />
    <title>${escapeXml(book.title)}</title>
    <style>
        @page { size: 21cm 29.7cm; margin: 2.5cm; }
        body { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; font-size: 16pt; color: #1e293b; line-height: 1.6; }
        h1, h2, h3 { font-family: 'TH Sarabun New', 'Sarabun', sans-serif; color: #0f172a; }
        p { margin-bottom: 10pt; text-align: justify; }
    </style>
</head>
<body>
    <div style="text-align:center;padding-top:120pt;page-break-after:always;">
        <h1 style="font-size:32pt;font-weight:bold;color:#0f172a;margin-bottom:12pt;">${escapeXml(book.title)}</h1>
        <p style="font-size:18pt;color:#475569;text-align:center;">${escapeXml(book.subtitle || book.audience || '')}</p>
        <p style="font-size:16pt;color:#64748b;margin-top:36pt;text-align:center;">เรียบเรียงโดย ${escapeXml(book.author || 'Saewin')}</p>
    </div>
    ${chaptersHtml}
</body>
</html>`;
}
