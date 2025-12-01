const express = require('express');
const router = express.Router();
const bapbController = require('../controllers/bapbController');
const { protect, authorize } = require('../middlewares/authMiddleware');
const { validateBAPB, validateUUIDParam } = require('../middlewares/validationMiddleware');

/**
 * @route   GET /api/bapb
 * @desc    Get all BAPBs (with filtering)
 * @access  Private
 */
router.get('/', protect, bapbController.getAllBAPB);

/**
 * @route   POST /api/bapb
 * @desc    Create new BAPB
 * @access  Private (Vendor only)
 */
router.post('/', protect, authorize('vendor'), validateBAPB, bapbController.createBAPB);

/**
 * @route   GET /api/bapb/:id
 * @desc    Get single BAPB by ID
 * @access  Private
 */
router.get('/:id', protect, validateUUIDParam('id'), bapbController.getBAPBById);

/**
 * @route   PUT /api/bapb/:id
 * @desc    Update BAPB
 * @access  Private (Vendor only, must be owner)
 */
router.put('/:id', protect, authorize('vendor'), validateUUIDParam('id'), bapbController.updateBAPB);

/**
 * @route   DELETE /api/bapb/:id
 * @desc    Delete BAPB
 * @access  Private (Vendor only, must be owner, draft only)
 */
router.delete('/:id', protect, authorize('vendor'), validateUUIDParam('id'), bapbController.deleteBAPB);

/**
 * @route   POST /api/bapb/:id/submit
 * @desc    Submit BAPB for review
 * @access  Private (Vendor only, must be owner)
 */
router.post('/:id/submit', protect, authorize('vendor'), validateUUIDParam('id'), bapbController.submitBAPB);

module.exports = router;