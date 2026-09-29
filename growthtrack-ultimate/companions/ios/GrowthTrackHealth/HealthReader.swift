import Foundation
import HealthKit

struct HealthPage {
    let samples: [Sample]
    let deletions: [Deletion]
    let anchor: Data
    let operationCount: Int
}

final class HealthReader {
    private let store = HKHealthStore()
    var available: Bool { HKHealthStore.isHealthDataAvailable() }
    private func type(_ metric: Metric) -> HKSampleType {
        switch metric {
        case .weight: return HKObjectType.quantityType(forIdentifier: .bodyMass)!
        case .steps: return HKObjectType.quantityType(forIdentifier: .stepCount)!
        case .sleep: return HKObjectType.categoryType(forIdentifier: .sleepAnalysis)!
        case .workouts: return HKObjectType.workoutType()
        }
    }
    func authorize(_ metrics: [Metric]) async throws {
        guard available else { throw CompanionError.unavailable }
        guard !metrics.isEmpty else { return }
        // Completion indicates the request completed, NOT that read access was granted.
        try await store.requestAuthorization(toShare: [], read: Set(metrics.map { type($0) as HKObjectType }))
    }
    func read(_ metric: Metric, cursor: HealthCursor, end: Date) async throws -> HealthPage {
        guard available else { throw CompanionError.unavailable }
        let start = try Wire.date(cursor.windowStart)
        let anchor = try cursor.anchor.map {
            try NSKeyedUnarchiver.unarchivedObject(ofClass: HKQueryAnchor.self, from: $0)
        } ?? nil
        // Stable predicate for the life of the anchor. Rotate after 24h to bound its history.
        let predicate = HKQuery.predicateForSamples(withStart: start, end: nil, options: .strictStartDate)
        return try await withCheckedThrowingContinuation { continuation in
            let query = HKAnchoredObjectQuery(type: type(metric), predicate: predicate, anchor: anchor, limit: 200) {
                _, samples, deleted, nextAnchor, error in
                if let error { continuation.resume(throwing: error); return }
                do {
                    guard let nextAnchor else { throw CompanionError.protocolError }
                    let encoded = try NSKeyedArchiver.archivedData(withRootObject: nextAnchor, requiringSecureCoding: true)
                    let mapped = try (samples ?? []).compactMap { try self.map($0, metric: metric, start: start, end: end) }
                    // A deletion has no source bundle ID. Never invent one or retain a local ID/history map.
                    let tombstones = (deleted ?? []).map { Deletion(kind: metric,
                        source: .init(externalId: $0.uuid.uuidString.lowercased())) }
                    continuation.resume(returning: HealthPage(samples: mapped, deletions: tombstones, anchor: encoded,
                        operationCount: (samples ?? []).count + (deleted ?? []).count))
                } catch { continuation.resume(throwing: error) }
            }
            store.execute(query)
        }
    }
    private func map(_ sample: HKSample, metric: Metric, start: Date, end: Date) throws -> Sample? {
        guard sample.startDate >= start, sample.endDate <= end else { return nil }
        let source = Source(externalId: sample.uuid.uuidString.lowercased(), origin: sample.sourceRevision.source.bundleIdentifier)
        let value: SampleValue
        var finish = sample.endDate
        switch metric {
        case .weight:
            guard let quantity = sample as? HKQuantitySample else { throw CompanionError.invalidPayload }
            value = .weight(quantity.quantity.doubleValue(for: .gramUnit(with: .kilo)))
            finish = sample.startDate // Body mass is an instantaneous measurement.
        case .steps:
            guard let quantity = sample as? HKQuantitySample else { throw CompanionError.invalidPayload }
            let count = quantity.quantity.doubleValue(for: .count())
            guard count.isFinite, count >= 0, count <= 9007199254740991, count.rounded() == count
            else { throw CompanionError.invalidPayload }
            value = .steps(Int64(count))
        case .sleep:
            guard let category = sample as? HKCategorySample else { throw CompanionError.invalidPayload }
            let stage: String
            switch category.value {
            case HKCategoryValueSleepAnalysis.inBed.rawValue: stage = "in_bed"
            case HKCategoryValueSleepAnalysis.asleepUnspecified.rawValue: stage = "asleep"
            case HKCategoryValueSleepAnalysis.awake.rawValue: stage = "awake"
            case HKCategoryValueSleepAnalysis.asleepCore.rawValue: stage = "core"
            case HKCategoryValueSleepAnalysis.asleepDeep.rawValue: stage = "deep"
            case HKCategoryValueSleepAnalysis.asleepREM.rawValue: stage = "rem"
            default: throw CompanionError.invalidPayload
            }
            value = .sleep(stage)
        case .workouts:
            guard let workout = sample as? HKWorkout else { throw CompanionError.invalidPayload }
            value = .workout("hk:\(workout.workoutActivityType.rawValue)", workout.duration)
        }
        let result = Sample(kind: metric, source: source, startAt: Wire.utc(sample.startDate), endAt: Wire.utc(finish), value: value)
        try result.validate(start: start, end: end)
        return result
    }
}
