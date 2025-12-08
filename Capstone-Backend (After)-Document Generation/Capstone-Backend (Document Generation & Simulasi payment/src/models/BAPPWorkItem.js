const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BAPPWorkItem = sequelize.define('BAPPWorkItem', {
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
    workItemName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    description: {
      type: DataTypes.TEXT
    },
    plannedProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    actualProgress: {
      type: DataTypes.DECIMAL(5, 2),
      allowNull: false,
      validate: {
        min: 0,
        max: 100
      }
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quality: {
      type: DataTypes.ENUM('excellent', 'good', 'acceptable', 'poor', 'rejected'),
      defaultValue: 'good'
    },
    deliverables: {
      type: DataTypes.TEXT
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'bapp_work_items',
    timestamps: true
  });

  return BAPPWorkItem;
};