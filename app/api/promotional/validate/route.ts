import { NextRequest, NextResponse } from 'next/server';
import sql from '../../utils/sql';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { code, userId } = body;

    if (!code) {
      return NextResponse.json(
        { success: false, error: 'Promotional code is required' },
        { status: 400 }
      );
    }

    // Fetch promotional code
    const result = await sql`
      SELECT pc.*, b.name as business_name
      FROM promotional_codes pc
      LEFT JOIN businesses b ON pc.business_id = b.id
      WHERE UPPER(pc.code) = UPPER(${code})
      AND pc.is_active = true
      AND (pc.valid_from IS NULL OR pc.valid_from <= NOW())
      AND (pc.valid_until IS NULL OR pc.valid_until >= NOW())
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired promotional code' },
        { status: 404 }
      );
    }

    const promoCode = result[0];

    // Check usage limit
    if (promoCode.usage_limit && promoCode.used_count >= promoCode.usage_limit) {
      return NextResponse.json(
        { success: false, error: 'This promotional code has reached its usage limit' },
        { status: 400 }
      );
    }

    // Check user-specific limit (if userId provided)
    if (userId && promoCode.max_uses_per_user) {
      const userUsageResult = await sql`
        SELECT COUNT(*) as user_usage_count
        FROM orders
        WHERE user_id = ${userId}
        AND discount_code = ${code}
      `;
      const userUsageCount = parseInt(userUsageResult[0]?.user_usage_count || '0');
      
      if (userUsageCount >= promoCode.max_uses_per_user) {
        return NextResponse.json(
          { success: false, error: 'You have already used this promotional code the maximum number of times' },
          { status: 400 }
        );
      }
    }

    return NextResponse.json({
      success: true,
      code: promoCode,
    });
  } catch (error: any) {
    console.error('Error validating promotional code:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to validate promotional code' },
      { status: 500 }
    );
  }
}
