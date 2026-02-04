import { NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const result = await sql`
      SELECT * FROM businesses WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching business:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const body = await request.json();
    const {
      name,
      description,
      logo_url,
      banner_url,
      category,
      address,
      phone,
      email,
      opening_hours,
      status,
    } = body;

    const result = await sql`
      UPDATE businesses
      SET name = ${name},
          description = ${description},
          logo_url = ${logo_url},
          banner_url = ${banner_url},
          category = ${category},
          address = ${address},
          phone = ${phone},
          email = ${email},
          opening_hours = ${opening_hours},
          status = ${status},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating business:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const result = await sql`
      DELETE FROM businesses WHERE id = ${id} RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Business not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Business deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting business:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
