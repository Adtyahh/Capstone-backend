const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BAPPApproval = sequelize.define('BAPPApproval', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bappId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'bapp',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    approverId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    action: {
      type: DataTypes.ENUM('approved', 'rejected', 'revision_required'),
      allowNull: false
    },
    notes: {
      type: DataTypes.TEXT
    },
    approvedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'bapp_approvals',
    timestamps: true
  });

  return BAPPApproval;
};  