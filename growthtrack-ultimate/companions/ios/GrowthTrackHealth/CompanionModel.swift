import SwiftUI

@MainActor
final class CompanionModel: ObservableObject {
    @Published private(set) var state = LocalState()
    @Published private(set) var busy = false
    @Published private(set) var message = "Choose only the metrics you want to share."
    private let storage = SecureStore()
    private let reader = HealthReader()
    private var storageReady = false
    var available: Bool { reader.available }
    var permissions: [String: Permission] {
        Dictionary(uniqueKeysWithValues: Metric.allCases.map { metric in
            let selected = state.selected[metric.rawValue] == true
            return (metric.rawValue, Permission(optedIn: selected,
                access: selected ? (available ? "unknown" : "unavailable") : "not_requested"))
        })
    }
    init() {
        do { state = try storage.load(); storageReady = true }
        catch { message = "Secure storage could not be opened. Unlock the device and reopen the app." }
    }
    private func persist(_ next: LocalState) throws {
        guard storageReady else { throw CompanionError.secureStorage }
        try storage.save(next)
        state = next
    }
    private func run(_ operation: () async throws -> Void) async {
        guard !busy else { return }
        busy = true
        defer { busy = false }
        do {
            guard storageReady else { throw CompanionError.secureStorage }
            try await operation()
        } catch let error as CompanionError { message = error.localizedDescription }
        catch { message = "Health access or secure persistence failed. No successful sync is claimed; retry when available." }
    }
    func setOptIn(_ metric: Metric, enabled: Bool) async {
        await run {
            var next = state
            next.selected[metric.rawValue] = enabled
            next.cursors.removeValue(forKey: metric.rawValue)
            try persist(next)
            message = enabled ? "Opt-in saved. Request HealthKit read access to this metric."
                              : "This metric is disabled locally. Previously imported records remain on the server."
            if let credentials = state.credentials, !state.disconnectPending {
                try await HealthAPI(endpoint: state.endpoint).connection(credentials, permissions: permissions)
            }
        }
    }
    func pair(endpoint: String, code: String) async {
        await run {
            guard state.credentials == nil else { throw CompanionError.invalidPayload }
            let api = try HealthAPI(endpoint: endpoint)
            let credentials = try await api.pair(code: code.trimmingCharacters(in: .whitespacesAndNewlines).uppercased())
            var next = state
            next.endpoint = endpoint
            next.credentials = credentials
            next.cursors = [:]; next.lastRead = [:]; next.lastAck = [:]; next.newestSample = [:]
            next.disconnectPending = false
            try persist(next)
            message = "Paired. No health samples have been sent."
            try await api.connection(credentials, permissions: permissions)
        }
    }
    func authorize() async {
        await run {
            try await reader.authorize(Metric.allCases.filter { state.selected[$0.rawValue] == true })
            message = "Permission request completed. HealthKit read access remains unknown; empty results do not establish denial."
            if let credentials = state.credentials, !state.disconnectPending {
                try await HealthAPI(endpoint: state.endpoint).connection(credentials, permissions: permissions)
            }
        }
    }
    func checkConnection() async {
        await run {
            guard let credentials = state.credentials, !state.disconnectPending else { return }
            try await HealthAPI(endpoint: state.endpoint).connection(credentials)
            message = "Backend connection is active. HealthKit read revocation cannot be determined by this app."
        }
    }
    func sync() async {
        await run {
            guard let credentials = state.credentials, !state.disconnectPending else { throw CompanionError.http(410) }
            try credentials.validate()
            let api = try HealthAPI(endpoint: state.endpoint)
            try await api.connection(credentials, permissions: permissions)
            guard available else { throw CompanionError.unavailable }
            var emptyMetrics: [String] = []
            for metric in Metric.allCases where state.selected[metric.rawValue] == true {
                let now = Date()
                var cursor = state.cursors[metric.rawValue]
                if let existing = cursor {
                    let age = now.timeIntervalSince(try Wire.date(existing.createdAt))
                    if age >= 86400 || age < 0 { cursor = nil }
                }
                if cursor == nil {
                    cursor = HealthCursor(windowStart: Wire.utc(now.addingTimeInterval(-7 * 86400)),
                                          createdAt: Wire.utc(now), anchor: nil)
                }
                guard var current = cursor else { throw CompanionError.invalidPayload }
                // Save bootstrap window before reading so interrupted retries use the same predicate.
                var bootstrap = state; bootstrap.cursors[metric.rawValue] = current; try persist(bootstrap)
                var complete = false, imported = 0
                for _ in 0..<20 {
                    let end = Date()
                    let page = try await reader.read(metric, cursor: current, end: end)
                    // Upserts precede tombstones if a query reports both for the same UUID.
                    var ack: String?
                    for offset in stride(from: 0, to: page.samples.count, by: 200) {
                        ack = try await api.upload(Batch(connectionId: credentials.connectionId,
                            batchId: UUID().uuidString.lowercased(), metric: metric,
                            windowStart: current.windowStart, windowEnd: Wire.utc(end),
                            samples: Array(page.samples.dropFirst(offset).prefix(200)), deletions: []), credentials: credentials)
                    }
                    for offset in stride(from: 0, to: page.deletions.count, by: 200) {
                        ack = try await api.upload(Batch(connectionId: credentials.connectionId,
                            batchId: UUID().uuidString.lowercased(), metric: metric,
                            windowStart: current.windowStart, windowEnd: Wire.utc(end),
                            samples: [], deletions: Array(page.deletions.dropFirst(offset).prefix(200))), credentials: credentials)
                    }
                    if ack == nil {
                        ack = try await api.upload(Batch(connectionId: credentials.connectionId,
                            batchId: UUID().uuidString.lowercased(), metric: metric,
                            windowStart: current.windowStart, windowEnd: Wire.utc(end), samples: [], deletions: []), credentials: credentials)
                    }
                    // Advance only after every chunk has an atomic server acknowledgement.
                    current.anchor = page.anchor
                    var next = state
                    next.cursors[metric.rawValue] = current
                    next.lastRead[metric.rawValue] = Wire.utc(end)
                    next.lastAck[metric.rawValue] = ack
                    if let newest = page.samples.map(\.endAt).max() {
                        if next.newestSample[metric.rawValue].map({ newest > $0 }) ?? true { next.newestSample[metric.rawValue] = newest }
                    }
                    try persist(next)
                    imported += page.samples.count
                    if page.operationCount < 200 { complete = true; break }
                }
                guard complete else { throw CompanionError.retryLater }
                if imported == 0 { emptyMetrics.append(metric.rawValue) }
            }
            message = emptyMetrics.isEmpty ? "Foreground sync completed for the selected metrics."
                : "Read completed with no new samples for \(emptyMetrics.joined(separator: ", ")). This can mean no data or restricted access; it does not establish denial."
        }
    }
    func disconnect() async {
        await run {
            var next = state
            next.disconnectPending = true
            next.selected = Dictionary(uniqueKeysWithValues: Metric.allCases.map { ($0.rawValue, false) })
            next.cursors = [:]; next.lastRead = [:]; next.lastAck = [:]; next.newestSample = [:]
            try persist(next) // Stop all reads/uploads even if the DELETE fails offline.
            if let credentials = state.credentials {
                try await HealthAPI(endpoint: state.endpoint).disconnect(credentials)
            }
            var cleared = LocalState(); cleared.endpoint = state.endpoint; try persist(cleared)
            message = "Disconnected and credentials erased. HealthKit permissions and server records can be removed separately."
        }
    }
    func forgetLocal() async {
        await run {
            guard state.disconnectPending else { return }
            try persist(LocalState())
            message = "Local credentials erased. Server revocation was not confirmed; revoke this device in GrowthTrack."
        }
    }
}
