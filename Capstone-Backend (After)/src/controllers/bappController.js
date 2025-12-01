const { BAPP, BAPPWorkItem, User, BAPPApproval } = require('../models');
const { Op } = require('sequelize');

// Helper function to generate BAPP number
const generateBAPPNumber = async () => {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  
  const count = await BAPP.count({
    where: {
      createdAt: {
        [Op.gte]: new Date(year, date.getMonth(), 1)
      }
    }
  });
  
  const sequence = String(count + 1).padStart(4, '0');
  return `BAPP/${year}/${month}/${sequence}`;
};

// Calculate total progress from work items
const calculateTotalProgress = (workItems) => {
  if (!workItems || workItems.length === 0) return 0;
  
  const totalActualProgress = workItems.reduce((sum, item) => {
    return sum + parseFloat(item.actualProgress || 0);
  }, 0);
  
  return (totalActualProgress / workItems.length).toFixed(2);
};

// Create BAPP
exports.createBAPP = async (req, res) => {
  try {
    const { 
      contractNumber, 
      projectName, 
      projectLocation, 
      startDate, 
      endDate,
      completionDate,
      workItems, 
      notes 
    } = req.body;
    const vendorId = req.user.id;

    // Validation
    if (!contractNumber || !projectName || !projectLocation || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Contract number, project name, location, start date, and end date are required'
      });
    }

    // Generate BAPP number
    const bappNumber = await generateBAPPNumber();

    // Calculate total progress
    const totalProgress = calculateTotalProgress(workItems);

    // Create BAPP
    const bapp = await BAPP.create({
      bappNumber,
      vendorId,
      contractNumber,
      projectName,
      projectLocation,
      startDate,
      endDate,
      completionDate,
      totalProgress,
      notes,
      status: 'draft'
    });

    // Create work items if provided
    if (workItems && workItems.length > 0) {
      const bappWorkItems = workItems.map(item => ({
        ...item,
        bappId: bapp.id
      }));
      await BAPPWorkItem.bulkCreate(bappWorkItems);
    }

    // Fetch complete BAPP with work items
    const completeBAPP = await BAPP.findByPk(bapp.id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: BAPPWorkItem, as: 'workItems' }
      ]
    });

    res.status(201).json({
      success: true,
      message: 'BAPP created successfully',
      data: completeBAPP
    });
  } catch (error) {
    console.error('Create BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error creating BAPP',
      error: error.message
    });
  }
};

// Get all BAPPs
exports.getAllBAPP = async (req, res) => {
  try {
    const { status, vendorId, page = 1, limit = 10 } = req.query;
    
    const where = {};
    if (status) where.status = status;
    if (vendorId) where.vendorId = vendorId;
    
    // If user is vendor, only show their BAPPs
    if (req.user.role === 'vendor') {
      where.vendorId = req.user.id;
    }

    const offset = (page - 1) * limit;

    const { count, rows } = await BAPP.findAndCountAll({
      where,
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: User, as: 'direksiPekerjaan', attributes: ['id', 'name', 'email'] },
        { model: BAPPWorkItem, as: 'workItems' }
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
    console.error('Get all BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching BAPPs',
      error: error.message
    });
  }
};

// Get single BAPP
exports.getBAPPById = async (req, res) => {
  try {
    const { id } = req.params;

    const bapp = await BAPP.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: User, as: 'direksiPekerjaan', attributes: ['id', 'name', 'email'] },
        { model: BAPPWorkItem, as: 'workItems' },
        { 
          model: BAPPApproval, 
          as: 'approvals',
          include: [{ model: User, as: 'approver', attributes: ['id', 'name', 'email'] }]
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
        message: 'Not authorized to view this BAPP'
      });
    }

    res.status(200).json({
      success: true,
      data: bapp
    });
  } catch (error) {
    console.error('Get BAPP by ID error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching BAPP',
      error: error.message
    });
  }
};

// Update BAPP
exports.updateBAPP = async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      contractNumber, 
      projectName, 
      projectLocation, 
      startDate, 
      endDate,
      completionDate,
      notes, 
      workItems 
    } = req.body;

    const bapp = await BAPP.findByPk(id);

    if (!bapp) {
      return res.status(404).json({
        success: false,
        message: 'BAPP not found'
      });
    }

    // Check authorization and status
    if (req.user.role === 'vendor' && bapp.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this BAPP'
      });
    }

    if (bapp.status !== 'draft' && bapp.status !== 'revision_required') {
      return res.status(400).json({
        success: false,
        message: 'Cannot update BAPP that is not in draft or revision status'
      });
    }

    // Calculate new total progress if work items are updated
    let totalProgress = bapp.totalProgress;
    if (workItems) {
      totalProgress = calculateTotalProgress(workItems);
    }

    // Update BAPP
    await bapp.update({
      contractNumber: contractNumber || bapp.contractNumber,
      projectName: projectName || bapp.projectName,
      projectLocation: projectLocation || bapp.projectLocation,
      startDate: startDate || bapp.startDate,
      endDate: endDate || bapp.endDate,
      completionDate: completionDate !== undefined ? completionDate : bapp.completionDate,
      totalProgress,
      notes: notes !== undefined ? notes : bapp.notes
    });

    // Update work items if provided
    if (workItems) {
      await BAPPWorkItem.destroy({ where: { bappId: id } });
      const bappWorkItems = workItems.map(item => ({
        ...item,
        bappId: id
      }));
      await BAPPWorkItem.bulkCreate(bappWorkItems);
    }

    // Fetch updated BAPP
    const updatedBAPP = await BAPP.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email', 'company'] },
        { model: BAPPWorkItem, as: 'workItems' }
      ]
    });

    res.status(200).json({
      success: true,
      message: 'BAPP updated successfully',
      data: updatedBAPP
    });
  } catch (error) {
    console.error('Update BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating BAPP',
      error: error.message
    });
  }
};

// Delete BAPP
exports.deleteBAPP = async (req, res) => {
  try {
    const { id } = req.params;

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
        message: 'Not authorized to delete this BAPP'
      });
    }

    if (bapp.status !== 'draft') {
      return res.status(400).json({
        success: false,
        message: 'Can only delete BAPP in draft status'
      });
    }

    await bapp.destroy();

    res.status(200).json({
      success: true,
      message: 'BAPP deleted successfully'
    });
  } catch (error) {
    console.error('Delete BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error deleting BAPP',
      error: error.message
    });
  }
};

// Submit BAPP for review
exports.submitBAPP = async (req, res) => {
  try {
    const { id } = req.params;

    const bapp = await BAPP.findByPk(id, {
      include: [{ model: BAPPWorkItem, as: 'workItems' }]
    });

    if (!bapp) {
      return res.status(404).json({
        success: false,
        message: 'BAPP not found'
      });
    }

    // Check authorization
    if (bapp.vendorId !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to submit this BAPP'
      });
    }

    if (bapp.status !== 'draft' && bapp.status !== 'revision_required') {
      return res.status(400).json({
        success: false,
        message: 'Can only submit BAPP in draft or revision status'
      });
    }

    // Validate has work items
    if (!bapp.workItems || bapp.workItems.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'BAPP must have at least one work item'
      });
    }

    await bapp.update({ status: 'submitted' });

    res.status(200).json({
      success: true,
      message: 'BAPP submitted successfully',
      data: bapp
    });
  } catch (error) {
    console.error('Submit BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error submitting BAPP',
      error: error.message
    });
  }
};