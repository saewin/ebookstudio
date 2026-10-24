/**
 * Adobe InDesign Document Generator (.idml, .icml, .doc)
 * Generates native Adobe InDesign 2026 (.idml) multi-page packages that open directly
 * via File > Open (Cmd+O) or double-click in Adobe InDesign!
 */

import JSZip from 'jszip';
import { IDML_TEMPLATES } from './idmlTemplates';

export interface InDesignChapter {
    chapterNo: number;
    title: string;
    content: string;
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
    return String(unsafe || '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

export function stripHtmlToBlocks(html: string): Array<{ style: string; text: string }> {
    if (!html) return [];
    const blocks: Array<{ style: string; text: string }> = [];

    const normalized = html
        .replace(/<\/(h1|h2|h3|p|li|blockquote|div)>/gi, '$&\n')
        .replace(/<br\s*\/?>/gi, '\n');

    const lines = normalized.split('\n');
    for (const rawLine of lines) {
        const line = rawLine.trim();
        if (!line) continue;

        let style = 'BodyText';
        if (/<h1[^>]*>/i.test(line) || /^#\s+/.test(line)) style = 'Heading1';
        else if (/<h2[^>]*>/i.test(line) || /^##\s+/.test(line)) style = 'Heading2';
        else if (/<h3[^>]*>/i.test(line) || /^###\s+/.test(line)) style = 'Heading2';
        else if (/<li[^>]*>/i.test(line) || /^[-•*]\s+/.test(line)) style = 'BulletList';

        const cleanText = line
            .replace(/<[^>]+>/g, '')
            .replace(/^#{1,4}\s+/, '')
            .replace(/^[-•*]\s+/, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .trim();

        if (cleanText) {
            blocks.push({
                style,
                text: style === 'BulletList' ? `• ${cleanText}` : cleanText,
            });
        }
    }

    return blocks;
}

const CUSTOM_PARAGRAPH_STYLES_XML = `
\t\t<ParagraphStyle Self="ParagraphStyle/BookTitle" Name="BookTitle" PointSize="22" FontStyle="Bold" SpaceAfter="12" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/BookSubtitle" Name="BookSubtitle" PointSize="13" FontStyle="Regular" SpaceAfter="24" Justification="CenterAlign">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/ChapterNumber" Name="ChapterNumber" PointSize="12" FontStyle="Bold" SpaceBefore="18" SpaceAfter="4" StartParagraph="NextFrame">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/ChapterTitle" Name="ChapterTitle" PointSize="18" FontStyle="Bold" SpaceAfter="14">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/Heading1" Name="Heading1" PointSize="15" FontStyle="Bold" SpaceBefore="14" SpaceAfter="6">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/Heading2" Name="Heading2" PointSize="13" FontStyle="Bold" SpaceBefore="10" SpaceAfter="4">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/BodyText" Name="BodyText" PointSize="11" FontStyle="Regular" SpaceAfter="8">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/BulletList" Name="BulletList" PointSize="11" FontStyle="Regular" LeftIndent="14" SpaceAfter="4">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>
\t\t<ParagraphStyle Self="ParagraphStyle/KeyTakeaways" Name="KeyTakeaways" PointSize="11" FontStyle="Bold" SpaceBefore="8" SpaceAfter="8">
\t\t\t<Properties><BasedOn type="string">$ID/NormalParagraphStyle</BasedOn><AppliedFont type="string">Tahoma</AppliedFont></Properties>
\t\t</ParagraphStyle>`;

/**
 * 1. Generate Native Adobe InDesign (.idml) Multi-Page Document Package
 * Opens directly via File > Open (Cmd+O) in Adobe InDesign!
 */
export async function generateBookIdmlBuffer(book: InDesignBookPayload): Promise<Buffer> {
    const zip = new JSZip();

    // 1. mimetype MUST be the first entry and uncompressed (STORE)
    zip.file('mimetype', 'application/vnd.adobe.indesign-idml-package', { compression: 'STORE' });

    // 2. Core IDML package files
    zip.file('META-INF/container.xml', IDML_TEMPLATES.containerXml);
    zip.file('XML/BackingStory.xml', IDML_TEMPLATES.backingStoryXml);
    zip.file('XML/Tags.xml', IDML_TEMPLATES.tagsXml);
    zip.file('Resources/Graphic.xml', IDML_TEMPLATES.graphicXml);
    zip.file('Resources/Fonts.xml', IDML_TEMPLATES.fontsXml);

    const stylesXml = IDML_TEMPLATES.stylesXml.replace(
        '</RootParagraphStyleGroup>',
        `${CUSTOM_PARAGRAPH_STYLES_XML}\n\t</RootParagraphStyleGroup>`
    );
    zip.file('Resources/Styles.xml', stylesXml);
    zip.file('Resources/Preferences.xml', IDML_TEMPLATES.preferencesXml);
    zip.file('MasterSpreads/MasterSpread_ud6.xml', IDML_TEMPLATES.masterSpreadXml);

    const sortedChapters = [...(book.chapters || [])].sort((a, b) => a.chapterNo - b.chapterNo);
    const numPages = Math.max(12, sortedChapters.length * 4 + 2);
    let spreadPkgRefs = '';

    for (let i = 1; i <= numPages; i++) {
        const spreadId = `us${i}`;
        const pageId = i === 1 ? 'ud4' : `up${i}`;
        const tfId = `utf${i}`;
        const prevTf = i === 1 ? 'n' : `utf${i - 1}`;
        const nextTf = i === numPages ? 'n' : `utf${i + 1}`;
        const yOffset = (i - 1) * 775.2755905511813;

        spreadPkgRefs += `\t<idPkg:Spread src="Spreads/Spread_${spreadId}.xml" />\n`;

        const spreadXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Spread xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.5">
\t<Spread Self="${spreadId}" PageTransitionType="None" PageTransitionDirection="NotApplicable" PageTransitionDuration="Medium" ShowMasterItems="true" PageCount="1" BindingLocation="0" SpreadHidden="false" AllowPageShuffle="true" ItemTransform="1 0 0 1 0 ${yOffset}" FlattenerOverride="Default">
\t\t<FlattenerPreference LineArtAndTextResolution="300" GradientAndMeshResolution="150" ClipComplexRegions="false" ConvertAllStrokesToOutlines="false" ConvertAllTextToOutlines="false">
\t\t\t<Properties>
\t\t\t\t<RasterVectorBalance type="double">50</RasterVectorBalance>
\t\t\t</Properties>
\t\t</FlattenerPreference>
\t\t<Page Self="${pageId}" TabOrder="" AppliedMaster="ud6" OverrideList="" MasterPageTransform="1 0 0 1 -192.47244094488187 -98.36220472440942" Name="${i}" AppliedTrapPreset="TrapPreset/$ID/kDefaultTrapStyleName" GeometricBounds="0 0 595.2755905511813 419.52755905511816" ItemTransform="1 0 0 1 -209.76377952755908 -297.63779527559063" AppliedAlternateLayout="ud5" LayoutRule="Off" SnapshotBlendingMode="IgnoreLayoutSnapshots" OptionalPage="false" GridStartingPoint="TopOutside" UseMasterGrid="true">
\t\t\t<Properties>
\t\t\t\t<PageColor type="enumeration">UseMasterColor</PageColor>
\t\t\t\t<Descriptor type="list">
\t\t\t\t\t<ListItem type="string"></ListItem>
\t\t\t\t\t<ListItem type="enumeration">Arabic</ListItem>
\t\t\t\t\t<ListItem type="boolean">true</ListItem>
\t\t\t\t\t<ListItem type="boolean">false</ListItem>
\t\t\t\t\t<ListItem type="long">${i}</ListItem>
\t\t\t\t\t<ListItem type="long">${i}</ListItem>
\t\t\t\t\t<ListItem type="string"></ListItem>
\t\t\t\t</Descriptor>
\t\t\t</Properties>
\t\t\t<MarginPreference ColumnCount="1" ColumnGutter="12" Top="36" Bottom="36" Left="36" Right="36" ColumnDirection="Horizontal" ColumnsPositions="0 347.52755905511816" />
\t\t\t<GridDataInformation FontStyle="Regular" PointSize="12" CharacterAki="0" LineAki="9" HorizontalScale="100" VerticalScale="100" LineAlignment="LeftOrTopLineJustify" GridAlignment="AlignEmCenter" CharacterAlignment="AlignEmCenter">
\t\t\t\t<Properties>
\t\t\t\t\t<AppliedFont type="string">Tahoma</AppliedFont>
\t\t\t\t</Properties>
\t\t\t</GridDataInformation>
\t\t</Page>
\t\t<TextFrame Self="${tfId}" ParentStory="ue5" PreviousTextFrame="${prevTf}" NextTextFrame="${nextTf}" ContentType="TextType" OverriddenPageItemProps="" FlexItemWidthMode="FlexFixed" FlexItemHeightMode="FlexFixed" Visible="true" Name="$ID/" HorizontalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" VerticalLayoutConstraints="FlexibleDimension FixedDimension FlexibleDimension" GradientFillStart="0 0" GradientFillLength="0" GradientFillAngle="0" GradientStrokeStart="0 0" GradientStrokeLength="0" GradientStrokeAngle="0" ItemLayer="ucc" Locked="false" LocalDisplaySetting="Default" GradientFillHiliteLength="0" GradientFillHiliteAngle="0" GradientStrokeHiliteLength="0" GradientStrokeHiliteAngle="0" AppliedObjectStyle="ObjectStyle/$ID/[Normal Text Frame]" ItemTransform="1 0 0 1 -204.76377952755908 -292.63779527559063" BeforeGroupingLayerPosition="-1" ParentInterfaceChangeCount="" TargetInterfaceChangeCount="" LastUpdatedInterfaceChangeCount="">
\t\t\t<Properties>
\t\t\t\t<PathGeometry>
\t\t\t\t\t<GeometryPathType PathOpen="false">
\t\t\t\t\t\t<PathPointArray>
\t\t\t\t\t\t\t<PathPointType Anchor="46.02362204724321 51.69291338582957" LeftDirection="46.02362204724321 51.69291338582957" RightDirection="46.02362204724321 51.69291338582957" />
\t\t\t\t\t\t\t<PathPointType Anchor="46.02362204724321 533.5826771653572" LeftDirection="46.02362204724321 533.5826771653572" RightDirection="46.02362204724321 533.5826771653572" />
\t\t\t\t\t\t\t<PathPointType Anchor="363.5039370078731 533.5826771653572" LeftDirection="363.5039370078731 533.5826771653572" RightDirection="363.5039370078731 533.5826771653572" />
\t\t\t\t\t\t\t<PathPointType Anchor="363.5039370078731 51.69291338582957" LeftDirection="363.5039370078731 51.69291338582957" RightDirection="363.5039370078731 51.69291338582957" />
\t\t\t\t\t\t</PathPointArray>
\t\t\t\t\t</GeometryPathType>
\t\t\t\t</PathGeometry>
\t\t\t</Properties>
\t\t\t<TextFramePreference TextColumnCount="1" TextColumnFixedWidth="317.4803149606299" TextColumnMaxWidth="0">
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
\t\t</TextFrame>
\t</Spread>
</idPkg:Spread>`;

        zip.file(`Spreads/Spread_${spreadId}.xml`, spreadXml);
    }

    const designmap = IDML_TEMPLATES.designmapXml
        .replace(
            /\t<idPkg:Spread src="Spreads\/Spread_ucf\.xml" \/>\n\t<idPkg:Spread src="Spreads\/Spread_ude\.xml" \/>/,
            spreadPkgRefs.trimEnd()
        )
        .replace('Length="2"', `Length="${numPages}"`)
        .replace('AlternateLayoutLength="2"', `AlternateLayoutLength="${numPages}"`);
    zip.file('designmap.xml', designmap);

    let paragraphsXml = `
\t\t<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/BookTitle">
\t\t\t<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
\t\t\t\t<Content>${escapeXml(book.title)}</Content>
\t\t\t\t<Br />
\t\t\t</CharacterStyleRange>
\t\t</ParagraphStyleRange>
\t\t<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/BookSubtitle">
\t\t\t<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
\t\t\t\t<Content>${escapeXml(book.subtitle || book.audience || 'Digital Asset Forge • Publishing Edition')}</Content>
\t\t\t\t<Br />
\t\t\t</CharacterStyleRange>
\t\t</ParagraphStyleRange>`;

    for (const ch of sortedChapters) {
        paragraphsXml += `
\t\t<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/ChapterNumber">
\t\t\t<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
\t\t\t\t<Content>CHAPTER ${escapeXml(String(ch.chapterNo))}</Content>
\t\t\t\t<Br />
\t\t\t</CharacterStyleRange>
\t\t</ParagraphStyleRange>
\t\t<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/ChapterTitle">
\t\t\t<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
\t\t\t\t<Content>${escapeXml(ch.title)}</Content>
\t\t\t\t<Br />
\t\t\t</CharacterStyleRange>
\t\t</ParagraphStyleRange>`;

        const blocks = stripHtmlToBlocks(ch.content || '');
        for (const block of blocks) {
            paragraphsXml += `
\t\t<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/${block.style}">
\t\t\t<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
\t\t\t\t<Content>${escapeXml(block.text)}</Content>
\t\t\t\t<Br />
\t\t\t</CharacterStyleRange>
\t\t</ParagraphStyleRange>`;
        }

        if (ch.keyTakeaways) {
            const ktBlocks = stripHtmlToBlocks(ch.keyTakeaways);
            for (const kt of ktBlocks) {
                paragraphsXml += `
\t\t<ParagraphStyleRange AppliedParagraphStyle="ParagraphStyle/KeyTakeaways">
\t\t\t<CharacterStyleRange AppliedCharacterStyle="CharacterStyle/$ID/[No character style]">
\t\t\t\t<Content>★ ${escapeXml(kt.text)}</Content>
\t\t\t\t<Br />
\t\t\t</CharacterStyleRange>
\t\t</ParagraphStyleRange>`;
            }
        }
    }

    const storyXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<idPkg:Story xmlns:idPkg="http://ns.adobe.com/AdobeInDesign/idml/1.0/packaging" DOMVersion="21.5">
\t<Story Self="ue5" UserText="true" IsEndnoteStory="false" AppliedTOCStyle="n" TrackChanges="false" StoryTitle="${escapeXml(book.title)}" AppliedNamedGrid="n">
\t\t<StoryPreference OpticalMarginAlignment="false" OpticalMarginSize="12" FrameType="TextFrameType" StoryOrientation="Horizontal" StoryDirection="LeftToRightDirection" />
\t\t<InCopyExportOption IncludeGraphicProxies="true" IncludeAllResources="false" />${paragraphsXml}
\t</Story>
</idPkg:Story>`;
    zip.file('Stories/Story_ue5.xml', storyXml);

    return await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

/**
 * 2. Generate Word / InDesign Style-Mapped Document (.doc)
 */
export function generateInDesignWordDoc(book: InDesignBookPayload): string {
    const sorted = [...(book.chapters || [])].sort((a, b) => a.chapterNo - b.chapterNo);

    const chaptersHtml = sorted
        .map(
            (ch) => `
        <div style="page-break-before: always;">
            <p class="ChapterNumber" style="font-size:12pt;font-weight:bold;color:#4f46e5;text-transform:uppercase;margin-bottom:4pt;">CHAPTER ${ch.chapterNo}</p>
            <h1 class="ChapterTitle" style="font-size:22pt;font-weight:bold;color:#0f172a;margin-top:0;margin-bottom:14pt;">${ch.title}</h1>
            <div class="ChapterBody" style="font-size:11pt;line-height:1.7;color:#1e293b;">
                ${ch.content || ''}
            </div>
            ${
                ch.keyTerminology
                    ? `<div style="margin-top:14pt;padding:10pt;background:#f8fafc;border-left:3pt solid #64748b;">
                        <p style="font-weight:bold;margin:0 0 4pt 0;">คำศัพท์สำคัญ (Key Terminology)</p>
                        <div>${ch.keyTerminology}</div>
                       </div>`
                    : ''
            }
            ${
                ch.keyTakeaways
                    ? `<div style="margin-top:10pt;padding:10pt;background:#eff6ff;border-left:3pt solid #2563eb;">
                        <p style="font-weight:bold;margin:0 0 4pt 0;">สรุปประเด็นสำคัญ (Key Takeaways)</p>
                        <div>${ch.keyTakeaways}</div>
                       </div>`
                    : ''
            }
        </div>`
        )
        .join('\n');

    return `<html xmlns:o="urn:schemas-microsoft-com:office:office"
xmlns:w="urn:schemas-microsoft-com:office:word"
xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${book.title}</title>
<style>
  @page { size: 148mm 210mm; margin: 20mm 18mm 20mm 20mm; }
  body { font-family: "Sarabun", "TH Sarabun New", "Leelawadee UI", sans-serif; font-size: 11pt; line-height: 1.65; color: #1e293b; }
  h1 { font-size: 20pt; font-weight: bold; page-break-after: avoid; }
  h2 { font-size: 15pt; font-weight: bold; margin-top: 14pt; }
  h3 { font-size: 13pt; font-weight: bold; margin-top: 10pt; }
  p { margin: 0 0 8pt 0; text-align: justify; }
  ul, ol { margin: 0 0 10pt 18pt; }
  li { margin-bottom: 4pt; }
</style>
</head>
<body>
  <div style="text-align:center;padding-top:60pt;page-break-after:always;">
    <h1 style="font-size:26pt;margin-bottom:10pt;">${book.title}</h1>
    <p style="font-size:13pt;color:#475569;text-align:center;">${book.subtitle || book.audience || ''}</p>
    <p style="font-size:11pt;color:#64748b;text-align:center;margin-top:30pt;">Author: ${book.author || 'Saewin'} | Publisher: ${book.publisher || 'Selfpreneur Publishing'}</p>
  </div>
  ${chaptersHtml}
</body>
</html>`;
}
