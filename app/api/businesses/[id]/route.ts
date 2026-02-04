import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    const result = await sql`
      SELECT * FROM businesses 
      WHERE id = ${id}
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, business: result[0] });
  } catch (error: any) {
    console.error('Error fetching business:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const {
      name,
      description,
      logo_url,
      banner_url,
      image_url,
      address,
      phone,
      email,
      website,
      categories,
      is_active,
      delivery_options,
      payment_methods,
      delivery_fee,
      minimum_order,
      delivery_time,
      spin_wheel_enabled,
      spin_discount_type,
      spin_discount_value
    } = body;

    // Convert arrays to JSON strings for JSONB columns
    const categoriesJson = categories ? JSON.stringify(categories) : undefined;
    const paymentMethodsJson = payment_methods ? JSON.stringify(payment_methods) : undefined;

    const result = await sql`
      UPDATE businesses
      SET
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        logo_url = COALESCE(${logo_url}, logo_url),
        banner_url = COALESCE(${banner_url}, banner_url),
        image_url = COALESCE(${image_url}, image_url),
        address = COALESCE(${address}, address),
        phone = COALESCE(${phone}, phone),
        email = COALESCE(${email}, email),
        website = COALESCE(${website}, website),
        categories = COALESCE(${categoriesJson}::jsonb, categories),
        is_active = COALESCE(${is_active}, is_active),
        delivery_options = COALESCE(${delivery_options}, delivery_options),
        payment_methods = COALESCE(${paymentMethodsJson}::jsonb, payment_methods),
        delivery_fee = COALESCE(${delivery_fee}, delivery_fee),
        minimum_order = COALESCE(${minimum_order}, minimum_order),
        delivery_time = COALESCE(${delivery_time}, delivery_time),
        spin_wheel_enabled = COALESCE(${spin_wheel_enabled}, spin_wheel_enabled),
        spin_discount_type = COALESCE(${spin_discount_type}, spin_discount_type),
        spin_discount_value = COALESCE(${spin_discount_value}, spin_discount_value),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, business: result[0] });
  } catch (error: any) {
    console.error('Error updating business:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = parseInt(params.id);
    
    if (isNaN(id)) {
      return NextResponse.json(
        { success: false, error: 'Invalid business ID' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM businesses 
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, message: 'Business deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting business:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
