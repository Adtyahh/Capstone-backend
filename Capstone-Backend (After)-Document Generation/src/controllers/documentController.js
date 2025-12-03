// Controller for PDF Document Generation

const { BAPB, BAPP, BAPBItem, BAPPWorkItem, User, BAPBAttachment, BAPPAttachment } = require('../models');
const pdfService = require('../services/pdfService');
const path = require('path');
const fs = require('fs').promises;

/**
 * Generate and download BAPB PDF document
 * @route GET /api/documents/bapb/:id/pdf
 * @access Private
 */
exports.generateBAPBPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch complete BAPB data
    const bapb = await BAPB.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'vendor', 
          attributes: ['id', 'name', 'email', 'company', 'phone'] 
        },
        { 
          model: User, 
          as: 'picGudang', 
          attributes: ['id', 'name', 'email'] 
        },
        { 
          model: BAPBItem, 
          as: 'items' 
        },
        {
          model: BAPBAttachment,
          as: 'attachments',
          where: { fileType: 'signature' },
          required: false
        }
      ]
    });

    if (!bapb) {
      return res.status(404).json({
        success: false,
        message: 'BAPB not found'
      });
    }

    // Check authorization
    if (req.user.role === 'vendor' && bapb.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this BAPB'
      });
    }

    // Prepare signature paths
    const signatures = {
      vendorSignature: null,
      picGudangSignature: null
    };

    // Find signatures from attachments
    if (bapb.attachments && bapb.attachments.length > 0) {
      bapb.attachments.forEach(attachment => {
        const fullPath = path.join(__dirname, '../..', attachment.filePath);
        
        if (attachment.uploadedBy === bapb.vendorId) {
          signatures.vendorSignature = fullPath;
        } else if (bapb.picGudangId && attachment.uploadedBy === bapb.picGudangId) {
          signatures.picGudangSignature = fullPath;
        }
      });
    }

    // Generate PDF
    const { filePath, fileName } = await pdfService.generateBAPBPDF(bapb.toJSON(), signatures);

    // Send file as download
    res.download(filePath, fileName, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading PDF'
          });
        }
      }

      // Clean up temp file after download
      try {
        await fs.unlink(filePath);
      } catch (unlinkErr) {
        console.error('Error deleting temp file:', unlinkErr);
      }
    });

  } catch (error) {
    console.error('Generate BAPB PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};

/**
 * Generate and download BAPP PDF document
 * @route GET /api/documents/bapp/:id/pdf
 * @access Private
 */
exports.generateBAPPPDF = async (req, res) => {
  try {
    const { id } = req.params;

    // Fetch complete BAPP data
    const bapp = await BAPP.findByPk(id, {
      include: [
        { 
          model: User, 
          as: 'vendor', 
          attributes: ['id', 'name', 'email', 'company', 'phone'] 
        },
        { 
          model: User, 
          as: 'direksiPekerjaan', 
          attributes: ['id', 'name', 'email'] 
        },
        { 
          model: BAPPWorkItem, 
          as: 'workItems' 
        },
        {
          model: BAPPAttachment,
          as: 'attachments',
          where: { fileType: 'signature' },
          required: false
        }
      ]
    });

    if (!bapp) {
      return res.status(404).json({
        success: false,
        message: 'BAPP not found'
      });
    }

    // Check authorization
    if (req.user.role === 'vendor' && bapp.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this BAPP'
      });
    }

    // Prepare signature paths
    const signatures = {
      vendorSignature: null,
      approverSignature: null
    };

    // Find signatures
    if (bapp.attachments && bapp.attachments.length > 0) {
      bapp.attachments.forEach(attachment => {
        const fullPath = path.join(__dirname, '../..', attachment.filePath);
        
        if (attachment.uploadedBy === bapp.vendorId) {
          signatures.vendorSignature = fullPath;
        } else if (bapp.direksiPekerjaanId && attachment.uploadedBy === bapp.direksiPekerjaanId) {
          signatures.approverSignature = fullPath;
        }
      });
    }

    // Generate PDF
    const { filePath, fileName } = await pdfService.generateBAPPPDF(bapp.toJSON(), signatures);

    // Send file as download
    res.download(filePath, fileName, async (err) => {
      if (err) {
        console.error('Error sending file:', err);
        if (!res.headersSent) {
          res.status(500).json({
            success: false,
            message: 'Error downloading PDF'
          });
        }
      }

      // Clean up temp file
      try {
        await fs.unlink(filePath);
      } catch (unlinkErr) {
        console.error('Error deleting temp file:', unlinkErr);
      }
    });

  } catch (error) {
    console.error('Generate BAPP PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating PDF',
      error: error.message
    });
  }
};

