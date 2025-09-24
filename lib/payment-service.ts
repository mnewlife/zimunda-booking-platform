import { Paynow } from 'paynow';
import { PrismaClient } from '@prisma/client';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class PaymentService {
  private paynow: Paynow;

  constructor() {
    this.paynow = new Paynow(
      process.env.PAYNOW_INTEGRATION_ID!,
      process.env.PAYNOW_INTEGRATION_KEY!,
      process.env.PAYNOW_RESULT_URL!,
      process.env.PAYNOW_RETURN_URL!
    );
  }

  async initializePayment(
    bookingId: string,
    amount: number,
    method: PaymentMethod,
    customerEmail: string,
    customerPhone?: string
  ) {
    try {
      // Create payment record
      const payment = await prisma.payment.create({
        data: {
          bookingId,
          amount,
          currency: 'USD',
          method,
          status: 'PENDING',
        },
      });

      switch (method) {
        case 'PAYNOW':
          return await this.initializePaynowPayment(
            payment.id,
            amount,
            customerEmail,
            customerPhone
          );
        
        case 'CASH':
          return await this.initializeCashPayment(payment.id);
        
        case 'BANK_TRANSFER':
          return await this.initializeBankTransferPayment(payment.id, amount);
        
        default:
          throw new Error(`Unsupported payment method: ${method}`);
      }
    } catch (error) {
      console.error('Payment initialization error:', error);
      throw error;
    }
  }

  private async initializePaynowPayment(
    paymentId: string,
    amount: number,
    customerEmail: string,
    customerPhone?: string
  ) {
    try {
      const payment = this.paynow.createPayment(`Payment-${paymentId}`, customerEmail);
      payment.add('Zimunda Estate Booking', amount);

      const response = await this.paynow.send(payment);

      if (response.success) {
        // Update payment with external reference
        await prisma.payment.update({
          where: { id: paymentId },
          data: {
            externalReference: response.reference,
            status: 'PENDING',
          },
        });

        return {
          success: true,
          paymentId,
          redirectUrl: response.redirectUrl,
          reference: response.reference,
          instructions: response.instructions,
        };
      } else {
        throw new Error(`Paynow error: ${response.error}`);
      }
    } catch (error) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { status: 'FAILED' },
      });
      throw error;
    }
  }

  private async initializeCashPayment(paymentId: string) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PENDING',
        notes: 'Cash payment on arrival',
      },
    });

    return {
      success: true,
      paymentId,
      instructions: this.generateCashInstructions(),
    };
  }

  private async initializeBankTransferPayment(paymentId: string, amount: number) {
    await prisma.payment.update({
      where: { id: paymentId },
      data: {
        status: 'PENDING',
        notes: 'Bank transfer payment',
      },
    });

    return {
      success: true,
      paymentId,
      instructions: this.generateBankTransferInstructions(amount),
    };
  }

  private generateCashInstructions() {
    return {
      title: 'Cash Payment Instructions',
      steps: [
        'Your booking is confirmed and reserved for 24 hours',
        'Please bring the exact amount in cash upon arrival',
        'Payment must be made at check-in',
        'We accept USD, ZWL, and South African Rand',
        'A receipt will be provided upon payment',
      ],
      notes: [
        'Booking will be cancelled if payment is not received within 24 hours of arrival',
        'Please contact us if you need to arrange alternative payment',
      ],
    };
  }

  private generateBankTransferInstructions(amount: number) {
    return {
      title: 'Bank Transfer Instructions',
      bankDetails: {
        bankName: process.env.BANK_NAME || 'Standard Chartered Bank',
        accountName: process.env.BANK_ACCOUNT_NAME || 'Zimunda Estate',
        accountNumber: process.env.BANK_ACCOUNT_NUMBER || '0123456789',
        branchCode: process.env.BANK_BRANCH_CODE || '20-20-20',
        swiftCode: process.env.BANK_SWIFT_CODE || 'SCBLZWHX',
      },
      amount: `$${amount.toFixed(2)} USD`,
      reference: `ZIMUNDA-BOOKING-${Date.now()}`,
      steps: [
        'Transfer the exact amount to the bank account above',
        'Use the provided reference number',
        'Send proof of payment to payments@zimunda.com',
        'Your booking will be confirmed once payment is verified',
      ],
      notes: [
        'Bank transfers may take 1-3 business days to process',
        'Please include the reference number in your transfer',
        'Contact us if you need assistance with the transfer',
      ],
    };
  }

  async verifyPaynowTransaction(reference: string) {
    try {
      const status = await this.paynow.pollTransaction(reference);
      
      const payment = await prisma.payment.findFirst({
        where: { externalReference: reference },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      let newStatus: PaymentStatus;
      if (status.paid) {
        newStatus = 'COMPLETED';
      } else if (status.status === 'Cancelled') {
        newStatus = 'CANCELLED';
      } else if (status.status === 'Failed') {
        newStatus = 'FAILED';
      } else {
        newStatus = 'PENDING';
      }

      const updatedPayment = await prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: newStatus,
          completedAt: status.paid ? new Date() : null,
        },
      });

      // Update booking status if payment is completed
      if (newStatus === 'COMPLETED') {
        await prisma.booking.update({
          where: { id: payment.bookingId },
          data: {
            paymentStatus: 'COMPLETED',
            status: 'CONFIRMED',
          },
        });
      }

      return {
        success: true,
        status: newStatus,
        payment: updatedPayment,
      };
    } catch (error) {
      console.error('Payment verification error:', error);
      throw error;
    }
  }

  async markOfflinePaymentComplete(
    paymentId: string,
    receivedBy: string,
    notes?: string
  ) {
    try {
      const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          receivedBy,
          notes: notes || payment.notes,
        },
      });

      // Update booking status
      await prisma.booking.update({
        where: { id: payment.bookingId },
        data: {
          paymentStatus: 'COMPLETED',
          status: 'CONFIRMED',
        },
      });

      return {
        success: true,
        payment,
      };
    } catch (error) {
      console.error('Error marking payment complete:', error);
      throw error;
    }
  }

  async getPaymentStatus(paymentId: string) {
    try {
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
        include: {
          booking: {
            include: {
              property: true,
              guest: true,
            },
          },
        },
      });

      if (!payment) {
        throw new Error('Payment not found');
      }

      return {
        success: true,
        payment,
      };
    } catch (error) {
      console.error('Error getting payment status:', error);
      throw error;
    }
  }
}

export const paymentService = new PaymentService();