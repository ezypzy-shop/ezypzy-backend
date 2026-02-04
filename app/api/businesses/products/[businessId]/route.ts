import { NextRequest, NextResponse } from "next/server";
import sql from "../../../utils/sql";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ businessId: string }> }
) {
  try {
    const { businessId } = await params;

    // Fetch products for this business, excluding ad-only products
    const products = await sql`
      SELECT * FROM products 
      WHERE business_id = ${businessId} 
      AND (ad_only = false OR ad_only IS NULL)
      AND is_active = true
      ORDER BY created_at DESC
    `;

    // Auto-generate images for products without images
    for (const product of products) {
      if (!product.image_url) {
        const searchQuery = `${product.name} ${product.description || ''}`.trim();
        const imageUrl = `https://source.unsplash.com/800x600/?${encodeURIComponent(searchQuery)}`;
        
        // Update database with auto-generated image
        await sql`
          UPDATE products 
          SET image_url = ${imageUrl}
          WHERE id = ${product.id}
        `;
        
        // Update the product object
        product.image_url = imageUrl;
      }
    }

    return NextResponse.json({ success: true, products });
  } catch (error) {
    console.error("Error fetching business products:", error);
    return NextResponse.json(
      { success: false, error: "Failed to fetch products" },
      { status: 500 }
    );
  }
}
