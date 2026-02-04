import { NextRequest, NextResponse } from 'next/server';
import sql from '../utils/sql';

// Helper function to get relevant image from Unsplash
async function getUnsplashImage(query: string): Promise<string> {
  try {
    const response = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=1`,
      {
        headers: {
          'Authorization': `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}`
        }
      }
    );
    const data = await response.json();
    if (data.results && data.results.length > 0) {
      return data.results[0].urls.regular;
    }
    // Fallback to a generic product image
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
  } catch (error) {
    console.error('Error fetching Unsplash image:', error);
    // Fallback to a generic product image
    return 'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=800';
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const businessId = searchParams.get('businessId');

    // Fetch single product by ID
    if (id) {
      const products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.logo_url as business_logo,
          b.image_url as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.id = ${parseInt(id)}
      `;
      
      if (products.length === 0) {
        return NextResponse.json(
          { success: false, error: 'Product not found' },
          { status: 404 }
        );
      }
      
      return NextResponse.json({ 
        success: true, 
        product: products[0]
      });
    }

    if (businessId) {
      // Fetch products for a specific business with business details
      const products = await sql`
        SELECT 
          p.*,
          b.name as business_name,
          b.logo_url as business_logo,
          b.image_url as business_image
        FROM products p
        LEFT JOIN businesses b ON p.business_id = b.id
        WHERE p.business_id = ${parseInt(businessId)}
        ORDER BY p.created_at DESC
      `;
      
      return NextResponse.json({ 
        success: true, 
        products: products || [] 
      });
    }

    // Fetch all products with business details
    const products = await sql`
      SELECT 
        p.*,
        b.name as business_name,
        b.logo_url as business_logo,
        b.image_url as business_image
      FROM products p
      LEFT JOIN businesses b ON p.business_id = b.id
      ORDER BY p.created_at DESC
    `;

    return NextResponse.json({ 
      success: true, 
      products: products || [] 
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch products' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      business_id,
      name,
      description,
      price,
      original_price,
      category,
      image_url,
      images,
      video,
      stock_quantity,
      in_stock,
      is_active = true,
      is_featured = false,
      promotional = false,
      discount_percentage = 0
    } = body;

    // Validate required fields
    if (!business_id || !name || !price || !category) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Auto-generate image if not provided
    let finalImageUrl = image_url;
    if (!finalImageUrl) {
      const searchQuery = description 
        ? `${name} ${description}`.substring(0, 100)
        : name;
      
      finalImageUrl = await getUnsplashImage(searchQuery);
    }

    // CRITICAL: Default to having stock available
    // If stock_quantity is not provided or null, set to 999 (unlimited-like)
    // If in_stock is explicitly set, use that value; otherwise default to true
    const finalStockQuantity = stock_quantity !== null && stock_quantity !== undefined 
      ? stock_quantity 
      : 999;
    const finalInStock = in_stock !== null && in_stock !== undefined 
      ? in_stock 
      : true;

    const result = await sql`
      INSERT INTO products (
        business_id, name, description, price, original_price,
        category, image_url, images, video, stock_quantity,
        is_active, is_featured, promotional, discount_percentage,
        in_stock, stock, created_at
      ) VALUES (
        ${business_id}, ${name}, ${description}, ${price}, ${original_price || price},
        ${category}, ${finalImageUrl}, ${images ? JSON.stringify(images) : null}, ${video},
        ${finalStockQuantity}, ${is_active}, ${is_featured}, ${promotional},
        ${discount_percentage}, ${finalInStock}, ${finalStockQuantity}, NOW()
      )
      RETURNING *
    `;

    return NextResponse.json({ 
      success: true, 
      product: result[0] 
    });
  } catch (error: any) {
    console.error('Error creating product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create product' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      id,
      name,
      description,
      price,
      original_price,
      category,
      image_url,
      images,
      video,
      stock_quantity,
      is_active,
      is_featured,
      promotional,
      discount_percentage
    } = body;

    // Validate required fields
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      UPDATE products
      SET 
        name = COALESCE(${name}, name),
        description = COALESCE(${description}, description),
        price = COALESCE(${price}, price),
        original_price = COALESCE(${original_price}, original_price),
        category = COALESCE(${category}, category),
        image_url = COALESCE(${image_url}, image_url),
        images = COALESCE(${images ? JSON.stringify(images) : null}, images),
        video = COALESCE(${video}, video),
        stock_quantity = COALESCE(${stock_quantity}, stock_quantity),
        stock = COALESCE(${stock_quantity}, stock),
        in_stock = COALESCE(${stock_quantity ? stock_quantity > 0 : null}, in_stock),
        is_active = COALESCE(${is_active}, is_active),
        is_featured = COALESCE(${is_featured}, is_featured),
        promotional = COALESCE(${promotional}, promotional),
        discount_percentage = COALESCE(${discount_percentage}, discount_percentage),
        updated_at = NOW()
      WHERE id = ${id}
      RETURNING *
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      product: result[0] 
    });
  } catch (error: any) {
    console.error('Error updating product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update product' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Product ID is required' },
        { status: 400 }
      );
    }

    const result = await sql`
      DELETE FROM products
      WHERE id = ${parseInt(id)}
      RETURNING id
    `;

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Product not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Product deleted successfully' 
    });
  } catch (error: any) {
    console.error('Error deleting product:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete product' },
      { status: 500 }
    );
  }
}
