import { useEffect, useState } from "react";
import { StatusBar } from "expo-status-bar";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
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

const SOFI = {
  bg: "#0B1121",
  card: "#151E30",
  cardBorder: "#1E2A40",
  blue: "#00A2C7",
  magenta: "#E5004C",
  white: "#FFFFFF",
  textMuted: "#8B95A5",
  textDim: "#5A6475",
  shadow: "#061020",
};

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
  return new Date(clockIn.getTime() + (480 + lunchMinutes) * 60000);
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

type TimeSlot = "clockIn" | "lunchOut" | "lunchIn";

const LABELS: Record<TimeSlot, string> = {
  clockIn: "Clock In",
  lunchOut: "Lunch Out",
  lunchIn: "Lunch In",
};

export default function App() {
  const [times, setTimes] = useState<Record<TimeSlot, Date | null>>({
    clockIn: null,
    lunchOut: null,
    lunchIn: null,
  });
  const [activeSlot, setActiveSlot] = useState<TimeSlot | null>(null);
  const [pickerValue, setPickerValue] = useState(new Date());
  const [notificationsSet, setNotificationsSet] = useState(false);
  const [hasPermission, setHasPermission] = useState(false);

  const allSet = times.clockIn && times.lunchOut && times.lunchIn;
  const clockOut =
    allSet ? calcClockOut(times.clockIn!, times.lunchOut!, times.lunchIn!) : null;
  const lunchMinutes =
    times.lunchOut && times.lunchIn
      ? diffMinutes(times.lunchOut, times.lunchIn)
      : null;
  const hasError = lunchMinutes !== null && lunchMinutes < 0;

  useEffect(() => {
    registerForNotifications().then(setHasPermission);
  }, []);

  useEffect(() => {
    if (clockOut && !hasError && hasPermission) {
      scheduleClockOutNotifications(clockOut).then(() =>
        setNotificationsSet(true)
      );
    } else {
      setNotificationsSet(false);
    }
  }, [times.clockIn, times.lunchOut, times.lunchIn, hasPermission]);

  function openPicker(slot: TimeSlot) {
    setPickerValue(times[slot] ?? new Date());
    setActiveSlot(slot);
  }

  function confirmPicker() {
    if (!activeSlot) return;
    setTimes((prev) => ({ ...prev, [activeSlot]: pickerValue }));
    setActiveSlot(null);
  }

  function onPickerChange(_: DateTimePickerEvent, date?: Date) {
    if (date) setPickerValue(date);
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />

      <Text style={styles.sofiLogo}>SoFi</Text>
      <Text style={styles.title}>Clock Out</Text>

      <View style={styles.card}>
        <View style={styles.cardShadow} />
        {(["clockIn", "lunchOut", "lunchIn"] as TimeSlot[]).map(
          (slot, index) => (
            <View key={slot}>
              {index > 0 && <View style={styles.divider} />}
              <Pressable
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.rowPressed,
                ]}
                onPress={() => openPicker(slot)}
              >
                <Text style={styles.label}>{LABELS[slot]}</Text>
                <Text
                  style={[
                    styles.timeValue,
                    !times[slot] && styles.timeValueUnset,
                  ]}
                >
                  {times[slot] ? fmt(times[slot]!) : "--:--"}
                </Text>
              </Pressable>
            </View>
          )
        )}
      </View>

      <View style={styles.resultCard}>
        <View style={styles.resultShadow} />
        <Text style={styles.resultLabel}>Clock Out At</Text>
        <Text style={styles.resultTime}>
          {hasError
            ? "Error"
            : clockOut
              ? fmt(clockOut)
              : "--:-- --"}
        </Text>
        {hasError ? (
          <Text style={styles.errorText}>Lunch In must be after Lunch Out</Text>
        ) : clockOut && lunchMinutes !== null ? (
          <Text style={styles.subtitle}>
            {lunchMinutes} min lunch · 8 hrs work
          </Text>
        ) : (
          <Text style={styles.subtitle}>Set all times above</Text>
        )}
      </View>

      <View style={styles.notifStatus}>
        <View
          style={[
            styles.dot,
            {
              backgroundColor: notificationsSet ? "#00C853" : SOFI.textDim,
            },
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

      <Modal
        visible={activeSlot !== null}
        transparent
        animationType="fade"
        onRequestClose={() => setActiveSlot(null)}
      >
        <Pressable
          style={styles.backdrop}
          onPress={() => setActiveSlot(null)}
        >
          <Pressable style={styles.modal} onPress={() => {}}>
            <View style={styles.modalShadow} />
            <Text style={styles.modalTitle}>
              {activeSlot ? LABELS[activeSlot] : ""}
            </Text>

            <View style={styles.pickerWrapper}>
              <DateTimePicker
                value={pickerValue}
                mode="time"
                display="spinner"
                minuteInterval={1}
                onChange={onPickerChange}
                style={styles.picker}
                textColor={SOFI.white}
                themeVariant="dark"
              />
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.confirmBtn,
                pressed && styles.confirmBtnPressed,
              ]}
              onPress={confirmPicker}
            >
              <Text style={styles.confirmBtnText}>Confirm</Text>
            </Pressable>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: SOFI.bg,
    paddingTop: 80,
    paddingHorizontal: 20,
  },
  sofiLogo: {
    fontSize: 20,
    fontWeight: "800",
    color: SOFI.blue,
    textAlign: "center",
    letterSpacing: 2,
    marginBottom: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "300",
    color: SOFI.white,
    textAlign: "center",
    marginBottom: 32,
    letterSpacing: 0.5,
  },

  card: {
    backgroundColor: SOFI.card,
    borderRadius: 24,
    padding: 20,
    borderWidth: 2,
    borderColor: SOFI.cardBorder,
    position: "relative",
  },
  cardShadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: SOFI.shadow,
    borderRadius: 24,
    zIndex: -1,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 16,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  rowPressed: {
    backgroundColor: "rgba(0,162,199,0.08)",
  },
  label: {
    fontSize: 16,
    color: SOFI.textMuted,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  timeValue: {
    fontSize: 22,
    fontWeight: "700",
    color: SOFI.white,
    letterSpacing: 0.5,
  },
  timeValueUnset: {
    color: SOFI.textDim,
  },
  divider: {
    height: 1,
    backgroundColor: SOFI.cardBorder,
    marginHorizontal: 8,
  },

  resultCard: {
    backgroundColor: SOFI.card,
    borderRadius: 24,
    padding: 28,
    marginTop: 28,
    alignItems: "center",
    borderWidth: 2,
    borderColor: SOFI.blue,
    position: "relative",
  },
  resultShadow: {
    position: "absolute",
    top: 4,
    left: 4,
    right: -4,
    bottom: -4,
    backgroundColor: SOFI.shadow,
    borderRadius: 24,
    zIndex: -1,
  },
  resultLabel: {
    fontSize: 13,
    color: SOFI.textMuted,
    textTransform: "uppercase",
    letterSpacing: 1.5,
    fontWeight: "600",
  },
  resultTime: {
    fontSize: 48,
    fontWeight: "700",
    color: SOFI.blue,
    marginVertical: 8,
    letterSpacing: -1,
  },
  subtitle: {
    fontSize: 13,
    color: SOFI.textMuted,
    letterSpacing: 0.3,
  },
  errorText: {
    fontSize: 13,
    color: SOFI.magenta,
  },

  notifStatus: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 24,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  notifText: {
    fontSize: 13,
    color: SOFI.textDim,
  },

  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modal: {
    backgroundColor: SOFI.card,
    borderRadius: 24,
    padding: 28,
    width: "85%",
    borderWidth: 2,
    borderColor: SOFI.blue,
    alignItems: "center",
    position: "relative",
  },
  modalShadow: {
    position: "absolute",
    top: 5,
    left: 5,
    right: -5,
    bottom: -5,
    backgroundColor: SOFI.shadow,
    borderRadius: 24,
    zIndex: -1,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: SOFI.white,
    marginBottom: 16,
  },
  pickerWrapper: {
    width: "100%",
    height: 180,
    overflow: "hidden",
    borderRadius: 12,
    marginBottom: 20,
  },
  picker: {
    width: "100%",
    height: 180,
  },
  confirmBtn: {
    backgroundColor: SOFI.blue,
    borderRadius: 16,
    paddingVertical: 14,
    paddingHorizontal: 48,
    borderWidth: 2,
    borderColor: SOFI.blue,
    minWidth: 180,
    alignItems: "center",
  },
  confirmBtnPressed: {
    backgroundColor: "#008BA8",
    transform: [{ translateY: 2 }],
  },
  confirmBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: SOFI.white,
    letterSpacing: 0.3,
  },
});
