const { BAPB, BAPP, BAPBAttachment, BAPPAttachment, User } = require('../models');
const fs = require('fs').promises;
const path = require('path');
const { asyncHandler, AppError } = require('../utils/errorHandler');

// Ensure upload directory exists
const ensureUploadDir = async () => {
  const uploadDir = path.join(__dirname, '../../uploads/signatures');
  try {
    await fs.access(uploadDir);
  } catch {
    await fs.mkdir(uploadDir, { recursive: true });
  }
  return uploadDir;
};

// Upload signature for BAPB
exports.uploadBAPBSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const { signatureData } = req.body; // Base64 signature data
    const userId = req.user.id;

    if (!signatureData) {
      return res.status(400).json({
        success: false,
        message: 'Signature data is required'
      });
    }

    // Validate signature data is base64
    const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
    if (!base64Regex.test(signatureData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature format. Must be base64 image data'
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
    const canSign = 
      (req.user.role === 'vendor' && bapb.vendorId === userId) ||
      (req.user.role === 'pic_gudang' && bapb.picGudangId === userId) ||
      ['approver', 'admin'].includes(req.user.role);

    if (!canSign) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to sign this BAPB'
      });
    }

    // Ensure upload directory exists
    const uploadDir = await ensureUploadDir();

    // Extract base64 data
    const base64Data = signatureData.replace(base64Regex, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    // Generate unique filename
    const filename = `bapb_${id}_${userId}_${Date.now()}.png`;
    const filePath = path.join(uploadDir, filename);

    // Save file
    await fs.writeFile(filePath, imageBuffer);

    // Create attachment record
    const attachment = await BAPBAttachment.create({
      bapbId: id,
      fileType: 'signature',
      filePath: `/uploads/signatures/${filename}`,
      fileName: filename,
      uploadedBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Signature uploaded successfully',
      data: {
        id: attachment.id,
        filePath: attachment.filePath,
        fileName: attachment.fileName,
        uploadedBy: userId,
        uploadedAt: attachment.createdAt
      }
    });
  } catch (error) {
    console.error('Upload BAPB signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading signature',
      error: error.message
    });
  }
};

// Upload signature for BAPP
exports.uploadBAPPSignature = async (req, res) => {
  try {
    const { id } = req.params;
    const { signatureData } = req.body;
    const userId = req.user.id;

    if (!signatureData) {
      return res.status(400).json({
        success: false,
        message: 'Signature data is required'
      });
    }

    const base64Regex = /^data:image\/(png|jpeg|jpg);base64,/;
    if (!base64Regex.test(signatureData)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid signature format. Must be base64 image data'
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
    const canSign = 
      (req.user.role === 'vendor' && bapp.vendorId === userId) ||
      (req.user.role === 'approver' && bapp.direksiPekerjaanId === userId) ||
      ['approver', 'admin'].includes(req.user.role);

    if (!canSign) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to sign this BAPP'
      });
    }

    const uploadDir = await ensureUploadDir();

    const base64Data = signatureData.replace(base64Regex, '');
    const imageBuffer = Buffer.from(base64Data, 'base64');

    const filename = `bapp_${id}_${userId}_${Date.now()}.png`;
    const filePath = path.join(uploadDir, filename);

    await fs.writeFile(filePath, imageBuffer);

    const attachment = await BAPPAttachment.create({
      bappId: id,
      fileType: 'signature',
      filePath: `/uploads/signatures/${filename}`,
      fileName: filename,
      uploadedBy: userId
    });

    res.status(201).json({
      success: true,
      message: 'Signature uploaded successfully',
      data: {
        id: attachment.id,
        filePath: attachment.filePath,
        fileName: attachment.fileName,
        uploadedBy: userId,
        uploadedAt: attachment.createdAt
      }
    });
  } catch (error) {
    console.error('Upload BAPP signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Error uploading signature',
      error: error.message
    });
  }
};

// Get all signatures for BAPB
exports.getBAPBSignatures = async (req, res) => {
  try {
    const { id } = req.params;

    const signatures = await BAPBAttachment.findAll({
      where: {
        bapbId: id,
        fileType: 'signature'
      },
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
      data: signatures
    });
  } catch (error) {
    console.error('Get BAPB signatures error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signatures',
      error: error.message
    });
  }
};

// Get all signatures for BAPP
exports.getBAPPSignatures = async (req, res) => {
  try {
    const { id } = req.params;

    const signatures = await BAPPAttachment.findAll({
      where: {
        bappId: id,
        fileType: 'signature'
      },
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
      data: signatures
    });
  } catch (error) {
    console.error('Get BAPP signatures error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching signatures',
      error: error.message
    });
  }
};

// Delete signature
exports.deleteSignature = async (req, res) => {
  try {
    const { id, attachmentId } = req.params;
    const { type } = req.query; // 'bapb' or 'bapp'

    const AttachmentModel = type === 'bapb' ? BAPBAttachment : BAPPAttachment;
    const foreignKey = type === 'bapb' ? 'bapbId' : 'bappId';

    const attachment = await AttachmentModel.findOne({
      where: {
        id: attachmentId,
        [foreignKey]: id,
        fileType: 'signature'
      }
    });

    if (!attachment) {
      return res.status(404).json({
        success: false,
        message: 'Signature not found'
      });
    }

    // Check authorization - only uploader or admin can delete
    if (attachment.uploadedBy !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this signature'
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
      message: 'Signature deleted successfully'
    });
  } catch (error) {
    console.error('Delete signature error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting signature',
      error: error.message
    });
  }
};