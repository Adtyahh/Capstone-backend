const { BAPB, BAPBApproval, User, BAPBItem } = require('../models');
const { sequelize } = require('../models');

// Approve BAPB (by PIC Gudang or Approver)
exports.approveBAPB = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const approverId = req.user.id;

    const bapb = await BAPB.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email'] },
        { model: BAPBItem, as: 'items' }
      ]
    });

    if (!bapb) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'BAPB not found'
      });
    }

    // Check if BAPB is in correct status
    if (bapb.status !== 'submitted' && bapb.status !== 'in_review') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'BAPB must be in submitted or in_review status to be approved'
      });
    }

    // Check authorization - only pic_gudang and approver can approve
    if (!['pic_gudang', 'approver', 'admin'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve BAPB'
      });
    }

    // Check if user already approved
    const existingApproval = await BAPBApproval.findOne({
      where: {
        bapbId: id,
        approverId,
        action: 'approved'
      }
    });

    if (existingApproval) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'You have already approved this BAPB'
      });
    }

    // Create approval record
    await BAPBApproval.create({
      bapbId: id,
      approverId,
      action: 'approved',
      notes
    }, { transaction });

    // Update BAPB status and assign PIC if not assigned
    const updateData = { status: 'approved' };
    if (!bapb.picGudangId && req.user.role === 'pic_gudang') {
      updateData.picGudangId = approverId;
    }

    await bapb.update(updateData, { transaction });

    await transaction.commit();

    // Fetch updated BAPB
    const updatedBAPB = await BAPB.findByPk(id, {
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

    res.status(200).json({
      success: true,
      message: 'BAPB approved successfully',
      data: updatedBAPB
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Approve BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving BAPB',
      error: error.message
    });
  }
};

// Reject BAPB
exports.rejectBAPB = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { notes, rejectionReason } = req.body;
    const approverId = req.user.id;

    if (!rejectionReason || rejectionReason.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Rejection reason is required'
      });
    }

    const bapb = await BAPB.findByPk(id);

    if (!bapb) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'BAPB not found'
      });
    }

    if (bapb.status !== 'submitted' && bapb.status !== 'in_review') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'BAPB must be in submitted or in_review status to be rejected'
      });
    }

    // Check authorization
    if (!['pic_gudang', 'approver', 'admin'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject BAPB'
      });
    }

    // Create rejection record
    await BAPBApproval.create({
      bapbId: id,
      approverId,
      action: 'rejected',
      notes
    }, { transaction });

    // Update BAPB status
    await bapb.update({
      status: 'rejected',
      rejectionReason
    }, { transaction });

    await transaction.commit();

    // Fetch updated BAPB
    const updatedBAPB = await BAPB.findByPk(id, {
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

    res.status(200).json({
      success: true,
      message: 'BAPB rejected',
      data: updatedBAPB
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Reject BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting BAPB',
      error: error.message
    });
  }
};

// Request revision for BAPB
exports.requestRevisionBAPB = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { notes, revisionReason } = req.body;
    const approverId = req.user.id;

    if (!revisionReason || revisionReason.trim().length === 0) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'Revision reason is required'
      });
    }

    const bapb = await BAPB.findByPk(id);

    if (!bapb) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'BAPB not found'
      });
    }

    if (bapb.status !== 'submitted' && bapb.status !== 'in_review') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'BAPB must be in submitted or in_review status to request revision'
      });
    }

    // Check authorization
    if (!['pic_gudang', 'approver', 'admin'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to request revision'
      });
    }

    // Create revision request record
    await BAPBApproval.create({
      bapbId: id,
      approverId,
      action: 'revision_required',
      notes
    }, { transaction });

    // Update BAPB status
    await bapb.update({
      status: 'revision_required',
      rejectionReason: revisionReason
    }, { transaction });

    await transaction.commit();

    // Fetch updated BAPB
    const updatedBAPB = await BAPB.findByPk(id, {
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

    res.status(200).json({
      success: true,
      message: 'Revision requested for BAPB',
      data: updatedBAPB
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Request revision BAPB error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting revision',
      error: error.message
    });
  }
};

// Get approval history for BAPB
exports.getBAPBApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const approvals = await BAPBApproval.findAll({
      where: { bapbId: id },
      include: [
        { 
          model: User, 
          as: 'approver', 
          attributes: ['id', 'name', 'email', 'role'] 
        }
      ],
      order: [['approvedAt', 'DESC']]
    });

    res.status(200).json({
      success: true,
      data: approvals
    });
  } catch (error) {
    console.error('Get approval history error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching approval history',
      error: error.message
    });
  }
};