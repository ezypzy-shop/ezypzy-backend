import { NextRequest, NextResponse } from "next/server";
import sql from "../../utils/sql";

// GET /api/ads/[id] - Get ad details with products
export async function GET(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await context.params;

    // Get the ad
    const ads = await sql`
      SELECT 
        a.*,
        b.name as business_name,
        b.image_url as business_image
      FROM ads a
      LEFT JOIN businesses b ON a.business_id = b.id
      WHERE a.id = ${adId}
    `;

    if (ads.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ad not found" },
        { status: 404 }
      );
    }

    const ad = ads[0];

    // Get products with full details
    const adProducts = await sql`
      SELECT 
        ap.id,
        ap.product_id,
        ap.special_tag,
        p.name as product_name,
        p.description as product_description,
        p.price as product_price,
        p.stock as product_stock,
        p.image_url as product_image,
        p.business_id,
        b.name as business_name
      FROM ad_products ap
      JOIN products p ON ap.product_id = p.id
      LEFT JOIN businesses b ON p.business_id = b.id
      WHERE ap.ad_id = ${ad.id}
      ORDER BY ap.created_at DESC
    `;

    return NextResponse.json({
      success: true,
      ad: {
        id: ad.id,
        business_id: ad.business_id,
        business_name: ad.business_name,
        title: ad.title,
        description: ad.description,
        image: ad.business_image,
        products: adProducts.map((p) => ({
          id: p.id,
          product_id: p.product_id,
          product_name: p.product_name,
          product_description: p.product_description,
          product_price: parseFloat(p.product_price),
          product_stock: p.product_stock,
          product_image: p.product_image,
          special_tag: p.special_tag || '',
          business_name: p.business_name,
          business_id: p.business_id,
        })),
      },
    });
  } catch (error) {
    console.error("Error fetching ad details:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch ad details" },
      { status: 500 }
    );
  }
}

// PUT /api/ads/[id] - Update an ad
export async function PUT(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await context.params;
    const body = await request.json();
    const { business_id, title, description, products } = body;

    if (!business_id || !title) {
      return NextResponse.json(
        { success: false, error: "Business ID and title are required" },
        { status: 400 }
      );
    }

    // Update the ad
    const updatedAd = await sql`
      UPDATE ads
      SET title = ${title}, description = ${description || null}
      WHERE id = ${adId} AND business_id = ${business_id}
      RETURNING *
    `;

    if (updatedAd.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ad not found or unauthorized" },
        { status: 404 }
      );
    }

    // Delete existing ad_products
    await sql`DELETE FROM ad_products WHERE ad_id = ${adId}`;

    // Add new products
    if (products && products.length > 0) {
      for (const product of products) {
        await sql`
          INSERT INTO ad_products (ad_id, product_id, special_tag)
          VALUES (${adId}, ${product.product_id}, ${product.special_tag || null})
        `;
      }
    }

    return NextResponse.json({ success: true, ad: updatedAd[0] });
  } catch (error) {
    console.error("Error updating ad:", error);
    return NextResponse.json(
      { success: false, error: "Failed to update ad" },
      { status: 500 }
    );
  }
}

// DELETE /api/ads/[id] - Delete an ad
export async function DELETE(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: adId } = await context.params;
    const { searchParams } = new URL(request.url);
    const businessId = searchParams.get("businessId");

    if (!businessId) {
      return NextResponse.json(
        { success: false, error: "Business ID is required" },
        { status: 400 }
      );
    }

    // Delete ad products first (due to foreign key constraint)
    await sql`DELETE FROM ad_products WHERE ad_id = ${adId}`;

    // Delete the ad
    const result = await sql`
      DELETE FROM ads 
      WHERE id = ${adId} AND business_id = ${businessId}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: "Ad not found or unauthorized" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Ad deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting ad:", error);
    return NextResponse.json(
      { success: false, error: "Failed to delete ad" },
      { status: 500 }
    );
  }
}
