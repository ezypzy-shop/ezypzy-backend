import sql from './sql';

const EXPO_PUSH_URL = 'https://exp.host/--/api/v2/push/send';

interface PushMessage {
  to: string;
  title: string;
  body: string;
  data?: any;
  sound?: string;
  priority?: string;
}

/**
 * Send push notification to a single user
 */
export async function sendPushToUser(
  userId: number,
  title: string,
  body: string,
  data?: any
) {
  try {
    // Fetch user's push token from database
    const result = await sql`
      SELECT push_token FROM users WHERE id = ${userId}
    `;

    if (result.rows.length === 0 || !result.rows[0].push_token) {
      console.warn(`⚠️ No push token found for user ${userId}`);
      return { success: false, message: 'No push token found' };
    }

    const pushToken = result.rows[0].push_token;

    // Send push notification via Expo
    const message: PushMessage = {
      to: pushToken,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    };

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    const responseData = await response.json();

    if (responseData.data?.[0]?.status === 'error') {
      console.error('❌ Expo push error:', responseData.data[0].message);
      return { success: false, error: responseData.data[0].message };
    }

    console.log(`✅ Push notification sent to user ${userId}`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending push notification:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Send push notification to multiple users
 */
export async function sendPushToMultipleUsers(
  userIds: number[],
  title: string,
  body: string,
  data?: any
) {
  try {
    // Fetch all push tokens
    const result = await sql`
      SELECT push_token FROM users WHERE id = ANY(${userIds})
    `;

    const pushTokens = result.rows
      .map(row => row.push_token)
      .filter(token => token); // Remove null/undefined tokens

    if (pushTokens.length === 0) {
      console.warn('⚠️ No push tokens found for any users');
      return { success: false, message: 'No push tokens found' };
    }

    // Send push notifications to all tokens
    const messages: PushMessage[] = pushTokens.map(token => ({
      to: token,
      title,
      body,
      data,
      sound: 'default',
      priority: 'high',
    }));

    const response = await fetch(EXPO_PUSH_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    const responseData = await response.json();
    console.log(`✅ Push notifications sent to ${pushTokens.length} users`);
    
    return { success: true, sent: pushTokens.length };
  } catch (error: any) {
    console.error('❌ Error sending push notifications:', error);
    return { success: false, error: error.message };
  }
}
