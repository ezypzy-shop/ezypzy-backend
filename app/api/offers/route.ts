import { NextRequest, NextResponse } from 'next/server';
import sql from '@/app/api/utils/sql';

export async function GET() {
  try {
    // Fetch all active ads with business info
    const ads = await sql`
      SELECT ads.*, businesses.name as business_name, businesses.logo_url
      FROM ads 
      LEFT JOIN businesses ON ads.business_id = businesses.id
      WHERE ads.is_active = true
      ORDER BY ads.created_at DESC
    `;

    // For each ad, fetch the associated products (including ad-only products)
    const adsWithProducts = await Promise.all(
      ads.map(async (ad) => {
        // Fetch all products for this business (including ad-only products)
        const products = await sql`
          SELECT * FROM products 
          WHERE business_id = ${ad.business_id}
          AND is_active = true
          AND ad_only = true
          ORDER BY created_at DESC
        `;

        return {
          ...ad,
          products
        };
      })
    );

    return NextResponse.json({ success: true, offers: adsWithProducts });
  } catch (error: any) {
    console.error('Error fetching offers:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, title, description, discount_percentage, start_date, end_date, is_active } = body;

    const result = await sql`
      INSERT INTO ads (business_id, title, description, discount_text, start_date, end_date, is_active)
      VALUES (${business_id}, ${title}, ${description}, ${discount_percentage}, ${start_date}, ${end_date}, ${is_active || true})
      RETURNING *
    `;

    return NextResponse.json({ success: true, offer: result[0] });
  } catch (error: any) {
    console.error('Error creating offer:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
