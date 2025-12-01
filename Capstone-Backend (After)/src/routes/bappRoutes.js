const express = require('express');
const router = express.Router();
const bappController = require('../controllers/bappController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBAPP, validateUUIDParam } = require('../middlewares/validationMiddleware');

/**
 * @route   GET /api/bapp
 * @desc    Get all BAPPs (with filtering)
 * @access  Private
 */
router.get('/', protect, bappController.getAllBAPP);

/**
 * @route   POST /api/bapp
 * @desc    Create new BAPP
 * @access  Private (Vendor only)
 */
router.post('/', protect, authorize('vendor'), validateBAPP, bappController.createBAPP);

/**
 * @route   GET /api/bapp/:id
 * @desc    Get single BAPP by ID
 * @access  Private
 */
router.get('/:id', protect, validateUUIDParam('id'), bappController.getBAPPById);

/**
 * @route   PUT /api/bapp/:id
 * @desc    Update BAPP
 * @access  Private (Vendor only, must be owner)
 */
router.put('/:id', protect, authorize('vendor'), validateUUIDParam('id'), bappController.updateBAPP);

/**
 * @route   DELETE /api/bapp/:id
 * @desc    Delete BAPP
 * @access  Private (Vendor only, must be owner, draft only)
 */
router.delete('/:id', protect, authorize('vendor'), validateUUIDParam('id'), bappController.deleteBAPP);

/**
 * @route   POST /api/bapp/:id/submit
 * @desc    Submit BAPP for review
 * @access  Private (Vendor only, must be owner)
 */
router.post('/:id/submit', protect, authorize('vendor'), validateUUIDParam('id'), bappController.submitBAPP);

module.exports = router;