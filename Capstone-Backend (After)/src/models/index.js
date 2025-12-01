const { Sequelize } = require('sequelize');
const config = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const dbConfig = config[env];

const sequelize = new Sequelize(
  dbConfig.database,
  dbConfig.username,
  dbConfig.password,
  {
    host: dbConfig.host,
    port: dbConfig.port,
    dialect: dbConfig.dialect,
    logging: dbConfig.logging
  }
);

// Initialize all models
const models = {
  User: require('./User')(sequelize),
  
  // BAPB Models
  BAPB: require('./BAPB')(sequelize),
  BAPBItem: require('./BAPBItem')(sequelize),
  BAPBApproval: require('./BAPBApproval')(sequelize),
  BAPBAttachment: require('./BAPBAttachment')(sequelize),
  
  // BAPP Models
  BAPP: require('./BAPP')(sequelize),
  BAPPWorkItem: require('./BAPPWorkItem')(sequelize),
  BAPPApproval: require('./BAPPApproval')(sequelize),
  BAPPAttachment: require('./BAPPAttachment')(sequelize)
};

// ==================== BAPB Associations ====================
models.BAPB.belongsTo(models.User, { 
  as: 'vendor', 
  foreignKey: 'vendorId' 
});

models.BAPB.belongsTo(models.User, { 
  as: 'picGudang', 
  foreignKey: 'picGudangId' 
});

models.BAPB.hasMany(models.BAPBItem, { 
  foreignKey: 'bapbId', 
  as: 'items',
  onDelete: 'CASCADE' 
});

models.BAPB.hasMany(models.BAPBApproval, { 
  foreignKey: 'bapbId', 
  as: 'approvals',
  onDelete: 'CASCADE' 
});

models.BAPB.hasMany(models.BAPBAttachment, { 
  foreignKey: 'bapbId', 
  as: 'attachments',
  onDelete: 'CASCADE' 
});

models.BAPBItem.belongsTo(models.BAPB, { foreignKey: 'bapbId' });

models.BAPBApproval.belongsTo(models.BAPB, { foreignKey: 'bapbId' });
models.BAPBApproval.belongsTo(models.User, { 
  as: 'approver', 
  foreignKey: 'approverId' 
});

models.BAPBAttachment.belongsTo(models.BAPB, { foreignKey: 'bapbId' });
models.BAPBAttachment.belongsTo(models.User, { 
  as: 'uploader', 
  foreignKey: 'uploadedBy' 
});

// ==================== BAPP Associations ====================
models.BAPP.belongsTo(models.User, { 
  as: 'vendor', 
  foreignKey: 'vendorId' 
});

models.BAPP.belongsTo(models.User, { 
  as: 'direksiPekerjaan', 
  foreignKey: 'direksiPekerjaanId' 
});

models.BAPP.hasMany(models.BAPPWorkItem, { 
  foreignKey: 'bappId', 
  as: 'workItems',
  onDelete: 'CASCADE' 
});

models.BAPP.hasMany(models.BAPPApproval, { 
  foreignKey: 'bappId', 
  as: 'approvals',
  onDelete: 'CASCADE' 
});

models.BAPP.hasMany(models.BAPPAttachment, { 
  foreignKey: 'bappId', 
  as: 'attachments',
  onDelete: 'CASCADE' 
});

models.BAPPWorkItem.belongsTo(models.BAPP, { foreignKey: 'bappId' });

models.BAPPApproval.belongsTo(models.BAPP, { foreignKey: 'bappId' });
models.BAPPApproval.belongsTo(models.User, { 
  as: 'approver', 
  foreignKey: 'approverId' 
});

models.BAPPAttachment.belongsTo(models.BAPP, { foreignKey: 'bappId' });
models.BAPPAttachment.belongsTo(models.User, { 
  as: 'uploader', 
  foreignKey: 'uploadedBy' 
});

// ==================== User Associations ====================
models.User.hasMany(models.BAPB, { 
  foreignKey: 'vendorId', 
  as: 'bapbVendor' 
});

models.User.hasMany(models.BAPP, { 
  foreignKey: 'vendorId', 
  as: 'bappVendor' 
});

module.exports = { sequelize, ...models };