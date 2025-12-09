const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BAPBAttachment = sequelize.define('BAPBAttachment', {
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
    fileType: {
      type: DataTypes.ENUM('signature', 'supporting_doc', 'photo'),
      allowNull: false
    },
    filePath: {
      type: DataTypes.STRING,
      allowNull: false
    },
    fileName: {
      type: DataTypes.STRING
    },
    uploadedBy: {
      type: DataTypes.UUID,
      references: {
        model: 'users',
        key: 'id'
      }
    }
  }, {
    tableName: 'bapb_attachments',
    timestamps: true
  });

  return BAPBAttachment;
};