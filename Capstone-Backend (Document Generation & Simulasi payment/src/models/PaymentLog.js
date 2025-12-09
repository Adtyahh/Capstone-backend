const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentLog = sequelize.define('PaymentLog', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    documentType: {
      type: DataTypes.ENUM('BAPB', 'BAPP'),
      allowNull: false
    },
    documentId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    documentNumber: {
      type: DataTypes.STRING,
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
    amount: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    paymentMethod: {
      type: DataTypes.STRING,
      defaultValue: 'bank_transfer'
    },
    status: {
      type: DataTypes.ENUM('pending', 'success', 'failed'),
      defaultValue: 'pending'
    },
    transactionId: {
      type: DataTypes.STRING,
      unique: true
    },
    gatewayResponse: {
      type: DataTypes.TEXT,
      comment: 'JSON string of gateway response'
    },
    processedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    },
    notes: {
      type: DataTypes.TEXT
    }
  }, {
    tableName: 'payment_logs',
    timestamps: true,
    indexes: [
      {
        fields: ['documentType', 'documentId']
      },
      {
        fields: ['vendorId']
      },
      {
        fields: ['transactionId']
      },
      {
        fields: ['status']
      }
    ]
  });

  return PaymentLog;
};