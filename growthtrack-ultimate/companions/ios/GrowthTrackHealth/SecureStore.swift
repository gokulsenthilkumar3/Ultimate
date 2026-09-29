import Foundation
import Security

struct HealthCursor: Codable {
    var windowStart: String
    var createdAt: String
    var anchor: Data?
}
struct LocalState: Codable {
    var endpoint = ""
    var credentials: Credentials?
    var selected: [String: Bool] = Dictionary(uniqueKeysWithValues: Metric.allCases.map { ($0.rawValue, false) })
    var cursors: [String: HealthCursor] = [:]
    var lastRead: [String: String] = [:]
    var lastAck: [String: String] = [:]
    var newestSample: [String: String] = [:]
    var disconnectPending = false
}

/// Only credentials, opt-ins, opaque cursors and freshness metadata; never health records.
struct SecureStore {
    private let query: [String: Any] = [
        kSecClass as String: kSecClassGenericPassword,
        kSecAttrService as String: "com.growthtrack.health.state.v1",
        kSecAttrAccount as String: "companion",
        kSecAttrSynchronizable as String: false,
    ]
    func load() throws -> LocalState {
        var request = query
        request[kSecReturnData as String] = true
        request[kSecMatchLimit as String] = kSecMatchLimitOne
        var result: CFTypeRef?
        let status = SecItemCopyMatching(request as CFDictionary, &result)
        if status == errSecItemNotFound { return LocalState() }
        guard status == errSecSuccess, let data = result as? Data else { throw CompanionError.secureStorage }
        return try JSONDecoder().decode(LocalState.self, from: data)
    }
    func save(_ state: LocalState) throws {
        let data = try JSONEncoder().encode(state)
        let attributes: [String: Any] = [kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly]
        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
        if status == errSecItemNotFound {
            var item = query
            attributes.forEach { item[$0.key] = $0.value }
            guard SecItemAdd(item as CFDictionary, nil) == errSecSuccess else { throw CompanionError.secureStorage }
        } else if status != errSecSuccess { throw CompanionError.secureStorage }
    }
}
