import { NextRequest, NextResponse } from 'next/server';
import { sendPushToUser, sendPushToMultipleUsers } from '../../utils/notifications';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, userIds, title, body: messageBody, data } = body;

    if (!title || !messageBody) {
      return NextResponse.json(
        { success: false, error: 'title and body are required' },
        { status: 400 }
      );
    }

    if (userId) {
      // Send to single user
      const result = await sendPushToUser(userId, title, messageBody, data);
      return NextResponse.json(result);
    }

    if (userIds && Array.isArray(userIds)) {
      // Send to multiple users
      const result = await sendPushToMultipleUsers(userIds, title, messageBody, data);
      return NextResponse.json(result);
    }

    return NextResponse.json(
      { success: false, error: 'Either userId or userIds must be provided' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('Error sending push notification:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
