// File: src/services/pdfService.js

const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const moment = require('moment'); // Diperlukan untuk format tanggal

moment.locale('id');

class PDFService {
  
  // =======================================================
  // Fungsi BAPB (Disederhanakan untuk kelengkapan)
  // =======================================================
  buildBAPBPDF(data, signatures, stream) {
    const doc = new PDFDocument({ size: 'A4', margin: 50 });
    doc.pipe(stream);

    // Header BAPB
    doc.fontSize(16).font('Helvetica-Bold').text('BERITA ACARA PEMERIKSAAN BARANG (BAPB)', { align: 'center' }).moveDown(0.5);
    doc.fontSize(10).font('Helvetica').text(`No: ${data.bapbNumber}`, { align: 'center' }).moveDown(1.5);
    
    doc.fontSize(12).font('Helvetica-Bold').text('INFORMASI UMUM', { underline: true }).moveDown(0.5);
    doc.font('Helvetica').fontSize(10);
    doc.text(`Nomor Order: ${data.orderNumber}`);
    doc.text(`Tanggal Pengiriman: ${moment(data.deliveryDate).format('DD MMMM YYYY')}`);
    doc.text(`Vendor: ${data.vendor?.name || '-'} (${data.vendor?.company || '-'})`).moveDown(1);
    
    // Tabel Items
    doc.fontSize(12).font('Helvetica-Bold').text('DAFTAR BARANG', { underline: true }).moveDown(0.5);
    // (Logic Tabel BAPB)
    const tableTop = doc.y;
    const itemX = 50;
    const qtyOrderedX = 250;
    const qtyReceivedX = 330;
    const unitX = 410;
    const conditionX = 470;

    doc.font('Helvetica-Bold').fontSize(10);
    doc.text('Nama Barang', itemX, tableTop, { width: 190 });
    doc.text('Qty Order', qtyOrderedX, tableTop);
    doc.text('Qty Terima', qtyReceivedX, tableTop);
    doc.text('Satuan', unitX, tableTop);
    doc.text('Kondisi', conditionX, tableTop);
    doc.moveTo(itemX, tableTop + 15).lineTo(545, tableTop + 15).stroke();

    let yPosition = tableTop + 25;
    doc.font('Helvetica').fontSize(9);

    data.items?.forEach((item) => {
      if (yPosition > 700) { doc.addPage(); yPosition = 50; }
      doc.text(item.itemName, itemX, yPosition, { width: 190 });
      doc.text(item.quantityOrdered.toString(), qtyOrderedX, yPosition);
      doc.text(item.quantityReceived.toString(), qtyReceivedX, yPosition);
      doc.text(item.unit, unitX, yPosition);
      doc.text(item.condition, conditionX, yPosition);
      yPosition += 30;
    });

    // Signature Section (BAPB)
    doc.moveDown(3);
    const signatureY = doc.y;
    doc.text('Vendor,', 100, signatureY);
    doc.text('PIC Gudang,', 350, signatureY);

    if (signatures.vendorSignature && fs.existsSync(signatures.vendorSignature)) {
        doc.image(signatures.vendorSignature, 70, signatureY + 20, { width: 100, height: 50 });
    }
    // (logic PIC Gudang Signature)
    
    doc.moveDown(4);
    doc.text(`(${data.vendor?.name || '_____________________'})`, 50, doc.y);
    doc.text(`(${data.picGudang?.name || '_____________________'})`, 300, doc.y);

    doc.end();
  }

  async generateBAPBPDFWithSignatures(bapbData, signatures = {}) {
    const outputDir = path.join(__dirname, '../../uploads/temp');
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const fileName = `BAPB-${bapbData.bapbNumber.replace(/\//g, '-')}-${Date.now()}.pdf`;
    const outputPath = path.join(outputDir, fileName);

    return new Promise((resolve, reject) => {
      const stream = fs.createWriteStream(outputPath);
      stream.on('finish', () => resolve({ filePath: outputPath, fileName }));
      stream.on('error', (err) => reject(err));
      this.buildBAPBPDF(bapbData, signatures, stream);
    });
  }
  
