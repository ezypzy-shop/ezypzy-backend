import { NextRequest, NextResponse } from "next/server";
import sql from "../../utils/sql";

export async function GET(
  req: NextRequest,
  { params }: { params: { businessId: string } }
) {
  try {
    const { businessId } = params;

    // Fetch business details
    const business = await sql`
      SELECT * FROM businesses WHERE id = ${businessId}
    `;

    if (business.length === 0) {
      return NextResponse.json(
        { error: "Business not found" },
        { status: 404 }
      );
    }

    // Fetch products for this business
    const products = await sql`
      SELECT * FROM products WHERE business_id = ${businessId}
    `;

    return NextResponse.json({
      business: business[0],
      products,
    });
  } catch (error) {
    console.error("Error fetching business details:", error);
    return NextResponse.json(
      { error: "Failed to fetch business details" },
      { status: 500 }
    );
  }
}
