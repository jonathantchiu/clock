import { useEffect, useRef, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Platform,
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Alert,
} from "react-native";
import DateTimePicker, {
  DateTimePickerEvent,
} from "@react-native-community/datetimepicker";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function toTimeDate(hours: number, minutes: number): Date {
  const d = new Date();
  d.setHours(hours, minutes, 0, 0);
  return d;
}

function fmt(date: Date): string {
  let h = date.getHours();
  const m = date.getMinutes();
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ampm}`;
}

function diffMinutes(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 60000);
}

function calcClockOut(
  clockIn: Date,
  lunchOut: Date,
  lunchIn: Date
): Date | null {
  const lunchMinutes = diffMinutes(lunchOut, lunchIn);
  if (lunchMinutes < 0) return null;
  const clockOut = new Date(clockIn.getTime() + (480 + lunchMinutes) * 60000);
  return clockOut;
}

async function registerForNotifications() {
  if (!Device.isDevice) {
    Alert.alert("Notifications need physical device");
    return false;
  }
  const { status: existing } = await Notifications.getPermissionsAsync();
  let finalStatus = existing;
  if (existing !== "granted") {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }
  return finalStatus === "granted";
}

async function scheduleClockOutNotifications(clockOut: Date) {
  await Notifications.cancelAllScheduledNotificationsAsync();

  const now = new Date();
  const fiveMinBefore = new Date(clockOut.getTime() - 5 * 60000);

  if (fiveMinBefore > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "5 Minutes Left",
        body: `Clock out at ${fmt(clockOut)}`,
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: fiveMinBefore,
      },
    });
  }

  if (clockOut > now) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Clock Out!",
        body: "Time to clock out.",
        sound: "default",
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: clockOut,
      },
    });
  }
}

export default function App() {
  const [clockIn, setClockIn] = useState(() => toTimeDate(8, 0));
  const [lunchOut, setLunchOut] = useState(() => toTimeDate(12, 0));
  const [lunchIn, setLunchIn] = useState(() => toTimeDate(12, 30));
  const [notificationsSet, setNotificationsSet] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const clockOut = calcClockOut(clockIn, lunchOut, lunchIn);
  const lunchMinutes = diffMinutes(lunchOut, lunchIn);

  useEffect(() => {
    registerForNotifications().then(setHasPermission);
  }, []);

  useEffect(() => {
    if (clockOut && hasPermission) {
      scheduleClockOutNotifications(clockOut).then(() =>
        setNotificationsSet(true)
      );
    } else {
      setNotificationsSet(false);
    }
  }, [clockIn, lunchOut, lunchIn, hasPermission]);

  const onChangeClockIn = (_: DateTimePickerEvent, date?: Date) => {
    if (date) setClockIn(date);
  };
  const onChangeLunchOut = (_: DateTimePickerEvent, date?: Date) => {
    if (date) setLunchOut(date);
  };
  const onChangeLunchIn = (_: DateTimePickerEvent, date?: Date) => {
    if (date) setLunchIn(date);
  };

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      <Text style={styles.title}>Clock Out Calculator</Text>

      <View style={styles.card}>
        <View style={styles.row}>
          <Text style={styles.label}>Clock In</Text>
          <DateTimePicker
            value={clockIn}
            mode="time"
            display="spinner"
            minuteInterval={1}
            onChange={onChangeClockIn}
            style={styles.picker}
            textColor="#fff"
            themeVariant="dark"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Lunch Out</Text>
          <DateTimePicker
            value={lunchOut}
            mode="time"
            display="spinner"
            minuteInterval={1}
            onChange={onChangeLunchOut}
            style={styles.picker}
            textColor="#fff"
            themeVariant="dark"
          />
        </View>

        <View style={styles.divider} />

        <View style={styles.row}>
          <Text style={styles.label}>Lunch In</Text>
          <DateTimePicker
            value={lunchIn}
            mode="time"
            display="spinner"
            minuteInterval={1}
            onChange={onChangeLunchIn}
            style={styles.picker}
            textColor="#fff"
            themeVariant="dark"
          />
        </View>
      </View>

      <View style={styles.resultCard}>
        {lunchMinutes < 0 ? (
          <Text style={styles.errorText}>
            Lunch In must be after Lunch Out
          </Text>
        ) : clockOut ? (
          <>
            <Text style={styles.resultLabel}>Clock Out At</Text>
            <Text style={styles.resultTime}>{fmt(clockOut)}</Text>
            <Text style={styles.subtitle}>
              {lunchMinutes} min lunch · 8 hrs work
            </Text>
          </>
        ) : null}
      </View>

      <View style={styles.notifStatus}>
        <View
          style={[
            styles.dot,
            { backgroundColor: notificationsSet ? "#4CAF50" : "#666" },
          ]}
        />
        <Text style={styles.notifText}>
          {notificationsSet
            ? "Notifications scheduled"
            : hasPermission
              ? "Set times to schedule"
              : "Enable notifications in Settings"}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1a1a2e",
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
    marginBottom: 30,
  },
  card: {
    backgroundColor: "#16213e",
    borderRadius: 16,
    padding: 16,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  label: {
    fontSize: 16,
    color: "#a0a0b0",
    fontWeight: "600",
    width: 90,
  },
  picker: {
    flex: 1,
    height: 120,
  },
  divider: {
    height: 1,
    backgroundColor: "#2a2a4a",
    marginVertical: 4,
  },
  resultCard: {
    backgroundColor: "#0f3460",
    borderRadius: 16,
    padding: 24,
    marginTop: 24,
    alignItems: "center",
  },
  resultLabel: {
    fontSize: 14,
    color: "#a0a0b0",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  resultTime: {
    fontSize: 48,
    fontWeight: "700",
    color: "#e94560",
    marginVertical: 8,
  },
  subtitle: {
    fontSize: 14,
    color: "#a0a0b0",
  },
  errorText: {
    fontSize: 16,
    color: "#e94560",
  },
  notifStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 20,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  notifText: {
    fontSize: 13,
    color: "#666",
  },
});