  buildBAPPPDF(data, signatures, stream) {
      const doc = new PDFDocument({ 
          size: 'A4', 
          margin: 50,
      });

      doc.pipe(stream);
      
      // --- JUDUL DOKUMEN ---
      doc.fontSize(16).font('Helvetica-Bold').text('BERITA ACARA PEMERIKSAAN PEKERJAAN (BAPP)', { align: 'center' }).moveDown(0.5);
      doc.fontSize(10).font('Helvetica').text(`Nomor BAPP: ${data.bappNumber}`, { align: 'center' }).moveDown(1.5);
      
      // --- INFORMASI PROYEK ---
      doc.fontSize(10).font('Helvetica-Bold').text('I. INFORMASI PEKERJAAN', { underline: true }).moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Nomor Kontrak/SPK: ${data.contractNumber}`);
      doc.text(`Nama Proyek: ${data.projectName}`);
      doc.text(`Lokasi Proyek: ${data.projectLocation}`);
      doc.text(`Periode Pekerjaan: ${moment(data.startDate).format('DD MMMM YYYY')} s/d ${moment(data.endDate).format('DD MMMM YYYY')}`);
      doc.text(`Tanggal Penyelesaian: ${data.completionDate ? moment(data.completionDate).format('DD MMMM YYYY') : '-'}`);
      doc.text(`Progress Rata-rata: ${data.totalProgress}%`).moveDown(1);
      
      // --- DETAIL REKANAN ---
      doc.font('Helvetica-Bold').text('II. DETAIL REKANAN', { underline: true }).moveDown(0.5);
      doc.font('Helvetica');
      doc.text(`Nama Rekanan (Vendor): ${data.vendor?.name || '-'}`);
      doc.text(`Perusahaan: ${data.vendor?.company || '-'}`).moveDown(1);
      
      // --- DETAIL PEKERJAAN (WORK ITEMS) ---
      doc.font('Helvetica-Bold').text('III. HASIL PEMERIKSAAN PEKERJAAN', { underline: true }).moveDown(0.5);
      
      // Header Tabel BAPP (6 Kolom: Fokus Kendala Utama)
      const tableHeaders = ['Item Pekerjaan', 'Deskripsi', 'Rencana (%)', 'Aktual (%)', 'Unit', 'Kualitas'];
      const colWidths = [100, 140, 80, 80, 50, 60];
      let startX = 50;
      let startY = doc.y;
      let currentX = startX;

      doc.font('Helvetica-Bold').fontSize(9).fillColor('black');
      tableHeaders.forEach((header, index) => {
          doc.text(header, currentX, startY, { width: colWidths[index], align: 'center' });
          currentX += colWidths[index];
      });
      
      doc.moveDown(0.5); 
      doc.moveTo(startX, doc.y).lineTo(startX + colWidths.reduce((a, b) => a + b), doc.y).stroke();
      
      // Isi Tabel
      let yPosition = doc.y + 10;
      doc.font('Helvetica').fontSize(8);

      data.workItems.forEach(item => {
          if (yPosition > 700) { doc.addPage(); yPosition = 50; }

          currentX = startX;
          doc.text(item.workItemName, currentX, yPosition, { width: colWidths[0], align: 'left' });
          currentX += colWidths[0];
          doc.text(item.description, currentX, yPosition, { width: colWidths[1], align: 'left' });
          currentX += colWidths[1];
          doc.text(item.plannedProgress.toString(), currentX, yPosition, { width: colWidths[2], align: 'center' });
          currentX += colWidths[2];
          doc.text(item.actualProgress.toString(), currentX, yPosition, { width: colWidths[3], align: 'center' });
          currentX += colWidths[3];
          doc.text(item.unit, currentX, yPosition, { width: colWidths[4], align: 'center' });
          currentX += colWidths[4];
          doc.text(item.quality, currentX, yPosition, { width: colWidths[5], align: center });
          
          yPosition += 25; 
      });
      
      // --- CATATAN DAN TANDA TANGAN ---
      doc.moveDown(2);
      doc.fontSize(10).font('Helvetica-Bold').text('IV. CATATAN', { underline: true }).moveDown(0.5);
      doc.font('Helvetica').text(data.notes || 'Tidak ada catatan tambahan.').moveDown(2);
      
      doc.font('Helvetica-Bold').text('V. PERSETUJUAN DOKUMEN', { underline: true }).moveDown(0.5);
      doc.font('Helvetica').text(`Status Akhir: ${data.status.toUpperCase()}`).moveDown(1);

      const signatureY = doc.y;

      // Posisi Kiri: Dibuat oleh Vendor
      doc.text('Dibuat oleh Vendor,', 100, signatureY);
      if (signatures.vendorSignature && fs.existsSync(signatures.vendorSignature)) {
          doc.image(signatures.vendorSignature, 70, signatureY + 20, { width: 100, height: 50 });
      }
      doc.text(`(${data.vendor?.name || '_____________________'})`, 50, signatureY + 80);

      // Posisi Kanan: Disetujui oleh Direksi Pekerjaan
      const direksiName = data.direksiPekerjaan ? data.direksiPekerjaan.name : 'Direksi Pekerjaan (Belum Ditunjuk)';
      doc.text('Disetujui oleh Direksi Pekerjaan,', 350, signatureY);
      if (signatures.approverSignature && fs.existsSync(signatures.approverSignature)) {
          doc.image(signatures.approverSignature, 370, signatureY + 20, { width: 100, height: 50 });
      }
      doc.text(`(${direksiName})`, 350, signatureY + 80);
      
      doc.end();
  }

  async generateBAPPPDFWithSignatures(bappData, signatures = {}) {
      const outputDir = path.join(__dirname, '../../uploads/temp');
      if (!fs.existsSync(outputDir)) {
          fs.mkdirSync(outputDir, { recursive: true });
      }

      const fileName = `BAPP-${bappData.bappNumber.replace(/\//g, '-')}-${Date.now()}.pdf`;
      const outputPath = path.join(outputDir, fileName);

      return new Promise((resolve, reject) => {
          const stream = fs.createWriteStream(outputPath);
          stream.on('finish', () => resolve({ filePath: outputPath, fileName }));
          stream.on('error', (err) => reject(err));
          this.buildBAPPPDF(bappData, signatures, stream);
      });
  }
}

module.exports = new PDFService();