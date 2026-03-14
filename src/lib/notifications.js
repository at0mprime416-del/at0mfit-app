import * as Notifications from 'expo-notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export async function registerForPushNotifications() {
  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }
    if (finalStatus !== 'granted') return null;
    const token = await Notifications.getExpoPushTokenAsync();
    return token.data;
  } catch (e) {
    console.warn('Push notification setup failed:', e);
    return null;
  }
}

export async function scheduleStreakReminder() {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⚛️ At0m Fit',
        body: "No session logged today. Keep your streak alive. 💪",
      },
      trigger: { hour: 19, minute: 0, repeats: true },
    });
  } catch (e) {
    console.warn('Could not schedule streak reminder:', e);
  }
}

export async function scheduleGoalReminder(goalDescription) {
  try {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Today's Goal",
        body: goalDescription,
      },
      trigger: { hour: 8, minute: 0, repeats: false },
    });
  } catch (e) {
    console.warn('Could not schedule goal reminder:', e);
  }
}
