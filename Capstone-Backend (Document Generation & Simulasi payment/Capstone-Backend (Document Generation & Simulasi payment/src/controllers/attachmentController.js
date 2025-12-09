const { BAPB, BAPP, BAPBAttachment, BAPPAttachment, User } = require('../models');
const fs = require('fs').promises;
const path = require('path');

// Ensure upload directory exists
const ensureUploadDir = async (subdir = 'documents') => {
  const uploadDir = path.join(__dirname, `../../uploads/${subdir}`);
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Upload supporting document for BAPB
exports.uploadBAPBDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileData, fileName, fileType = 'supporting_doc' } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'File data and file name are required'
      });
    }

    const bapb = await BAPB.findByPk(id);

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
        message: 'Not authorized to upload documents for this BAPB'
      });
    }

    const uploadDir = await ensureUploadDir('documents');

    // Handle base64 file data
    let base64Data = fileData;
    const base64Regex = /^data:([A-Za-z-+\/]+);base64,/;
    if (base64Regex.test(fileData)) {
      base64Data = fileData.replace(base64Regex, '');
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const ext = path.extname(fileName);
    const basename = path.basename(fileName, ext);
    const uniqueFileName = `${basename}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    // Save file
    await fs.writeFile(filePath, fileBuffer);

    // Create attachment record
    const attachment = await BAPBAttachment.create({
      bapbId: id,
      fileType,
      filePath: `/uploads/documents/${uniqueFileName}`,
      fileName: uniqueFileName,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        id: attachment.id,
        filePath: attachment.filePath,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        uploadedBy: req.user.id,
        uploadedAt: attachment.createdAt
      }
    });
  } catch (error) {
    console.error('Upload BAPB document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading document',
      error: error.message
    });
  }
};

// Upload supporting document for BAPP
exports.uploadBAPPDocument = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileData, fileName, fileType = 'supporting_doc' } = req.body;

    if (!fileData || !fileName) {
      return res.status(400).json({
        success: false,
        message: 'File data and file name are required'
      });
    }

    const bapp = await BAPP.findByPk(id);

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
        message: 'Not authorized to upload documents for this BAPP'
      });
    }

    const uploadDir = await ensureUploadDir('documents');

    let base64Data = fileData;
    const base64Regex = /^data:([A-Za-z-+\/]+);base64,/;
    if (base64Regex.test(fileData)) {
      base64Data = fileData.replace(base64Regex, '');
    }

    const fileBuffer = Buffer.from(base64Data, 'base64');

    const ext = path.extname(fileName);
    const basename = path.basename(fileName, ext);
    const uniqueFileName = `${basename}_${Date.now()}${ext}`;
    const filePath = path.join(uploadDir, uniqueFileName);

    await fs.writeFile(filePath, fileBuffer);

    const attachment = await BAPPAttachment.create({
      bappId: id,
      fileType,
      filePath: `/uploads/documents/${uniqueFileName}`,
      fileName: uniqueFileName,
      uploadedBy: req.user.id
    });

    res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: {
        id: attachment.id,
        filePath: attachment.filePath,
        fileName: attachment.fileName,
        fileType: attachment.fileType,
        uploadedBy: req.user.id,
        uploadedAt: attachment.createdAt
      }
    });
  } catch (error) {
    console.error('Upload BAPP document error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading document',
      error: error.message
    });
  }
};

// Get all attachments for BAPB
exports.getBAPBAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileType } = req.query;

    const where = { bapbId: id };
    if (fileType) {
      where.fileType = fileType;
    }

    const attachments = await BAPBAttachment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: attachments
    });
  } catch (error) {
    console.error('Get BAPB attachments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attachments',
      error: error.message
    });
  }
};

// Get all attachments for BAPP
exports.getBAPPAttachments = async (req, res) => {
  try {
    const { id } = req.params;
    const { fileType } = req.query;

    const where = { bappId: id };
    if (fileType) {
      where.fileType = fileType;
    }

    const attachments = await BAPPAttachment.findAll({
      where,
      include: [
        {
          model: User,
          as: 'uploader',
          attributes: ['id', 'name', 'email', 'role']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: attachments
    });
  } catch (error) {
    console.error('Get BAPP attachments error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching attachments',
      error: error.message
    });
  }
};

// Delete attachment
exports.deleteAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const { type } = req.query; // 'bapb' or 'bapp'

    const AttachmentModel = type === 'bapb' ? BAPBAttachment : BAPPAttachment;
    const foreignKey = type === 'bapb' ? 'bapbId' : 'bappId';

    const attachment = await AttachmentModel.findOne({
      where: {
        id: attachmentId,
        [foreignKey]: id
      }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    // Check authorization
    if (attachment.uploadedBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this attachment'
      });
    }

    // Delete file from filesystem
    const fullPath = path.join(__dirname, '../..', attachment.filePath);
    try {
      await fs.unlink(fullPath);
    } catch (err) {
      console.error('Error deleting file:', err);
    }

    // Delete database record
    await attachment.destroy();

    res.status(200).json({
      success: true,
      message: 'Attachment deleted successfully'
    });
  } catch (error) {
    console.error('Delete attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting attachment',
      error: error.message
    });
  }
};

// Download attachment
exports.downloadAttachment = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const { type } = req.query;

    const AttachmentModel = type === 'bapb' ? BAPBAttachment : BAPPAttachment;
    const foreignKey = type === 'bapb' ? 'bapbId' : 'bappId';

    const attachment = await AttachmentModel.findOne({
      where: {
        id: attachmentId,
        [foreignKey]: id
      }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Attachment not found'
      });
    }

    const fullPath = path.join(__dirname, '../..', attachment.filePath);

    // Check if file exists
    try {
      await fs.access(fullPath);
    } catch {
      return res.status(404).json({
        success: false,
        message: 'File not found on server'
      });
    }

    // Send file
    res.download(fullPath, attachment.fileName);
  } catch (error) {
    console.error('Download attachment error:', error);
    res.status(500).json({
      success: false,
      message: 'Error downloading attachment',
      error: error.message
    });
  }
};