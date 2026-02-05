import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

// Handle OPTIONS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const ownerId = searchParams.get('ownerId');

    let result;

    if (id) {
      result = await sql`
        SELECT * FROM businesses 
        WHERE id = ${parseInt(id)}
      `;
    } else if (ownerId) {
      // Support both numeric IDs and Firebase UID strings
      result = await sql`
        SELECT * FROM businesses 
        WHERE owner_id = ${ownerId}
        ORDER BY created_at DESC
      `;
    } else {
      result = await sql`
        SELECT * FROM businesses 
        WHERE is_active = true
        ORDER BY created_at DESC
      `;
    }

    // Fix rating format for all businesses
    const businesses = result.map((business: any) => ({
      ...business,
      rating: business.rating ? parseFloat(business.rating) : 4.5
    }));

    return NextResponse.json({ success: true, businesses }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error fetching businesses:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      name,
      description,
      owner_id,
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

    if (!name || !owner_id) {
      return NextResponse.json(
        { success: false, error: 'Name and owner_id are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    // Use provided images or fallback to placeholder
    const finalLogoUrl = logo_url || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800';
    const finalBannerUrl = banner_url || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800';
    const finalImageUrl = image_url || 'https://images.unsplash.com/photo-1556761175-b413da4baf72?w=800';

    // Convert arrays to JSON strings for JSONB columns
    const categoriesJson = categories ? JSON.stringify(categories) : null;
    const paymentMethodsJson = payment_methods ? JSON.stringify(payment_methods) : null;

    const result = await sql`
      INSERT INTO businesses (
        name, description, owner_id, logo_url, banner_url, image_url,
        address, phone, email, website, categories, is_active,
        delivery_options, payment_methods, delivery_fee, minimum_order, delivery_time,
        spin_wheel_enabled, spin_discount_type, spin_discount_value,
        created_at, updated_at
      ) VALUES (
        ${name}, ${description || null}, ${owner_id}, ${finalLogoUrl},
        ${finalBannerUrl}, ${finalImageUrl}, ${address || null},
        ${phone || null}, ${email || null}, ${website || null},
        ${categoriesJson}, ${is_active !== false},
        ${delivery_options || null}, ${paymentMethodsJson},
        ${delivery_fee || null}, ${minimum_order || null}, ${delivery_time || null},
        ${spin_wheel_enabled || false}, ${spin_discount_type || null},
        ${spin_discount_value || null},
        NOW(), NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({ success: true, business: result[0] }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error creating business:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
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

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Business ID is required' },
        { status: 400, headers: corsHeaders }
      );
    }

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
        categories = COALESCE(${categoriesJson}, categories),
        is_active = COALESCE(${is_active}, is_active),
        delivery_options = COALESCE(${delivery_options}, delivery_options),
        payment_methods = COALESCE(${paymentMethodsJson}, payment_methods),
        delivery_fee = COALESCE(${delivery_fee}, delivery_fee),
        minimum_order = COALESCE(${minimum_order}, minimum_order),
        delivery_time = COALESCE(${delivery_time}, delivery_time),
        spin_wheel_enabled = COALESCE(${spin_wheel_enabled}, spin_wheel_enabled),
        spin_discount_type = COALESCE(${spin_discount_type}, spin_discount_type),
        spin_discount_value = COALESCE(${spin_discount_value}, spin_discount_value),
        updated_at = NOW()
      WHERE id = ${parseInt(id)}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Business not found' },
        { status: 404, headers: corsHeaders }
      );
    }

    return NextResponse.json({ success: true, business: result[0] }, { headers: corsHeaders });
  } catch (error: any) {
    console.error('Error updating business:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500, headers: corsHeaders });
  }
}
