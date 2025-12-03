
// Simulasi Integrasi Pembayaran

const { BAPB, BAPP, User, PaymentLog } = require('../models');
const moment = require('moment');

class PaymentService {
  
  /**
   * Simulate payment processing for approved BAPB
   * In production, this would integrate with actual payment gateway
   * @param {string} bapbId - BAPB ID
   * @param {object} paymentData - Payment details
   * @returns {object} Payment simulation result
   */
  async processBAPBPayment(bapbId, paymentData) {
    try {
      // Fetch BAPB data
      const bapb = await BAPB.findByPk(bapbId, {
        include: [
          { model: User, as: 'vendor', attributes: ['id', 'name', 'company', 'email'] }
        ]
      });

      if (!bapb) {
        throw new Error('BAPB not found');
      }

      // Check if BAPB is approved
      if (bapb.status !== 'approved') {
        throw new Error('BAPB must be approved before payment processing');
      }

      // Simulate payment gateway call
      const paymentResult = await this.simulatePaymentGateway({
        documentType: 'BAPB',
        documentNumber: bapb.bapbNumber,
        vendorId: bapb.vendorId,
        vendorName: bapb.vendor.name,
        amount: paymentData.amount,
        description: `Payment for ${bapb.bapbNumber} - ${bapb.orderNumber}`,
        metadata: {
          bapbId: bapb.id,
          orderNumber: bapb.orderNumber,
          deliveryDate: bapb.deliveryDate
        }
      });

      // Log payment attempt
      await this.logPaymentAttempt({
        documentType: 'BAPB',
        documentId: bapb.id,
        documentNumber: bapb.bapbNumber,
        vendorId: bapb.vendorId,
        amount: paymentData.amount,
        status: paymentResult.status,
        paymentMethod: paymentData.paymentMethod || 'bank_transfer',
        transactionId: paymentResult.transactionId,
        gatewayResponse: paymentResult
      });

      return {
        success: true,
        message: 'Payment processed successfully (SIMULATION)',
        data: {
          bapbNumber: bapb.bapbNumber,
          vendorName: bapb.vendor.name,
          amount: paymentData.amount,
          transactionId: paymentResult.transactionId,
          status: paymentResult.status,
          estimatedSettlement: paymentResult.estimatedSettlement,
          simulationNote: 'This is a simulated payment - No actual money transferred'
        }
      };

    } catch (error) {
      console.error('BAPB payment processing error:', error);
      throw error;
    }
  }

  /**
   * Simulate payment processing for approved BAPP
   * @param {string} bappId - BAPP ID
   * @param {object} paymentData - Payment details
   * @returns {object} Payment simulation result
   */
  async processBAPPPayment(bappId, paymentData) {
    try {
      const bapp = await BAPP.findByPk(bappId, {
        include: [
          { model: User, as: 'vendor', attributes: ['id', 'name', 'company', 'email'] }
        ]
      });

      if (!bapp) {
        throw new Error('BAPP not found');
      }

      if (bapp.status !== 'approved') {
        throw new Error('BAPP must be approved before payment processing');
      }

      // Calculate payment based on progress percentage
      const progressBasedAmount = (paymentData.contractAmount * bapp.totalProgress) / 100;

      const paymentResult = await this.simulatePaymentGateway({
        documentType: 'BAPP',
        documentNumber: bapp.bappNumber,
        vendorId: bapp.vendorId,
        vendorName: bapp.vendor.name,
        amount: paymentData.amount || progressBasedAmount,
        description: `Payment for ${bapp.bappNumber} - ${bapp.projectName} (${bapp.totalProgress}% complete)`,
        metadata: {
          bappId: bapp.id,
          contractNumber: bapp.contractNumber,
          projectName: bapp.projectName,
          totalProgress: bapp.totalProgress,
          contractAmount: paymentData.contractAmount
        }
      });

      await this.logPaymentAttempt({
        documentType: 'BAPP',
        documentId: bapp.id,
        documentNumber: bapp.bappNumber,
        vendorId: bapp.vendorId,
        amount: paymentData.amount || progressBasedAmount,
        status: paymentResult.status,
        paymentMethod: paymentData.paymentMethod || 'bank_transfer',
        transactionId: paymentResult.transactionId,
        gatewayResponse: paymentResult
      });

      return {
        success: true,
        message: 'Payment processed successfully (SIMULATION)',
        data: {
          bappNumber: bapp.bappNumber,
          projectName: bapp.projectName,
          vendorName: bapp.vendor.name,
          totalProgress: bapp.totalProgress,
          contractAmount: paymentData.contractAmount,
          calculatedAmount: progressBasedAmount.toFixed(2),
          paidAmount: paymentData.amount || progressBasedAmount,
          transactionId: paymentResult.transactionId,
          status: paymentResult.status,
          estimatedSettlement: paymentResult.estimatedSettlement,
          simulationNote: 'This is a simulated payment - No actual money transferred'
        }
      };

    } catch (error) {
      console.error('BAPP payment processing error:', error);
      throw error;
    }
  }

