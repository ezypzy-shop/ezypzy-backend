import { NextResponse } from 'next/server';
import sql from '../../../utils/sql';

export async function GET(
  request: Request,
  context: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await context.params;
    
    const result = await sql`
      SELECT * FROM products 
      WHERE business_id = ${businessId}
      ORDER BY created_at DESC
    `;

    return NextResponse.json(result.rows);
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
