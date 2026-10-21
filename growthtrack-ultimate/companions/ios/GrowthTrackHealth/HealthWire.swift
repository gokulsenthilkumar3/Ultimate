import Foundation

enum Metric: String, CaseIterable, Codable, Identifiable {
    case weight, steps, sleep, workouts
    var id: String { rawValue }
}

enum CompanionError: Error, LocalizedError {
    case invalidEndpoint, invalidPayload, secureStorage, unavailable, authorization, protocolError
    case http(Int), retryLater
    var errorDescription: String? {
        switch self {
        case .invalidEndpoint: return "Enter an HTTPS server origin with no path or credentials."
        case .invalidPayload: return "A record or response failed protocol validation; its cursor was not advanced."
        case .secureStorage: return "Secure storage is unavailable. Unlock the device and retry."
        case .unavailable: return "HealthKit is unavailable on this device."
        case .authorization: return "The permission request could not complete. Read access remains unknown."
        case .protocolError: return "The backend did not return the required acknowledgement."
        case .retryLater: return "Sync reached its foreground page limit. Sync again to continue."
        case .http(let status):
            if status == 401 || status == 410 { return "Connection revoked or credential expired. Pair again in GrowthTrack."
            }
            if status == 404 || status == 501 { return "The health companion service is not configured on this server." }
            return "The server rejected the request (HTTP \(status)); sync has not completed."
        }
    }
}

enum Wire {
    static func utc(_ date: Date) -> String {
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        return formatter.string(from: date)
    }
    static func date(_ value: String) throws -> Date {
        guard value.hasSuffix("Z") else { throw CompanionError.invalidPayload }
        let formatter = ISO8601DateFormatter()
        formatter.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        if let date = formatter.date(from: value) { return date }
        formatter.formatOptions = [.withInternetDateTime]
        guard let date = formatter.date(from: value) else { throw CompanionError.invalidPayload }
        return date
    }
    static func identifier(_ value: String) -> Bool {
        !value.isEmpty && value.count <= 256 && !value.unicodeScalars.contains {
            CharacterSet.whitespacesAndNewlines.contains($0) || CharacterSet.controlCharacters.contains($0)
        }
    }
    static func origin(_ value: String) throws -> URL {
        guard let url = URL(string: value), url.scheme == "https", url.host != nil,
              url.user == nil, url.password == nil, url.query == nil, url.fragment == nil,
              url.path.isEmpty || url.path == "/" else { throw CompanionError.invalidEndpoint }
        return url
    }
    static func object(_ data: Data, keys: Set<String>) throws -> [String: Any] {
        guard data.count <= 65536, let object = try JSONSerialization.jsonObject(with: data) as? [String: Any],
              Set(object.keys) == keys else { throw CompanionError.invalidPayload }
        return object
    }
}

struct Permission: Codable {
    let optedIn: Bool
    let access: String
}
struct Credentials: Codable {
    let connectionId: String
    let provider: String
    let accessToken: String
    let expiresAt: String
    func validate() throws {
        guard UUID(uuidString: connectionId) != nil, provider == "apple_health",
              accessToken.range(of: "^[A-Za-z0-9_-]{32,512}$", options: .regularExpression) != nil,
              try Wire.date(expiresAt) > Date() else { throw CompanionError.invalidPayload }
    }
}
struct Source: Encodable {
    let provider = "apple_health"
    let externalId: String
    let origin: String
}
enum SampleValue: Encodable {
    case weight(Double), steps(Int64), sleep(String), workout(String, Double)
    enum CodingKeys: String, CodingKey { case kilograms, count, stage, activityCode, durationSeconds }
    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        switch self {
        case .weight(let value): try container.encode(value, forKey: .kilograms)
        case .steps(let value): try container.encode(value, forKey: .count)
        case .sleep(let stage): try container.encode(stage, forKey: .stage)
        case .workout(let code, let seconds):
            try container.encode(code, forKey: .activityCode)
            try container.encode(seconds, forKey: .durationSeconds)
        }
    }
}
struct Sample: Encodable {
    let kind: Metric
    let source: Source
    let startAt: String
    let endAt: String
    let value: SampleValue
    func validate(start: Date, end: Date) throws {
        let from = try Wire.date(startAt), to = try Wire.date(endAt)
        guard Wire.identifier(source.externalId), Wire.identifier(source.origin),
              from >= start.addingTimeInterval(-0.001), to <= end,
              kind == .weight ? from == to : to > from else { throw CompanionError.invalidPayload }
        switch (kind, value) {
        case (.weight, .weight(let kg)):
            guard kg.isFinite && kg > 0 && kg <= 1000 else { throw CompanionError.invalidPayload }
        case (.steps, .steps(let count)):
            guard count >= 0 && count <= 9007199254740991 else { throw CompanionError.invalidPayload }
        case (.sleep, .sleep(let stage)):
            guard ["session", "in_bed", "asleep", "awake", "core", "deep", "rem"].contains(stage)
            else { throw CompanionError.invalidPayload }
        case (.workouts, .workout(let code, let duration)):
            guard Wire.identifier(code), duration.isFinite, duration > 0,
                  duration <= to.timeIntervalSince(from) + 0.001 else { throw CompanionError.invalidPayload }
        default: throw CompanionError.invalidPayload
        }
    }
}
struct Deletion: Encodable {
    struct DeletedSource: Encodable { let provider = "apple_health"; let externalId: String }
    let kind: Metric
    let source: DeletedSource
}
struct Batch: Encodable {
    let protocolVersion = 1
    let connectionId: String
    let batchId: String
    let metric: Metric
    let windowStart: String
    let windowEnd: String
    let samples: [Sample]
    let deletions: [Deletion]
    func validate() throws {
        let start = try Wire.date(windowStart), end = try Wire.date(windowEnd)
        guard UUID(uuidString: connectionId) != nil, UUID(uuidString: batchId) != nil,
              end > start, end.timeIntervalSince(start) <= 8 * 86400,
              samples.count + deletions.count <= 200 else { throw CompanionError.invalidPayload }
        var ids = Set<String>()
        for sample in samples {
            guard sample.kind == metric, ids.insert(sample.source.externalId).inserted else {
                throw CompanionError.invalidPayload
            }
            try sample.validate(start: start, end: end)
        }
        for deletion in deletions {
            guard deletion.kind == metric, Wire.identifier(deletion.source.externalId),
                  ids.insert(deletion.source.externalId).inserted else { throw CompanionError.invalidPayload }
        }
    }
}
