
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { Document, Packer, Paragraph, Table, TableCell, TableRow, WidthType, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { format } from 'date-fns';

interface TimelineEvent {
 id: string;
 timestamp: string;
 user: { id: string; name: string; role: string };
 action: string;
 entityType: string;
 details: string;
 raw?: {
 oldValue: string | null;
 newValue: string | null;
 field: string | null;
 };
}

export const exportToPDF = (events: TimelineEvent[], caseNumber: string) => {
 const doc = new jsPDF();

 // Title
 doc.setFontSize(18);
 doc.text(`Case Timeline: #${caseNumber}`, 14, 22);

 doc.setFontSize(11);
 doc.text(`Generated on: ${format(new Date(), 'MMM d, yyyy h:mm a')}`, 14, 30);

 // Table
 const tableData = events.map(e => [
 format(new Date(e.timestamp), 'MMM d, yyyy h:mm a'),
 e.user.name + ` (${e.user.role})`,
 e.action,
 e.entityType,
 e.details + (e.raw?.field ? `\nChange: ${e.raw.field} from "${e.raw.oldValue || 'Empty'}" to "${e.raw.newValue || 'Empty'}"` : '')
 ]);

 autoTable(doc, {
 head: [['Date', 'User', 'Action', 'Entity', 'Details']],
 body: tableData,
 startY: 40,
 styles: { fontSize: 9 },
 headStyles: { fillColor: [66, 66, 66] }
 });

 doc.save(`Timeline_${caseNumber}.pdf`);
};

export const exportToExcel = (events: TimelineEvent[], caseNumber: string) => {
 const data = events.map(e => ({
 Date: format(new Date(e.timestamp), 'yyyy-MM-dd HH:mm:ss'),
 User: e.user.name,
 Role: e.user.role,
 Action: e.action,
 Entity: e.entityType,
 Details: e.details,
 FieldChanged: e.raw?.field || '',
 OldValue: e.raw?.oldValue || '',
 NewValue: e.raw?.newValue || ''
 }));

 const worksheet = XLSX.utils.json_to_sheet(data);
 const workbook = XLSX.utils.book_new();
 XLSX.utils.book_append_sheet(workbook, worksheet, "Timeline");
 XLSX.writeFile(workbook, `Timeline_${caseNumber}.xlsx`);
};

export const exportToWord = async (events: TimelineEvent[], caseNumber: string) => {
 // Header
 const title = new Paragraph({
 text: `Case Timeline: #${caseNumber}`,
 heading: HeadingLevel.HEADING_1,
 alignment: AlignmentType.CENTER,
 spacing: {
 after: 200
 }
 });

 const timestamp = new Paragraph({
 children: [
 new TextRun({
 text: `Generated on: ${format(new Date(), 'MMM d, yyyy h:mm a')}`,
 italics: true
 })
 ],
 alignment: AlignmentType.CENTER,
 spacing: {
 after: 400
 }
 });

 // Table Header
 const tableHeader = new TableRow({
 children: [
 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Date", bold: true })] })], width: { size: 15, type: WidthType.PERCENTAGE } }),
 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "User", bold: true })] })], width: { size: 20, type: WidthType.PERCENTAGE } }),
 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Action", bold: true })] })], width: { size: 10, type: WidthType.PERCENTAGE } }),
 new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Details", bold: true })] })], width: { size: 55, type: WidthType.PERCENTAGE } }),
 ],
 tableHeader: true,
 });

 // Table Rows
 const rows = events.map(e => {
 let detailsText = e.details;
 if (e.raw && e.raw.field) {
 detailsText += `\n[${e.raw.field} change]: ${e.raw.oldValue || 'Empty'} -> ${e.raw.newValue || 'Empty'}`;
 }

 return new TableRow({
 children: [
 new TableCell({ children: [new Paragraph(format(new Date(e.timestamp), 'MM/dd/yy HH:mm'))] }),
 new TableCell({ children: [new Paragraph(`${e.user.name}\n(${e.user.role})`)] }),
 new TableCell({ children: [new Paragraph(e.action)] }),
 new TableCell({ children: [new Paragraph(detailsText)] }),
 ],
 });
 });

 const table = new Table({
 rows: [tableHeader, ...rows],
 width: {
 size: 100,
 type: WidthType.PERCENTAGE,
 },
 });

 const doc = new Document({
 sections: [{
 children: [title, timestamp, table],
 }],
 });

 const blob = await Packer.toBlob(doc);
 saveAs(blob, `Timeline_${caseNumber}.docx`);
};
