import sgMail from '@sendgrid/mail';

// Initialize SendGrid with API key from environment
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM_EMAIL = process.env.SENDGRID_FROM_EMAIL || 'ashok@ezypzy.shop';
const SENDGRID_FROM_NAME = process.env.SENDGRID_FROM_NAME || 'EzyPzy Shop';

if (SENDGRID_API_KEY) {
  sgMail.setApiKey(SENDGRID_API_KEY);
}

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

/**
 * Send order confirmation email to customer
 */
export async function sendOrderConfirmationEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  items: OrderItem[],
  subtotal: number,
  discount: number,
  total: number,
  deliveryType: string,
  deliveryAddress?: any,
  customerPhone?: string
) {
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SendGrid API key not configured. Email skipped.');
    return { success: false, message: 'Email service not configured' };
  }

  const isDelivery = deliveryType === 'delivery';
  const addressString = typeof deliveryAddress === 'string' 
    ? deliveryAddress 
    : deliveryAddress 
      ? `${deliveryAddress.street || ''}, ${deliveryAddress.city || ''}, ${deliveryAddress.state || ''} ${deliveryAddress.postalCode || ''}`.trim()
      : '';

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Order Confirmed</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, #ff6b35 0%, #f97316 100%); padding: 40px 20px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 10px;">🎉</div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 10px 0;">Order Confirmed!</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">Thank you for your order</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #000000; margin: 0 0 20px 0;">Hi ${customerName},</p>
            <p style="font-size: 15px; color: #6b7280; line-height: 1.6; margin: 0 0 30px 0;">
              We've received your order and it's being prepared! You'll receive another email once your order is ${isDelivery ? 'shipped' : 'ready for pickup'}.
            </p>

            <!-- Order Number Card -->
            <div style="background-color: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <div style="font-size: 11px; color: #f97316; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px;">ORDER NUMBER</div>
              <div style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: 0.5px;">${orderNumber}</div>
            </div>

            <!-- Customer Details -->
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 20px;">
              <div style="font-size: 11px; color: #9ca3af; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px;">CUSTOMER DETAILS</div>
              <p style="margin: 0 0 8px 0; font-weight: bold; color: #111827;">${customerName}</p>
              ${customerPhone ? `<p style="margin: 0; color: #6b7280;">📞 ${customerPhone}</p>` : ''}
            </div>

            <!-- Delivery/Pickup Address -->
            ${isDelivery ? `
              <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
                <div style="font-size: 11px; color: #9ca3af; font-weight: bold; letter-spacing: 1px; margin-bottom: 12px;">DELIVERY ADDRESS</div>
                <p style="margin: 0; color: #374151; line-height: 1.6;">${addressString}</p>
              </div>
            ` : `
              <div style="background-color: #fef3c7; border-radius: 12px; padding: 20px; margin-bottom: 30px; text-align: center;">
                <div style="font-size: 11px; color: #92400e; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px;">📍 PICKUP ORDER</div>
                <p style="margin: 0; color: #92400e; font-size: 14px;">This is a pickup order. We'll notify you when it's ready!</p>
              </div>
            `}

            <!-- Order Summary -->
            <h2 style="font-size: 16px; font-weight: bold; color: #374151; margin: 0 0 16px 0;">Order Summary</h2>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 20px;">
              ${items.map(item => `
                <tr>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb;">
                    <p style="margin: 0; font-weight: bold; color: #374151;">${item.name}</p>
                    <p style="margin: 4px 0 0 0; font-size: 13px; color: #9ca3af;">Qty: ${item.quantity}</p>
                  </td>
                  <td style="padding: 12px 0; border-bottom: 1px solid #e5e7eb; text-align: right; font-weight: bold; color: #374151;">
                    ₹${(item.price * item.quantity).toFixed(2)}
                  </td>
                </tr>
              `).join('')}
            </table>

            <!-- Price Breakdown -->
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin-bottom: 30px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">Subtotal</td>
                  <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #374151; font-size: 14px;">₹${subtotal.toFixed(2)}</td>
                </tr>
                ${discount > 0 ? `
                  <tr>
                    <td style="padding: 8px 0; color: #22c55e; font-size: 14px;">Discount</td>
                    <td style="padding: 8px 0; text-align: right; font-weight: bold; color: #22c55e; font-size: 14px;">-₹${discount.toFixed(2)}</td>
                  </tr>
                ` : ''}
                <tr>
                  <td colspan="2" style="padding: 12px 0; border-top: 1px solid #e5e7eb;"></td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #111827;">Total</td>
                  <td style="padding: 8px 0; text-align: right; font-size: 18px; font-weight: bold; color: #ff6b35;">₹${total.toFixed(2)}</td>
                </tr>
              </table>
            </div>

            <!-- Payment Info -->
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
              <p style="margin: 0; color: #22c55e; font-weight: bold; font-size: 14px;">💰 Payment Method</p>
              <p style="margin: 8px 0 0 0; color: #166534; font-size: 14px;">
                Cash on ${isDelivery ? 'Delivery' : 'Pickup'} - Pay when you ${isDelivery ? 'receive' : 'pick up'} your order
              </p>
            </div>

            <p style="text-align: center; color: #6b7280; font-size: 14px; margin: 0;">
              Questions about your order? Contact us anytime!
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">This email was sent by ${SENDGRID_FROM_NAME}</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await sgMail.send({
      to: customerEmail,
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      subject: `Order Confirmed - ${orderNumber}`,
      html: emailHtml,
    });

    console.log(`✅ Order confirmation email sent to ${customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending order confirmation email:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send shipping update email to customer
 */
export async function sendShippingUpdateEmail(
  customerEmail: string,
  customerName: string,
  orderNumber: string,
  status: string,
  trackingUrl?: string
) {
  if (!SENDGRID_API_KEY) {
    console.warn('⚠️ SendGrid API key not configured. Email skipped.');
    return { success: false, message: 'Email service not configured' };
  }

  // Status configurations
  const statusConfig: Record<string, { emoji: string; title: string; message: string; color: string }> = {
    processing: {
      emoji: '⏳',
      title: 'Order Being Prepared',
      message: `Your order ${orderNumber} is being prepared with care.`,
      color: '#eab308',
    },
    ready: {
      emoji: '✅',
      title: 'Order Ready!',
      message: `Great news! Your order ${orderNumber} is ready for pickup/delivery.`,
      color: '#22c55e',
    },
    out_for_delivery: {
      emoji: '🚚',
      title: 'Out for Delivery',
      message: `Your order ${orderNumber} is on its way to you!`,
      color: '#3b82f6',
    },
    delivered: {
      emoji: '🎉',
      title: 'Order Delivered!',
      message: `Your order ${orderNumber} has been successfully delivered. Enjoy!`,
      color: '#22c55e',
    },
    completed: {
      emoji: '✅',
      title: 'Order Completed',
      message: `Thank you for your order! Order ${orderNumber} is now completed.`,
      color: '#22c55e',
    },
    cancelled: {
      emoji: '❌',
      title: 'Order Cancelled',
      message: `Your order ${orderNumber} has been cancelled.`,
      color: '#ef4444',
    },
  };

  const config = statusConfig[status] || statusConfig.processing;

  const emailHtml = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${config.title}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #f9fafb;">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background-color: #ffffff;">
        <!-- Header -->
        <tr>
          <td style="background: linear-gradient(135deg, ${config.color} 0%, ${config.color}dd 100%); padding: 40px 20px; text-align: center;">
            <div style="font-size: 60px; margin-bottom: 10px;">${config.emoji}</div>
            <h1 style="color: #ffffff; font-size: 28px; font-weight: bold; margin: 0 0 10px 0;">${config.title}</h1>
            <p style="color: rgba(255, 255, 255, 0.9); font-size: 16px; margin: 0;">${config.message}</p>
          </td>
        </tr>

        <!-- Content -->
        <tr>
          <td style="padding: 30px 20px;">
            <p style="font-size: 16px; color: #000000; margin: 0 0 20px 0;">Hi ${customerName},</p>

            <!-- Order Number Card -->
            <div style="background-color: #fff7ed; border: 2px solid #fed7aa; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 30px;">
              <div style="font-size: 11px; color: #f97316; font-weight: bold; letter-spacing: 1px; margin-bottom: 8px;">ORDER NUMBER</div>
              <div style="font-size: 24px; font-weight: bold; color: #000000; letter-spacing: 0.5px;">${orderNumber}</div>
            </div>

            ${trackingUrl ? `
              <!-- Track Order Button -->
              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${trackingUrl}" style="display: inline-block; background-color: ${config.color}; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                  Track Your Order
                </a>
              </div>
            ` : ''}

            <!-- Info Card -->
            <div style="background-color: #f0fdf4; border-left: 4px solid #22c55e; border-radius: 8px; padding: 16px; margin-bottom: 30px;">
              <p style="margin: 0; color: #166534; font-size: 14px; line-height: 1.6;">
                ${status === 'delivered' 
                  ? '💚 Thank you for choosing us! We hope you enjoy your order.' 
                  : '💡 You can track your order status anytime in the app.'}
              </p>
            </div>

            <p style="text-align: center; color: #6b7280; font-size: 14px; margin: 0;">
              Questions? We're here to help!
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background-color: #f9fafb; padding: 20px; text-align: center; border-top: 1px solid #e5e7eb;">
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">This email was sent by ${SENDGRID_FROM_NAME}</p>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;

  try {
    await sgMail.send({
      to: customerEmail,
      from: {
        email: SENDGRID_FROM_EMAIL,
        name: SENDGRID_FROM_NAME,
      },
      subject: `${config.title} - ${orderNumber}`,
      html: emailHtml,
    });

    console.log(`✅ Shipping update email sent to ${customerEmail}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending shipping update email:', error);
    return { success: false, error: error.message };
  }
}