/**
 * Preview BAPB PDF (return as base64 for frontend preview)
 * @route GET /api/documents/bapb/:id/preview
 * @access Private
 */
exports.previewBAPBPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const bapb = await BAPB.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'company'] },
        { model: User, as: 'picGudang', attributes: ['id', 'name'] },
        { model: BAPBItem, as: 'items' },
        { model: BAPBAttachment, as: 'attachments', where: { fileType: 'signature' }, required: false }
      ]
    });

    if (!bapb) {
      return res.status(404).json({
        success: false,
        message: 'BAPB not found'
      });
    }

    if (req.user.role === 'vendor' && bapb.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const signatures = { vendorSignature: null, picGudangSignature: null };
    
    if (bapb.attachments) {
      bapb.attachments.forEach(att => {
        const fullPath = path.join(__dirname, '../..', att.filePath);
        if (att.uploadedBy === bapb.vendorId) signatures.vendorSignature = fullPath;
        else if (bapb.picGudangId && att.uploadedBy === bapb.picGudangId) signatures.picGudangSignature = fullPath;
      });
    }

    const { filePath } = await pdfService.generateBAPBPDF(bapb.toJSON(), signatures);
    
    // Read file as base64
    const pdfBuffer = await fs.readFile(filePath);
    const pdfBase64 = pdfBuffer.toString('base64');

    // Clean up
    await fs.unlink(filePath);

    res.status(200).json({
      success: true,
      data: {
        pdf: `data:application/pdf;base64,${pdfBase64}`,
        fileName: `BAPB-${bapb.bapbNumber.replace(/\//g, '-')}.pdf`
      }
    });

  } catch (error) {
    console.error('Preview BAPB PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
      error: error.message
    });
  }
};

/**
 * Preview BAPP PDF
 * @route GET /api/documents/bapp/:id/preview
 * @access Private
 */
exports.previewBAPPPDF = async (req, res) => {
  try {
    const { id } = req.params;

    const bapp = await BAPP.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'company'] },
        { model: User, as: 'direksiPekerjaan', attributes: ['id', 'name'] },
        { model: BAPPWorkItem, as: 'workItems' },
        { model: BAPPAttachment, as: 'attachments', where: { fileType: 'signature' }, required: false }
      ]
    });

    if (!bapp) {
      return res.status(404).json({
        success: false,
        message: 'BAPP not found'
      });
    }

    if (req.user.role === 'vendor' && bapp.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized'
      });
    }

    const signatures = { vendorSignature: null, approverSignature: null };
    
    if (bapp.attachments) {
      bapp.attachments.forEach(att => {
        const fullPath = path.join(__dirname, '../..', att.filePath);
        if (att.uploadedBy === bapp.vendorId) signatures.vendorSignature = fullPath;
        else if (bapp.direksiPekerjaanId && att.uploadedBy === bapp.direksiPekerjaanId) signatures.approverSignature = fullPath;
      });
    }

    const { filePath } = await pdfService.generateBAPPPDF(bapp.toJSON(), signatures);
    
    const pdfBuffer = await fs.readFile(filePath);
    const pdfBase64 = pdfBuffer.toString('base64');

    await fs.unlink(filePath);

    res.status(200).json({
      success: true,
      data: {
        pdf: `data:application/pdf;base64,${pdfBase64}`,
        fileName: `BAPP-${bapp.bappNumber.replace(/\//g, '-')}.pdf`
      }
    });

  } catch (error) {
    console.error('Preview BAPP PDF error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating preview',
      error: error.message
    });
  }
};

module.exports = exports;