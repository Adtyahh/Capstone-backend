const { BAPB, BAPBItem, User, BAPBApproval } = require('../models');
const { Op } = require('sequelize');

// Helper function to generate BAPB number
const generateBAPBNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const count = await BAPB.count({
    where: {
      createdAt: {
        [Op.gte]: new Date(year, date.getMonth(), 1)
      }
    }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `BAPB/${year}/${month}/${sequence}`;
};

// Create BAPB
exports.createBAPB = async (req, res) => {
  try {
    const { orderNumber, deliveryDate, items, notes } = req.body;
    const vendorId = req.user.id;

    // Validation
    if (!orderNumber || !deliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Order number and delivery date are required'
      });
    }

    // Generate BAPB number
    const bapbNumber = await generateBAPBNumber();

    // Create BAPB
    const bapb = await BAPB.create({
      bapbNumber,
      vendorId,
      orderNumber,
      deliveryDate,
      notes,
      status: 'draft'
    });

    // Create items if provided
    if (items && items.length > 0) {
      const bapbItems = items.map(item => ({
        ...item,
        bapbId: bapb.id
      }));
      await BAPBItem.bulkCreate(bapbItems);
    }

    // Fetch complete BAPB with items
    const completeBAPB = await BAPB.findByPk(bapb.id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: BAPBItem, as: 'items' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'BAPB created successfully',
      data: completeBAPB
    });
  } catch (error) {
    console.error('Create BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating BAPB',
      error: error.message
    });
  }
};

// Get all BAPBs
exports.getAllBAPB = async (req, res) => {
  try {
    const { status, vendorId, page = 1, limit = 10 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    
    // If user is vendor, only show their BAPBs
    if (req.user.role === 'vendor') {
      where.vendorId = req.user.id;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await BAPB.findAndCountAll({
      where,
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: User, as: 'picGudang', attributes: ['id', 'name', 'email'] },
        { model: BAPBItem, as: 'items' }
      ],
      limit: parseInt(limit),
      offset: parseInt(offset),
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: rows,
      pagination: {
        total: count,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(count / limit)
      }
    });
  } catch (error) {
    console.error('Get all BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching BAPBs',
      error: error.message
    });
  }
};

// Get single BAPB
exports.getBAPBById = async (req, res) => {
  try {
    const { id } = req.params;

    const bapb = await BAPB.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: User, as: 'picGudang', attributes: ['id', 'name', 'email'] },
        { model: BAPBItem, as: 'items' },
        { 
          model: BAPBApproval, 
          as: 'approvals',
          include: [{ model: User, as: 'approver', attributes: ['id', 'name', 'email'] }]
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
        message: 'Not authorized to view this BAPB'
      });
    }

    res.status(200).json({
      success: true,
      data: bapb
    });
  } catch (error) {
    console.error('Get BAPB by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching BAPB',
      error: error.message
    });
  }
};

// Update BAPB
exports.updateBAPB = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderNumber, deliveryDate, notes, items } = req.body;

    const bapb = await BAPB.findByPk(id);

    if (!bapb) {
      return res.status(404).json({
        success: false,
        message: 'BAPB not found'
      });
    }

    // Check authorization and status
    if (req.user.role === 'vendor' && bapb.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this BAPB'
      });
    }

    if (bapb.status !== 'draft' && bapb.status !== 'revision_required') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update BAPB that is not in draft or revision status'
      });
    }

    // Update BAPB
    await bapb.update({
      orderNumber: orderNumber || bapb.orderNumber,
      deliveryDate: deliveryDate || bapb.deliveryDate,
      notes: notes !== undefined ? notes : bapb.notes
    });

    // Update items if provided
    if (items) {
      await BAPBItem.destroy({ where: { bapbId: id } });
      const bapbItems = items.map(item => ({
        ...item,
        bapbId: id
      }));
      await BAPBItem.bulkCreate(bapbItems);
    }

    // Fetch updated BAPB
    const updatedBAPB = await BAPB.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: BAPBItem, as: 'items' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'BAPB updated successfully',
      data: updatedBAPB
    });
  } catch (error) {
    console.error('Update BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating BAPB',
      error: error.message
    });
  }
};

// Delete BAPB
exports.deleteBAPB = async (req, res) => {
  try {
    const { id } = req.params;

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
        message: 'Not authorized to delete this BAPB'
      });
    }

    if (bapb.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete BAPB in draft status'
      });
    }

    await bapb.destroy();

    res.status(200).json({
      success: true,
      message: 'BAPB deleted successfully'
    });
  } catch (error) {
    console.error('Delete BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting BAPB',
      error: error.message
    });
  }
};

// Submit BAPB for review
exports.submitBAPB = async (req, res) => {
  try {
    const { id } = req.params;

    const bapb = await BAPB.findByPk(id, {
      include: [{ model: BAPBItem, as: 'items' }]
    });

    if (!bapb) {
      return res.status(404).json({
        success: false,
        message: 'BAPB not found'
      });
    }

    // Check authorization
    if (bapb.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this BAPB'
      });
    }

    if (bapb.status !== 'draft' && bapb.status !== 'revision_required') {
      return res.status(400).json({
        success: false,
        message: 'Can only submit BAPB in draft or revision status'
      });
    }

    // Validate has items
    if (!bapb.items || bapb.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'BAPB must have at least one item'
      });
    }

    await bapb.update({ status: 'submitted' });

    res.status(200).json({
      success: true,
      message: 'BAPB submitted successfully',
      data: bapb
    });
  } catch (error) {
    console.error('Submit BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting BAPB',
      error: error.message
    });
  }
};