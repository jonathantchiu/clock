import WidgetKit
import SwiftUI

struct ClockOutEntry: TimelineEntry {
    let date: Date
    let clockOutTime: String
    let clockOutTimestamp: Double
    let lunchMinutes: String
}

struct ClockOutProvider: TimelineProvider {
    let defaults = UserDefaults(suiteName: "group.timekeep")

    func placeholder(in context: Context) -> ClockOutEntry {
        ClockOutEntry(date: Date(), clockOutTime: "5:30 PM", clockOutTimestamp: 0, lunchMinutes: "30")
    }

    func getSnapshot(in context: Context, completion: @escaping (ClockOutEntry) -> Void) {
        completion(getEntry())
    }

    func getTimeline(in context: Context, completion: @escaping (Timeline<ClockOutEntry>) -> Void) {
        let entry = getEntry()
        let nextUpdate = Calendar.current.date(byAdding: .minute, value: 1, to: Date())!
        completion(Timeline(entries: [entry], policy: .after(nextUpdate)))
    }

    private func getEntry() -> ClockOutEntry {
        let clockOut = defaults?.string(forKey: "clockOutTime") ?? "--:-- --"
        let timestamp = defaults?.double(forKey: "clockOutTimestamp") ?? 0
        let lunch = defaults?.string(forKey: "lunchMinutes") ?? "--"
        return ClockOutEntry(date: Date(), clockOutTime: clockOut, clockOutTimestamp: timestamp, lunchMinutes: lunch)
    }
}

struct ClockOutWidgetView: View {
    var entry: ClockOutProvider.Entry

    @Environment(\.widgetFamily) var family

    var clockOutDate: Date? {
        guard entry.clockOutTimestamp > 0 else { return nil }
        return Date(timeIntervalSince1970: entry.clockOutTimestamp / 1000)
    }

    var body: some View {
        VStack(spacing: 4) {
            HStack {
                Text("SoFi")
                    .font(.system(size: 11, weight: .heavy))
                    .foregroundColor(Color(red: 0, green: 0.635, blue: 0.78))
                Spacer()
            }

            Spacer()

            Text(entry.clockOutTime)
                .font(.system(size: family == .systemSmall ? 26 : 34, weight: .bold, design: .rounded))
                .foregroundColor(Color(red: 0, green: 0.635, blue: 0.78))
                .minimumScaleFactor(0.6)

            Text("CLOCK OUT")
                .font(.system(size: 9, weight: .semibold))
                .foregroundColor(Color.white.opacity(0.5))
                .tracking(1.5)

            if let target = clockOutDate, target > entry.date {
                Spacer().frame(height: 6)
                Text(target, style: .timer)
                    .font(.system(size: family == .systemSmall ? 18 : 24, weight: .bold, design: .monospaced))
                    .foregroundColor(Color.white.opacity(0.85))
                    .multilineTextAlignment(.center)
                Text("remaining")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.4))
            }

            Spacer()

            if entry.lunchMinutes != "--" {
                Text("\(entry.lunchMinutes) min lunch · 8 hrs")
                    .font(.system(size: 9, weight: .medium))
                    .foregroundColor(Color.white.opacity(0.35))
            }
        }
        .padding(14)
        .containerBackground(for: .widget) {
            Color(red: 0.043, green: 0.067, blue: 0.129)
        }
    }
}

struct ClockOutWidget: Widget {
    let kind = "ClockOutWidget"

    var body: some WidgetConfiguration {
        StaticConfiguration(kind: kind, provider: ClockOutProvider()) { entry in
            ClockOutWidgetView(entry: entry)
        }
        .configurationDisplayName("Clock Out")
        .description("Shows your clock out time with countdown.")
        .supportedFamilies([.systemSmall, .systemMedium])
    }
}
