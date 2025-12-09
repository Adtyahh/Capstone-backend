const { BAPP, BAPPApproval, User, BAPPWorkItem } = require('../models');
const { sequelize } = require('../models');

// Approve BAPP (by Direksi Pekerjaan or Approver)
exports.approveBAPP = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const { id } = req.params;
    const { notes } = req.body;
    const approverId = req.user.id;

    const bapp = await BAPP.findByPk(id, {
      include: [
        { model: User, as: 'vendor', attributes: ['id', 'name', 'email'] },
        { model: BAPPWorkItem, as: 'workItems' }
      ]
    });

    if (!bapp) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'BAPP not found'
      });
    }

    // Check if BAPP is in correct status
    if (bapp.status !== 'submitted' && bapp.status !== 'in_review') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'BAPP must be in submitted or in_review status to be approved'
      });
    }

    // Check authorization - only approver can approve
    if (!['approver', 'admin'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to approve BAPP'
      });
    }

    // Check if user already approved
    const existingApproval = await BAPPApproval.findOne({
      where: {
        bappId: id,
        approverId,
        action: 'approved'
      }
    });

    if (existingApproval) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'You have already approved this BAPP'
      });
    }

    // Create approval record
    await BAPPApproval.create({
      bappId: id,
      approverId,
      action: 'approved',
      notes
    }, { transaction });

    // Update BAPP status and assign Direksi if not assigned
    const updateData = { status: 'approved' };
    if (!bapp.direksiPekerjaanId && req.user.role === 'approver') {
      updateData.direksiPekerjaanId = approverId;
    }

    await bapp.update(updateData, { transaction });

    await transaction.commit();

    // Fetch updated BAPP
    const updatedBAPP = await BAPP.findByPk(id, {
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

    res.status(200).json({
      success: true,
      message: 'BAPP approved successfully',
      data: updatedBAPP
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Approve BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error approving BAPP',
      error: error.message
    });
  }
};

// Reject BAPP
exports.rejectBAPP = async (req, res) => {
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

    const bapp = await BAPP.findByPk(id);

    if (!bapp) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'BAPP not found'
      });
    }

    if (bapp.status !== 'submitted' && bapp.status !== 'in_review') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'BAPP must be in submitted or in_review status to be rejected'
      });
    }

    // Check authorization
    if (!['approver', 'admin'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to reject BAPP'
      });
    }

    // Create rejection record
    await BAPPApproval.create({
      bappId: id,
      approverId,
      action: 'rejected',
      notes
    }, { transaction });

    // Update BAPP status
    await bapp.update({
      status: 'rejected',
      rejectionReason
    }, { transaction });

    await transaction.commit();

    // Fetch updated BAPP
    const updatedBAPP = await BAPP.findByPk(id, {
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

    res.status(200).json({
      success: true,
      message: 'BAPP rejected',
      data: updatedBAPP
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Reject BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting BAPP',
      error: error.message
    });
  }
};

// Request revision for BAPP
exports.requestRevisionBAPP = async (req, res) => {
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

    const bapp = await BAPP.findByPk(id);

    if (!bapp) {
      await transaction.rollback();
      return res.status(404).json({
        success: false,
        message: 'BAPP not found'
      });
    }

    if (bapp.status !== 'submitted' && bapp.status !== 'in_review') {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'BAPP must be in submitted or in_review status to request revision'
      });
    }

    // Check authorization
    if (!['approver', 'admin'].includes(req.user.role)) {
      await transaction.rollback();
      return res.status(403).json({
        success: false,
        message: 'Not authorized to request revision'
      });
    }

    // Create revision request record
    await BAPPApproval.create({
      bappId: id,
      approverId,
      action: 'revision_required',
      notes
    }, { transaction });

    // Update BAPP status
    await bapp.update({
      status: 'revision_required',
      rejectionReason: revisionReason
    }, { transaction });

    await transaction.commit();

    // Fetch updated BAPP
    const updatedBAPP = await BAPP.findByPk(id, {
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

    res.status(200).json({
      success: true,
      message: 'Revision requested for BAPP',
      data: updatedBAPP
    });
  } catch (error) {
    await transaction.rollback();
    console.error('Request revision BAPP error:', error);
    res.status(500).json({
      success: false,
      message: 'Error requesting revision',
      error: error.message
    });
  }
};

// Get approval history for BAPP
exports.getBAPPApprovalHistory = async (req, res) => {
  try {
    const { id } = req.params;

    const approvals = await BAPPApproval.findAll({
      where: { bappId: id },
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