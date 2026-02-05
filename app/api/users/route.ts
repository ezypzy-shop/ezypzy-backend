import { NextRequest, NextResponse } from 'next/server';
import sql from '../utils/sql';

// GET - Fetch user by email or firebase_uid
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const email = searchParams.get('email');
    const firebase_uid = searchParams.get('firebase_uid') || searchParams.get('firebaseUid'); // Support both formats

    if (!email && !firebase_uid) {
      return NextResponse.json(
        { success: false, error: 'Email or firebase_uid is required' },
        { status: 400 }
      );
    }

    let result;
    if (firebase_uid) {
      result = await sql`
        SELECT id, email, name, phone, address, city, state, postal_code, photo_url, type, is_business_user, firebase_uid, created_at
        FROM users
        WHERE firebase_uid = ${firebase_uid}
        LIMIT 1
      `;
    } else {
      result = await sql`
        SELECT id, email, name, phone, address, city, state, postal_code, photo_url, type, is_business_user, firebase_uid, created_at
        FROM users
        WHERE email = ${email}
        LIMIT 1
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result[0],
    });
  } catch (error: any) {
    console.error('Error fetching user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch user' },
      { status: 500 }
    );
  }
}

// POST - Create new user
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, name, phone, firebase_uid, is_business_user, photo_url } = body;

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      );
    }

    // Check if user already exists by email or firebase_uid
    let existingUser;
    if (firebase_uid) {
      existingUser = await sql`
        SELECT id, email, name, phone, photo_url, firebase_uid, is_business_user FROM users 
        WHERE email = ${email} OR firebase_uid = ${firebase_uid}
        LIMIT 1
      `;
    } else {
      existingUser = await sql`
        SELECT id, email, name, phone, photo_url, firebase_uid, is_business_user FROM users 
        WHERE email = ${email}
        LIMIT 1
      `;
    }

    if (existingUser.length > 0) {
      return NextResponse.json({
        success: true,
        user: existingUser[0],
        message: 'User already exists',
      });
    }

    // Create new user
    const result = await sql`
      INSERT INTO users (email, name, phone, photo_url, firebase_uid, type, is_business_user, created_at)
      VALUES (
        ${email},
        ${name || null},
        ${phone || null},
        ${photo_url || null},
        ${firebase_uid || null},
        ${is_business_user ? 'business_owner' : 'customer'},
        ${is_business_user || false},
        NOW()
      )
      RETURNING id, email, name, phone, photo_url, firebase_uid, type, is_business_user, created_at
    `;

    return NextResponse.json({
      success: true,
      user: result[0],
      message: 'User created successfully',
    });
  } catch (error: any) {
    console.error('Error creating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to create user' },
      { status: 500 }
    );
  }
}

// PUT - Update user
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, firebase_uid, name, phone, address, city, state, postal_code, photo_url } = body;

    if (!email && !firebase_uid) {
      return NextResponse.json(
        { success: false, error: 'Email or firebase_uid is required' },
        { status: 400 }
      );
    }

    // Build dynamic update object (only update fields that are provided and not empty)
    const updates: string[] = [];
    const updateValues: any[] = [];
    
    if (name !== undefined && name !== null) {
      updates.push(`name = COALESCE($${updates.length + 1}, name)`);
      updateValues.push(name);
    }
    if (phone !== undefined && phone !== null) {
      updates.push(`phone = COALESCE($${updates.length + 1}, phone)`);
      updateValues.push(phone);
    }
    if (address !== undefined) {
      updates.push(`address = $${updates.length + 1}`);
      updateValues.push(address || null);
    }
    if (city !== undefined) {
      updates.push(`city = $${updates.length + 1}`);
      updateValues.push(city || null);
    }
    if (state !== undefined) {
      updates.push(`state = $${updates.length + 1}`);
      updateValues.push(state || null);
    }
    if (postal_code !== undefined) {
      updates.push(`postal_code = $${updates.length + 1}`);
      updateValues.push(postal_code || null);
    }
    if (photo_url !== undefined && photo_url !== null && photo_url !== '') {
      updates.push(`photo_url = $${updates.length + 1}`);
      updateValues.push(photo_url);
    }

    if (updates.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No fields to update' },
        { status: 400 }
      );
    }

    let result;
    if (firebase_uid) {
      result = await sql`
        UPDATE users
        SET
          name = COALESCE(${name}, name),
          phone = COALESCE(${phone}, phone),
          address = COALESCE(${address}, address),
          city = COALESCE(${city}, city),
          state = COALESCE(${state}, state),
          postal_code = COALESCE(${postal_code}, postal_code),
          photo_url = COALESCE(${photo_url || null}, photo_url)
        WHERE firebase_uid = ${firebase_uid}
        RETURNING id, email, name, phone, address, city, state, postal_code, photo_url, type, is_business_user, firebase_uid, created_at
      `;
    } else {
      result = await sql`
        UPDATE users
        SET
          name = COALESCE(${name}, name),
          phone = COALESCE(${phone}, phone),
          address = COALESCE(${address}, address),
          city = COALESCE(${city}, city),
          state = COALESCE(${state}, state),
          postal_code = COALESCE(${postal_code}, postal_code),
          photo_url = COALESCE(${photo_url || null}, photo_url)
        WHERE email = ${email}
        RETURNING id, email, name, phone, address, city, state, postal_code, photo_url, type, is_business_user, firebase_uid, created_at
      `;
    }

    if (result.length === 0) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      user: result[0],
      message: 'User updated successfully',
    });
  } catch (error: any) {
    console.error('Error updating user:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}
