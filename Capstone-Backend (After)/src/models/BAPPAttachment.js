const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const BAPPAttachment = sequelize.define('BAPPAttachment', {
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
    fileType: {
      type: DataTypes.ENUM('signature', 'supporting_doc', 'photo', 'progress_report'),
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
    tableName: 'bapp_attachments',
    timestamps: true
  });

  return BAPPAttachment;
};