import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function GET(request: NextRequest) {
  try {
    // Get all active businesses
    // TODO: Filter by businesses that have promotional products
    const result = await sql`
      SELECT * 
      FROM businesses 
      WHERE is_active = true
      ORDER BY created_at DESC
    `;

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Error fetching promotional businesses:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
