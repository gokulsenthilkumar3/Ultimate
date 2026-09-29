import XCTest
@testable import HealthWire

final class HealthWireTests: XCTestCase {
    func testOnlyHttpsOriginsWithoutCredentialsAreAccepted() throws {
        XCTAssertEqual(try Wire.origin("https://example.com").host, "example.com")
        for input in ["http://example.com", "https://user:token@example.com", "https://example.com/api", "https://example.com/?secret=x"] {
            XCTAssertThrowsError(try Wire.origin(input))
        }
    }
    func testReadWindowAndUnitsAreValidated() throws {
        let start = try Wire.date("2026-09-22T00:00:00Z")
        let end = try Wire.date("2026-09-29T00:00:00Z")
        let source = Source(externalId: "id-1", origin: "com.apple.health")
        let sample = Sample(kind: .weight, source: source, startAt: "2026-09-28T00:00:00Z",
                            endAt: "2026-09-28T00:00:00Z", value: .weight(72.5))
        XCTAssertNoThrow(try sample.validate(start: start, end: end))
        let invalid = Sample(kind: .weight, source: source, startAt: sample.startAt, endAt: sample.endAt, value: .weight(.infinity))
        XCTAssertThrowsError(try invalid.validate(start: start, end: end))
        XCTAssertThrowsError(try Wire.date("2026-09-28T00:00:00+05:30"))
    }
    func testBatchRejectsDuplicateSourceAndCannotSmuggleUnknownResponseKeys() throws {
        let sample = Sample(kind: .weight, source: .init(externalId: "id-1", origin: "com.apple.health"),
                            startAt: "2026-09-28T00:00:00Z", endAt: "2026-09-28T00:00:00Z", value: .weight(72))
        let batch = Batch(connectionId: UUID().uuidString, batchId: UUID().uuidString, metric: .weight,
                          windowStart: "2026-09-22T00:00:00Z", windowEnd: "2026-09-29T00:00:00Z", samples: [sample, sample], deletions: [])
        XCTAssertThrowsError(try batch.validate())
        XCTAssertThrowsError(try Wire.object(Data("{\"accepted\":true,\"token\":\"unexpected\"}".utf8), keys: ["accepted"]))
    }
}
