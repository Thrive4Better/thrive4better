import type { ModularCarePlan, CarePlanSection, Client } from '@/types';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Helpers ──

function fmtDate(dateStr: string): string {
  if (!dateStr) return '';
  try {
    return format(new Date(dateStr), 'dd/MM/yyyy');
  } catch {
    return dateStr;
  }
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

// ── XML Export ──

export function carePlanToXml(plan: ModularCarePlan, client: Client): string {
  const sections = [...plan.sections].sort((a, b) => a.order - b.order);

  const sectionXml = sections
    .map(
      (s) => `    <section id="${escapeXml(s.id)}" type="${escapeXml(s.type)}" order="${s.order}">
      <title>${escapeXml(s.title)}</title>
      <content>${escapeXml(s.content)}</content>
      <lastUpdated>${escapeXml(s.lastUpdated)}</lastUpdated>
      <generatedByAi>${s.generatedByAi}</generatedByAi>
    </section>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<carePlan version="${escapeXml(plan.templateVersion)}" exportDate="${new Date().toISOString()}">
  <metadata>
    <planId>${escapeXml(plan.id)}</planId>
    <createdAt>${escapeXml(plan.createdAt)}</createdAt>
    <updatedAt>${escapeXml(plan.updatedAt)}</updatedAt>
    <lastReviewedDate>${escapeXml(plan.lastReviewedDate)}</lastReviewedDate>
    <nextReviewDueDate>${escapeXml(plan.nextReviewDueDate)}</nextReviewDueDate>
  </metadata>
  <participant>
    <name>${escapeXml(client.firstName)} ${escapeXml(client.lastName)}</name>
    <dateOfBirth>${escapeXml(client.dateOfBirth)}</dateOfBirth>
    <ndisNumber>${escapeXml(client.ndisNumber)}</ndisNumber>
    <address>${escapeXml(client.address)}, ${escapeXml(client.suburb)} ${escapeXml(client.postcode)}</address>
    <phone>${escapeXml(client.phone)}</phone>
    <email>${escapeXml(client.email)}</email>
    <fundingType>${escapeXml(client.fundingType)}</fundingType>
    <planStartDate>${escapeXml(client.planStartDate)}</planStartDate>
    <planEndDate>${escapeXml(client.planEndDate)}</planEndDate>
    <planManager>${escapeXml(client.planManagerName || '')}</planManager>
  </participant>
  <sections>
${sectionXml}
  </sections>
</carePlan>`;
}

// ── DOCX Export (Office Open XML) ──

export function carePlanToDocx(plan: ModularCarePlan, client: Client): Blob {
  const sections = [...plan.sections].sort((a, b) => a.order - b.order);

  function docxParagraph(text: string, style?: string): string {
    const styleTag = style ? `<w:pStyle w:val="${style}"/>` : '';
    // Split by newlines for multi-line content
    const lines = text.split('\n');
    const runs = lines
      .map(
        (line, i) =>
          `<w:r><w:t xml:space="preserve">${escapeXml(line)}</w:t></w:r>${i < lines.length - 1 ? '<w:r><w:br/></w:r>' : ''}`,
      )
      .join('');
    return `<w:p><w:pPr>${styleTag}</w:pPr>${runs}</w:p>`;
  }

  const sectionContent = sections
    .map(
      (s) =>
        docxParagraph(s.title, 'Heading2') +
        docxParagraph(s.content) +
        docxParagraph(''),
    )
    .join('');

  const documentXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
  xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
  xmlns:o="urn:schemas-microsoft-com:office:office"
  xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
  xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
  xmlns:v="urn:schemas-microsoft-com:vml"
  xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
  xmlns:w10="urn:schemas-microsoft-com:office:word"
  xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
  xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml">
  <w:body>
    ${docxParagraph('CARE PLAN', 'Title')}
    ${docxParagraph(`${client.firstName} ${client.lastName}`, 'Heading1')}
    ${docxParagraph('')}
    ${docxParagraph(`Date of Birth: ${fmtDate(client.dateOfBirth)}`)}
    ${docxParagraph(`NDIS Number: ${client.ndisNumber}`)}
    ${docxParagraph(`Address: ${client.address}, ${client.suburb} ${client.postcode}`)}
    ${docxParagraph(`Plan Period: ${fmtDate(client.planStartDate)} - ${fmtDate(client.planEndDate)}`)}
    ${client.planManagerName ? docxParagraph(`Plan Manager: ${client.planManagerName}`) : ''}
    ${docxParagraph('')}
    ${sectionContent}
    ${docxParagraph('')}
    ${docxParagraph('Thrive 4 Better | ABN 15 694 748 297 | 20 Zelkova Cct, Fraser Rise VIC 3336')}
    <w:sectPr>
      <w:pgSz w:w="11906" w:h="16838"/>
      <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="720" w:footer="720"/>
    </w:sectPr>
  </w:body>
</w:document>`;

  const stylesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
  <w:style w:type="paragraph" w:styleId="Title">
    <w:name w:val="Title"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="48"/><w:color w:val="2D5A3D"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading1">
    <w:name w:val="heading 1"/>
    <w:pPr><w:jc w:val="center"/></w:pPr>
    <w:rPr><w:b/><w:sz w:val="36"/><w:color w:val="2D5A3D"/></w:rPr>
  </w:style>
  <w:style w:type="paragraph" w:styleId="Heading2">
    <w:name w:val="heading 2"/>
    <w:rPr><w:b/><w:sz w:val="28"/><w:color w:val="2D5A3D"/></w:rPr>
  </w:style>
</w:styles>`;

  const contentTypesXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
  <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
</Types>`;

  const relsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>`;

  const wordRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`;

  // Build a minimal ZIP file manually (PKZIP format)
  // This is a simplified ZIP builder for the OOXML package
  const files: { name: string; content: string }[] = [
    { name: '[Content_Types].xml', content: contentTypesXml },
    { name: '_rels/.rels', content: relsXml },
    { name: 'word/document.xml', content: documentXml },
    { name: 'word/styles.xml', content: stylesXml },
    { name: 'word/_rels/document.xml.rels', content: wordRelsXml },
  ];

  return createZipBlob(files);
}

// ── Minimal ZIP builder ──

function createZipBlob(files: { name: string; content: string }[]): Blob {
  const encoder = new TextEncoder();
  const localHeaders: Uint8Array[] = [];
  const centralHeaders: Uint8Array[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBytes = encoder.encode(file.name);
    const contentBytes = encoder.encode(file.content);
    const crc = crc32(contentBytes);

    // Local file header
    const localHeader = new Uint8Array(30 + nameBytes.length + contentBytes.length);
    const lhView = new DataView(localHeader.buffer);
    lhView.setUint32(0, 0x04034b50, true); // signature
    lhView.setUint16(4, 20, true); // version needed
    lhView.setUint16(6, 0, true); // flags
    lhView.setUint16(8, 0, true); // compression (store)
    lhView.setUint16(10, 0, true); // mod time
    lhView.setUint16(12, 0, true); // mod date
    lhView.setUint32(14, crc, true); // crc32
    lhView.setUint32(18, contentBytes.length, true); // compressed size
    lhView.setUint32(22, contentBytes.length, true); // uncompressed size
    lhView.setUint16(26, nameBytes.length, true); // filename length
    lhView.setUint16(28, 0, true); // extra field length
    localHeader.set(nameBytes, 30);
    localHeader.set(contentBytes, 30 + nameBytes.length);
    localHeaders.push(localHeader);

    // Central directory header
    const centralHeader = new Uint8Array(46 + nameBytes.length);
    const chView = new DataView(centralHeader.buffer);
    chView.setUint32(0, 0x02014b50, true); // signature
    chView.setUint16(4, 20, true); // version made by
    chView.setUint16(6, 20, true); // version needed
    chView.setUint16(8, 0, true); // flags
    chView.setUint16(10, 0, true); // compression
    chView.setUint16(12, 0, true); // mod time
    chView.setUint16(14, 0, true); // mod date
    chView.setUint32(16, crc, true); // crc32
    chView.setUint32(20, contentBytes.length, true); // compressed size
    chView.setUint32(24, contentBytes.length, true); // uncompressed size
    chView.setUint16(28, nameBytes.length, true); // filename length
    chView.setUint16(30, 0, true); // extra field length
    chView.setUint16(32, 0, true); // comment length
    chView.setUint16(34, 0, true); // disk number start
    chView.setUint16(36, 0, true); // internal file attributes
    chView.setUint32(38, 0, true); // external file attributes
    chView.setUint32(42, offset, true); // relative offset
    centralHeader.set(nameBytes, 46);
    centralHeaders.push(centralHeader);

    offset += localHeader.length;
  }

  const centralDirOffset = offset;
  let centralDirSize = 0;
  for (const ch of centralHeaders) centralDirSize += ch.length;

  // End of central directory
  const eocd = new Uint8Array(22);
  const eocdView = new DataView(eocd.buffer);
  eocdView.setUint32(0, 0x06054b50, true);
  eocdView.setUint16(4, 0, true); // disk number
  eocdView.setUint16(6, 0, true); // disk with CD
  eocdView.setUint16(8, files.length, true); // entries on disk
  eocdView.setUint16(10, files.length, true); // total entries
  eocdView.setUint32(12, centralDirSize, true);
  eocdView.setUint32(16, centralDirOffset, true);
  eocdView.setUint16(20, 0, true); // comment length

  const parts: BlobPart[] = [...localHeaders.map(b => new Uint8Array(b.buffer as ArrayBuffer)), ...centralHeaders.map(b => new Uint8Array(b.buffer as ArrayBuffer)), new Uint8Array(eocd.buffer as ArrayBuffer)];
  return new Blob(parts, {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  });
}

// ── CRC32 ──

function crc32(data: Uint8Array): number {
  let crc = 0xffffffff;
  for (let i = 0; i < data.length; i++) {
    crc ^= data[i];
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// ── Download helpers ──

export function downloadXml(plan: ModularCarePlan, client: Client): void {
  const xml = carePlanToXml(plan, client);
  const blob = new Blob([xml], { type: 'application/xml;charset=utf-8' });
  const filename = `care-plan-${client.firstName}-${client.lastName}.xml`;
  triggerDownload(blob, filename);
  toast.success(`Downloaded ${filename}`);
}

export function downloadDocx(plan: ModularCarePlan, client: Client): void {
  const blob = carePlanToDocx(plan, client);
  const filename = `care-plan-${client.firstName}-${client.lastName}.docx`;
  triggerDownload(blob, filename);
  toast.success(`Downloaded ${filename}`);
}

function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
