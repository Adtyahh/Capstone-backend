const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BAPB = sequelize.define('BAPB', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bapbNumber: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false
    },
    vendorId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    picGudangId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    orderNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    deliveryDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM(
        'draft', 
        'submitted', 
        'in_review', 
        'approved', 
        'rejected', 
        'revision_required'
      ),
      defaultValue: 'draft'
    },
    notes: {
      type: DataTypes.TEXT
    },
    rejectionReason: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'bapb',
    timestamps: true
  });

  return BAPB;
};