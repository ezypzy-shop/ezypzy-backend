import { NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    
    const result = await sql`
      SELECT * FROM ads WHERE id = ${id}
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error fetching ad:', error);
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
    const { title, description, image_url, business_id, status } = body;

    const result = await sql`
      UPDATE ads
      SET title = ${title},
          description = ${description},
          image_url = ${image_url},
          business_id = ${business_id},
          status = ${status},
          updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json(result.rows[0]);
  } catch (error: any) {
    console.error('Error updating ad:', error);
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
      DELETE FROM ads WHERE id = ${id} RETURNING *
    `;

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Ad not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Ad deleted successfully' });
  } catch (error: any) {
    console.error('Error deleting ad:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
