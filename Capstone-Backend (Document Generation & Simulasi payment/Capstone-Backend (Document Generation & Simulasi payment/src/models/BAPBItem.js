const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BAPBItem = sequelize.define('BAPBItem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    bapbId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'bapb',
        key: 'id'
      },
      onDelete: 'CASCADE'
    },
    itemName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    quantityOrdered: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    quantityReceived: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 0
      }
    },
    unit: {
      type: DataTypes.STRING,
      allowNull: false
    },
    condition: {
      type: DataTypes.ENUM('baik', 'rusak', 'kurang'),
      defaultValue: 'baik'
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'bapb_items',
    timestamps: true
  });

  return BAPBItem;
};