import { NextRequest, NextResponse } from "next/server";
import sql from "../utils/sql";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const businessId = searchParams.get("businessId");

    let ads;
    if (businessId) {
      // Fetch ad for a specific business with products
      ads = await sql`
        SELECT 
          a.*,
          b.name as business_name,
          b.category as business_category,
          b.logo_url as business_logo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ap.id,
                'product_id', p.id,
                'product_name', p.name,
                'product_price', p.price,
                'product_image', COALESCE(p.image_url, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'),
                'special_tag', ap.special_tag,
                'is_ad_only', p.ad_only
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) as products
        FROM ads a
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN ad_products ap ON a.id = ap.ad_id
        LEFT JOIN products p ON ap.product_id = p.id
        WHERE a.business_id = ${businessId}
        GROUP BY a.id, b.name, b.category, b.logo_url
        ORDER BY a.created_at DESC
        LIMIT 1
      `;
      
      // Return single ad with success flag
      if (ads.length > 0) {
        return NextResponse.json({ success: true, ad: ads[0] });
      } else {
        return NextResponse.json({ success: true, ad: null });
      }
    } else {
      // Fetch all active ads with business name and products (for offers tab)
      ads = await sql`
        SELECT 
          a.*,
          b.name as business_name,
          b.category as business_category,
          b.logo_url as business_logo,
          COALESCE(
            json_agg(
              json_build_object(
                'id', ap.id,
                'product_id', p.id,
                'product_name', p.name,
                'product_price', p.price,
                'product_image', COALESCE(p.image_url, 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500'),
                'special_tag', ap.special_tag,
                'is_ad_only', p.ad_only
              )
            ) FILTER (WHERE p.id IS NOT NULL),
            '[]'
          ) as products
        FROM ads a
        LEFT JOIN businesses b ON a.business_id = b.id
        LEFT JOIN ad_products ap ON a.id = ap.ad_id
        LEFT JOIN products p ON ap.product_id = p.id
        WHERE a.is_active = true
        GROUP BY a.id, b.name, b.category, b.logo_url
        ORDER BY a.created_at DESC
      `;
      
      return NextResponse.json(ads);
    }
  } catch (error) {
    console.error("Error fetching ads:", error);
    return NextResponse.json(
      { error: "Failed to fetch ads" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { business_id, title, description, products } = body;

    if (!business_id || !title) {
      return NextResponse.json(
        { error: "Business ID and title are required" },
        { status: 400 }
      );
    }

    // Check if business already has an ad (limit 1 per business)
    const existingAd = await sql`
      SELECT id FROM ads WHERE business_id = ${business_id} LIMIT 1
    `;

    if (existingAd.length > 0) {
      return NextResponse.json(
        { success: false, error: "Business already has an ad. Please update the existing one." },
        { status: 400 }
      );
    }

    // Create the ad
    const newAd = await sql`
      INSERT INTO ads (business_id, title, description, is_active)
      VALUES (${business_id}, ${title}, ${description || null}, true)
      RETURNING *
    `;

    const adId = newAd[0].id;

    // Add products to the ad
    if (products && products.length > 0) {
      for (const product of products) {
        await sql`
          INSERT INTO ad_products (ad_id, product_id, special_tag)
          VALUES (${adId}, ${product.product_id}, ${product.special_tag || null})
        `;
      }
    }

    return NextResponse.json({ success: true, ad: newAd[0] }, { status: 201 });
  } catch (error) {
    console.error("Error creating ad:", error);
    return NextResponse.json(
      { success: false, error: "Failed to create ad" },
      { status: 500 }
    );
  }
}
