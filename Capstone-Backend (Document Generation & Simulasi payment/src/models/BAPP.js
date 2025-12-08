const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BAPP = sequelize.define('BAPP', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bappNumber: {
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
    direksiPekerjaanId: {
      type: DataTypes.UUID,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      }
    },
    contractNumber: {
      type: DataTypes.STRING,
      allowNull: false
    },
    projectName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    projectLocation: {
      type: DataTypes.STRING,
      allowNull: false
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    completionDate: {
      type: DataTypes.DATE
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
    totalProgress: {
      type: DataTypes.DECIMAL(5, 2),
      defaultValue: 0,
      validate: {
        min: 0,
        max: 100
      }
    },
    notes: {
      type: DataTypes.TEXT
    },
    rejectionReason: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'bapp',
    timestamps: true
  });

  return BAPP;
};