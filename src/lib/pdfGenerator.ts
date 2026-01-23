'use client';

import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';

interface GrantReportData {
    generatedAt: string;
    generatedBy?: string;
    period: string;
    metrics: {
        totalIndividualsServed: number;
        totalAccommodationsProvided: number;
        totalCases: number;
    };
    demographics: {
        programs: Record<string, number>;
    };
    services: {
        accommodationTypes: Record<string, number>;
    };
}

export function generateGrantReportPDF(data: GrantReportData): void {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 20;
    let yPos = margin;

    // Colors
    const primaryColor: [number, number, number] = [79, 70, 229]; // Indigo
    const darkGray: [number, number, number] = [55, 65, 81];
    const lightGray: [number, number, number] = [107, 114, 128];

    // Header Banner
    doc.setFillColor(...primaryColor);
    doc.rect(0, 0, pageWidth, 45, 'F');

    // Logo/Title
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('AccommAlly', margin, 22);

    doc.setFontSize(14);
    doc.setFont('helvetica', 'normal');
    doc.text('Grant Reporting Summary', margin, 34);

    // Report metadata (right side of header)
    doc.setFontSize(10);
    doc.text(`Generated: ${format(new Date(data.generatedAt), 'MMMM d, yyyy')}`, pageWidth - margin, 22, { align: 'right' });
    doc.text(`Period: ${data.period}`, pageWidth - margin, 32, { align: 'right' });

    yPos = 60;

    // Executive Summary Section
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Executive Summary', margin, yPos);
    yPos += 10;

    // Key Metrics Cards (simulated)
    doc.setFillColor(249, 250, 251); // Light gray bg
    const cardWidth = (pageWidth - margin * 2 - 20) / 3;
    const cardHeight = 40;

    // Card 1: Individuals Served
    doc.roundedRect(margin, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...lightGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Individuals Served', margin + 10, yPos + 15);
    doc.setTextColor(...darkGray);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.metrics.totalIndividualsServed), margin + 10, yPos + 32);

    // Card 2: Total Cases
    const card2X = margin + cardWidth + 10;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(card2X, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...lightGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Total Cases', card2X + 10, yPos + 15);
    doc.setTextColor(...darkGray);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.metrics.totalCases), card2X + 10, yPos + 32);

    // Card 3: Accommodations Provided
    const card3X = margin + (cardWidth + 10) * 2;
    doc.setFillColor(249, 250, 251);
    doc.roundedRect(card3X, yPos, cardWidth, cardHeight, 3, 3, 'F');
    doc.setTextColor(...lightGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Accommodations', card3X + 10, yPos + 15);
    doc.setTextColor(...darkGray);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text(String(data.metrics.totalAccommodationsProvided), card3X + 10, yPos + 32);

    yPos += cardHeight + 20;

    // Program Distribution Section
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Program Distribution', margin, yPos);
    yPos += 5;

    const programData = Object.entries(data.demographics.programs).map(([name, count]) => [name, count.toString()]);
    if (programData.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['Program', 'Cases']],
            body: programData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 10
            },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 40, halign: 'center' }
            },
            margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    } else {
        yPos += 10;
        doc.setTextColor(...lightGray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No program data available', margin, yPos);
        yPos += 15;
    }

    // Accommodations Section
    doc.setTextColor(...primaryColor);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Accommodation Types Provided', margin, yPos);
    yPos += 5;

    const accommodationData = Object.entries(data.services.accommodationTypes).map(([type, count]) => [type, count.toString()]);
    if (accommodationData.length > 0) {
        autoTable(doc, {
            startY: yPos,
            head: [['Accommodation Type', 'Count']],
            body: accommodationData,
            theme: 'striped',
            headStyles: {
                fillColor: primaryColor,
                fontSize: 10,
                fontStyle: 'bold'
            },
            bodyStyles: {
                fontSize: 10
            },
            columnStyles: {
                0: { cellWidth: 100 },
                1: { cellWidth: 40, halign: 'center' }
            },
            margin: { left: margin, right: margin }
        });
        yPos = (doc as any).lastAutoTable.finalY + 15;
    } else {
        yPos += 10;
        doc.setTextColor(...lightGray);
        doc.setFontSize(10);
        doc.setFont('helvetica', 'italic');
        doc.text('No accommodation data available', margin, yPos);
        yPos += 15;
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight();
    doc.setDrawColor(229, 231, 235); // Light border
    doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);

    doc.setTextColor(...lightGray);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text('This report was generated by AccommAlly Case Management System', margin, pageHeight - 18);
    doc.text(`Report ID: GR-${format(new Date(), 'yyyyMMddHHmmss')}`, margin, pageHeight - 12);
    doc.text('Confidential - For Grant Reporting Purposes Only', pageWidth - margin, pageHeight - 15, { align: 'right' });

    // Save the PDF
    doc.save(`AccommAlly-Grant-Report-${format(new Date(), 'yyyy-MM-dd')}.pdf`);
}
