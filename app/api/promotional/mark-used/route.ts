import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Promotional code is required' },
        { status: 400 }
      );
    }

    // Increment used_count
    const result = await sql`
      UPDATE promotional_codes
      SET used_count = used_count + 1
      WHERE UPPER(code) = UPPER(${code})
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Promotional code not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      code: result[0],
    });
  } catch (error: any) {
    console.error('Error marking promotional code as used:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to mark promotional code as used' },
      { status: 500 }
    );
  }
}
