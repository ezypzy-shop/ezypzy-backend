import { NextRequest, NextResponse } from 'next/server';
import sql from '../utils/sql';
import { sendOrderConfirmationEmail } from '../utils/email';

// Helper function to convert numeric strings to numbers and normalize field names
function normalizeOrder(order: any) {
  return {
    ...order,
    subtotal: parseFloat(order.subtotal) || 0,
    shipping_fee: parseFloat(order.shipping_fee) || 0,
    delivery_fee: parseFloat(order.shipping_fee) || 0,
    total_amount: parseFloat(order.total_amount) || 0,
    discount_amount: parseFloat(order.discount_amount) || 0,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const businessId = searchParams.get('businessId');
    const orderIdParam = searchParams.get('orderId') || searchParams.get('id');
    const orderNumber = searchParams.get('order_number');

    console.log('[GET /api/orders] Query params:', { userId, businessId, orderIdParam, orderNumber });

    // If order_number is provided, fetch single order by order_number
    if (orderNumber) {
      const result = await sql`
        SELECT 
          o.*,
          b.name as business_name,
          b.owner_id as business_user_id
        FROM orders o
        LEFT JOIN businesses b ON o.business_id::integer = b.id
        WHERE o.order_number = ${orderNumber}
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        order: normalizeOrder(result[0])
      });
    }

    // If orderId is provided, fetch single order with all details
    if (orderIdParam) {
      const orderId = parseInt(orderIdParam, 10);
      
      if (isNaN(orderId)) {
        return NextResponse.json(
          { success: false, error: 'Invalid order ID' },
          { status: 400 }
        );
      }

      const result = await sql`
        SELECT 
          o.*,
          b.name as business_name,
          b.owner_id as business_user_id
        FROM orders o
        LEFT JOIN businesses b ON o.business_id::integer = b.id
        WHERE o.id = ${orderId}
      `;

      if (result.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Order not found' },
          { status: 404 }
        );
      }

      return NextResponse.json({ 
        success: true, 
        order: normalizeOrder(result[0])
      });
    }

    // Fetch orders for a specific user (supports Firebase UID strings)
    if (userId) {
      const orders = await sql`
        SELECT 
          o.*,
          b.name as business_name,
          b.logo_url as business_logo,
          jsonb_array_length(o.items::jsonb) as items_count,
          o.items::jsonb->0->>'name' as first_item_name,
          o.items::jsonb->0->>'image' as first_item_image
        FROM orders o
        LEFT JOIN businesses b ON o.business_id::integer = b.id
        WHERE o.user_id = ${userId}
        ORDER BY o.created_at DESC
      `;

      return NextResponse.json({ 
        success: true, 
        orders: orders.map(normalizeOrder)
      });
    }

    // Fetch orders for a specific business
    if (businessId) {
      console.log('[GET /api/orders] Fetching orders for businessId:', businessId);
      
      const businessIdInt = parseInt(businessId, 10);
      
      if (isNaN(businessIdInt)) {
        return NextResponse.json(
          { success: false, error: 'Invalid business ID' },
          { status: 400 }
        );
      }

      const orders = await sql`
        SELECT 
          o.*
        FROM orders o
        WHERE o.business_id = ${businessIdInt}
        ORDER BY o.created_at DESC
      `;

      console.log('[GET /api/orders] Found orders:', orders.length);

      return NextResponse.json({ 
        success: true, 
        orders: orders.map(normalizeOrder)
      });
    }

    console.log('[GET /api/orders] Missing required parameters');
    return NextResponse.json(
      { success: false, error: 'userId or businessId is required' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[GET /api/orders] Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch orders' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      user_id,
      business_id,
      items,
      total_amount,
      subtotal,
      shipping_fee,
      delivery_type,
      delivery_address,
      payment_method,
      customer_name,
      customer_email,
      customer_phone,
      discount_code,
      discount_amount,
      notes
    } = body;

    // Generate order number
    const order_number = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;

    const result = await sql`
      INSERT INTO orders (
        order_number,
        user_id,
        business_id,
        items,
        total_amount,
        subtotal,
        shipping_fee,
        delivery_type,
        delivery_address,
        payment_method,
        customer_name,
        customer_email,
        customer_phone,
        discount_code,
        discount_amount,
        notes,
        status,
        created_at
      ) VALUES (
        ${order_number},
        ${user_id},
        ${business_id},
        ${JSON.stringify(items)},
        ${total_amount},
        ${subtotal},
        ${shipping_fee},
        ${delivery_type},
        ${delivery_address},
        ${payment_method},
        ${customer_name},
        ${customer_email},
        ${customer_phone},
        ${discount_code || null},
        ${discount_amount || 0},
        ${notes || null},
        'pending',
        NOW()
      ) RETURNING *
    `;

    const order = normalizeOrder(result[0]);

    // Send order confirmation email
    if (customer_email) {
      try {
        await sendOrderConfirmationEmail(
          customer_email,
          customer_name || 'Customer',
          order_number,
          items,
          subtotal || 0,
          discount_amount || 0,
          total_amount,
          delivery_type || 'pickup',
          delivery_address,
          customer_phone
        );
        console.log(`✅ Email sent to ${customer_email} for order ${order_number}`);
      } catch (emailError) {
        console.error('❌ Failed to send order confirmation email:', emailError);
      }
    }

    return NextResponse.json({ 
      success: true, 
      order
    });
  } catch (error: any) {
    console.error('Error creating order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create order' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('[PUT /api/orders] Received body:', body);
    
    const { orderId, order_id, status, tracking_number } = body;
    
    // Support both orderId and order_id
    const id = orderId || order_id;
    console.log('[PUT /api/orders] Order ID:', id, 'Status:', status, 'Tracking:', tracking_number);

    if (!id) {
      console.error('[PUT /api/orders] Missing orderId');
      return NextResponse.json(
        { success: false, error: 'orderId is required' },
        { status: 400 }
      );
    }

    if (!status && !tracking_number) {
      console.error('[PUT /api/orders] No fields to update');
      return NextResponse.json(
        { success: false, error: 'status or tracking_number is required' },
        { status: 400 }
      );
    }

    const numericId = typeof id === 'string' ? parseInt(id, 10) : id;
    
    if (isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: 'Invalid order ID' },
        { status: 400 }
      );
    }
    
    console.log('[PUT /api/orders] Updating order with numeric ID:', numericId);

    // Update order status and/or tracking number
    let result;
    if (status && tracking_number) {
      result = await sql`
        UPDATE orders 
        SET status = ${status}, 
            tracking_number = ${tracking_number},
            updated_at = NOW()
        WHERE id = ${numericId}
        RETURNING *
      `;
    } else if (status) {
      console.log('[PUT /api/orders] Executing status update query for ID:', numericId);
      result = await sql`
        UPDATE orders 
        SET status = ${status},
            updated_at = NOW()
        WHERE id = ${numericId}
        RETURNING *
      `;
      console.log('[PUT /api/orders] Update result:', result);
    } else if (tracking_number) {
      result = await sql`
        UPDATE orders 
        SET tracking_number = ${tracking_number},
            updated_at = NOW()
        WHERE id = ${numericId}
        RETURNING *
      `;
    }

    if (!result || result.length === 0) {
      console.error('[PUT /api/orders] Order not found with ID:', numericId);
      return NextResponse.json(
        { success: false, error: 'Order not found' },
        { status: 404 }
      );
    }

    console.log('[PUT /api/orders] Successfully updated order:', result[0]);
    return NextResponse.json({ 
      success: true, 
      order: normalizeOrder(result[0])
    });
  } catch (error: any) {
    console.error('[PUT /api/orders] Error updating order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update order' },
      { status: 500 }
    );
  }
}