  /**
   * Simulate payment gateway response
   * Mimics real payment gateway behavior
   * @param {object} paymentRequest - Payment request data
   * @returns {object} Simulated gateway response
   */
  async simulatePaymentGateway(paymentRequest) {
    // Simulate network delay (100-500ms)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 400 + 100));

    // Generate transaction ID
    const transactionId = `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Simulate success rate (95% success)
    const isSuccess = Math.random() > 0.05;

    if (isSuccess) {
      return {
        status: 'success',
        transactionId,
        timestamp: new Date().toISOString(),
        amount: paymentRequest.amount,
        currency: 'IDR',
        paymentMethod: 'bank_transfer',
        estimatedSettlement: moment().add(1, 'days').format('YYYY-MM-DD'),
        gatewayReference: `GW-${transactionId}`,
        vendorId: paymentRequest.vendorId,
        vendorName: paymentRequest.vendorName,
        description: paymentRequest.description,
        metadata: paymentRequest.metadata,
        message: 'Payment successfully processed',
        simulationMode: true
      };
    } else {
      // Simulate failure scenarios
      const failureReasons = [
        'Insufficient funds in system account',
        'Vendor bank account validation failed',
        'Daily transaction limit exceeded',
        'Payment gateway timeout',
        'Vendor account suspended'
      ];

      const randomReason = failureReasons[Math.floor(Math.random() * failureReasons.length)];

      return {
        status: 'failed',
        transactionId,
        timestamp: new Date().toISOString(),
        amount: paymentRequest.amount,
        errorCode: 'PAYMENT_FAILED',
        errorMessage: randomReason,
        vendorId: paymentRequest.vendorId,
        simulationMode: true
      };
    }
  }

  /**
   * Log payment attempt to database
   * @param {object} logData - Payment log data
   */
  async logPaymentAttempt(logData) {
    try {
      await PaymentLog.create({
        documentType: logData.documentType,
        documentId: logData.documentId,
        documentNumber: logData.documentNumber,
        vendorId: logData.vendorId,
        amount: logData.amount,
        paymentMethod: logData.paymentMethod,
        status: logData.status,
        transactionId: logData.transactionId,
        gatewayResponse: JSON.stringify(logData.gatewayResponse),
        processedAt: new Date()
      });
    } catch (error) {
      console.error('Error logging payment attempt:', error);
      // Don't throw - logging failure shouldn't break payment flow
    }
  }

  /**
   * Get payment logs for a document
   * @param {string} documentType - 'BAPB' or 'BAPP'
   * @param {string} documentId - Document ID
   * @returns {array} Payment logs
   */
  async getPaymentLogs(documentType, documentId) {
    try {
      const logs = await PaymentLog.findAll({
        where: {
          documentType,
          documentId
        },
        include: [
          { 
            model: User, 
            as: 'vendor', 
            attributes: ['id', 'name', 'company', 'email'] 
          }
        ],
        order: [['processedAt', 'DESC']]
      });

      return logs.map(log => ({
        id: log.id,
        transactionId: log.transactionId,
        amount: log.amount,
        paymentMethod: log.paymentMethod,
        status: log.status,
        vendor: log.vendor,
        processedAt: log.processedAt,
        gatewayResponse: JSON.parse(log.gatewayResponse)
      }));
    } catch (error) {
      console.error('Error fetching payment logs:', error);
      throw error;
    }
  }

  /**
   * Get payment summary statistics
   * @param {object} filters - Filter options
   * @returns {object} Payment statistics
   */
  async getPaymentStatistics(filters = {}) {
    try {
      const { vendorId, startDate, endDate, documentType } = filters;

      const where = {};
      if (vendorId) where.vendorId = vendorId;
      if (documentType) where.documentType = documentType;
      if (startDate && endDate) {
        where.processedAt = {
          [Op.between]: [new Date(startDate), new Date(endDate)]
        };
      }

      const logs = await PaymentLog.findAll({ where });

      const statistics = {
        totalTransactions: logs.length,
        successfulTransactions: logs.filter(l => l.status === 'success').length,
        failedTransactions: logs.filter(l => l.status === 'failed').length,
        totalAmount: logs
          .filter(l => l.status === 'success')
          .reduce((sum, l) => sum + parseFloat(l.amount), 0),
        averageAmount: 0,
        successRate: 0,
        byDocumentType: {
          BAPB: logs.filter(l => l.documentType === 'BAPB').length,
          BAPP: logs.filter(l => l.documentType === 'BAPP').length
        }
      };

      if (statistics.successfulTransactions > 0) {
        statistics.averageAmount = 
          statistics.totalAmount / statistics.successfulTransactions;
      }

      if (statistics.totalTransactions > 0) {
        statistics.successRate = 
          (statistics.successfulTransactions / statistics.totalTransactions) * 100;
      }

      return statistics;
    } catch (error) {
      console.error('Error calculating payment statistics:', error);
      throw error;
    }
  }

  /**
   * Check if document is ready for payment
   * @param {string} documentType - 'BAPB' or 'BAPP'
   * @param {string} documentId - Document ID
   * @returns {object} Readiness status
   */
  async checkPaymentReadiness(documentType, documentId) {
    try {
      const Model = documentType === 'BAPB' ? BAPB : BAPP;
      const document = await Model.findByPk(documentId);

      if (!document) {
        return {
          ready: false,
          reason: 'Document not found',
          blockers: ['Document does not exist']
        };
      }

      const blockers = [];

      // Check approval status
      if (document.status !== 'approved') {
        blockers.push('Document is not approved');
      }

      // Check if already paid (check payment logs)
      const existingPayments = await PaymentLog.findAll({
        where: {
          documentType,
          documentId,
          status: 'success'
        }
      });

      if (existingPayments.length > 0) {
        blockers.push('Payment already processed for this document');
      }

      // Check vendor details
      const vendor = await User.findByPk(document.vendorId);
      if (!vendor || !vendor.isActive) {
        blockers.push('Vendor account is inactive or not found');
      }

      return {
        ready: blockers.length === 0,
        reason: blockers.length > 0 ? 'Document not ready for payment' : 'Document ready for payment',
        blockers,
        document: {
          id: document.id,
          number: document.bapbNumber || document.bappNumber,
          status: document.status,
          vendorId: document.vendorId
        }
      };
    } catch (error) {
      console.error('Error checking payment readiness:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();