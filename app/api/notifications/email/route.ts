import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';
import { sendOrderConfirmationEmail, sendShippingUpdateEmail } from '../../utils/email';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, orderId, customerEmail, customerName, orderNumber, status, trackingUrl } = body;

    if (type === 'order_confirmation') {
      // Fetch order details from database
      if (!orderId) {
        return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
      }

      const orderResult = await sql`
        SELECT orders.*, 
               json_agg(
                 json_build_object(
                   'name', order_items.product_name,
                   'quantity', order_items.quantity,
                   'price', order_items.price
                 )
               ) FILTER (WHERE order_items.id IS NOT NULL) as items
        FROM orders
        LEFT JOIN order_items ON orders.id = order_items.order_id
        WHERE orders.id = ${orderId}
        GROUP BY orders.id
      `;

      if (orderResult.length === 0) {
        return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
      }

      const order = orderResult[0];
      const items = order.items || [];

      // Calculate subtotal
      const subtotal = items.reduce((sum: number, item: any) => 
        sum + (parseFloat(item.price) * item.quantity), 0
      );

      // Send email
      const result = await sendOrderConfirmationEmail(
        order.customer_email,
        order.customer_name,
        order.order_number,
        items,
        subtotal,
        parseFloat(order.discount_amount) || 0,
        parseFloat(order.total_amount),
        order.delivery_type || 'delivery',
        order.delivery_address,
        order.customer_phone
      );

      return NextResponse.json(result);
    }

    if (type === 'shipping_update') {
      // Send shipping update email
      if (!customerEmail || !customerName || !orderNumber || !status) {
        return NextResponse.json(
          { success: false, error: 'Missing required fields' },
          { status: 400 }
        );
      }

      const result = await sendShippingUpdateEmail(
        customerEmail,
        customerName,
        orderNumber,
        status,
        trackingUrl
      );

      return NextResponse.json(result);
    }

    return NextResponse.json({ success: false, error: 'Invalid email type' }, { status: 400 });
  } catch (error: any) {
    console.error('Error sending email:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
