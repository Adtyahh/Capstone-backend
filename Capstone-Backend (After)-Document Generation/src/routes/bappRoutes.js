// File: src/routes/bappRoutes.js (FINAL CODE)

const express = require('express');
const router = express.Router();
const bappController = require('../controllers/bappController');
// const bappApprovalController = require('../controllers/bappApprovalController'); // Placeholder
const signatureController = require('../controllers/signatureController');         // Import Signature
const attachmentController = require('../controllers/attachmentController');       // Import Attachment

const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBAPP, validateUUIDParam } = require('../middlewares/validationMiddleware');

// ==================== BAPP CORE CRUD ROUTES ====================

router.get('/', protect, bappController.getAllBAPP);
router.post('/', protect, authorize('vendor'), validateBAPP, bappController.createBAPP);
router.get('/:id', protect, validateUUIDParam('id'), bappController.getBAPPById);
router.put('/:id', protect, authorize('vendor'), validateUUIDParam('id'), bappController.updateBAPP);
router.delete('/:id', protect, authorize('vendor'), validateUUIDParam('id'), bappController.deleteBAPP);
router.post('/:id/submit', protect, authorize('vendor'), validateUUIDParam('id'), bappController.submitBAPP);


// ==================== BAPP SIGNATURE ROUTES ====================

/**
 * @route   POST /api/bapp/:id/signature
 * @desc    Upload signature for BAPP
 * @access  Private (Vendor or Approver)
 */
router.post('/:id/signature', protect, validateUUIDParam('id'), signatureController.uploadBAPPSignature);

/**
 * @route   GET /api/bapp/:id/signatures
 * @desc    Get all signatures for BAPP
 * @access  Private
 */
router.get('/:id/signatures', protect, validateUUIDParam('id'), signatureController.getBAPPSignatures);


// ==================== BAPP ATTACHMENT ROUTES ====================

/**
 * @route   POST /api/bapp/:id/attachments
 * @desc    Upload supporting document for BAPP
 * @access  Private
 */
router.post('/:id/attachments', protect, validateUUIDParam('id'), attachmentController.uploadBAPPDocument); // Catatan: menggunakan uploadBAPPDocument di controller!

/**
 * @route   GET /api/bapp/:id/attachments
 * @desc    Get all attachments for BAPP
 * @access  Private
 */
router.get('/:id/attachments', protect, validateUUIDParam('id'), attachmentController.getBAPPAttachments);

/**
 * @route   DELETE /api/bapp/:id/attachments/:attachmentId
 * @desc    Delete attachment for BAPP (Uses type=bapp query in controller)
 * @access  Private (Uploader or Admin)
 */
router.delete('/:id/attachments/:attachmentId', protect, validateUUIDParam('id'), validateUUIDParam('attachmentId'), attachmentController.deleteAttachment);

/**
 * @route   GET /api/bapp/:id/attachments/:attachmentId/download
 * @desc    Download attachment for BAPP (Uses type=bapp query in controller)
 * @access  Private
 */
router.get('/:id/attachments/:attachmentId/download', protect, validateUUIDParam('id'), validateUUIDParam('attachmentId'), attachmentController.downloadAttachment);


module.exports = router;