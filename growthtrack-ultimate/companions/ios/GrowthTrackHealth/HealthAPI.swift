import Foundation

private final class NoRedirects: NSObject, URLSessionTaskDelegate {
    func urlSession(_ session: URLSession, task: URLSessionTask,
                    willPerformHTTPRedirection response: HTTPURLResponse, newRequest request: URLRequest,
                    completionHandler: @escaping (URLRequest?) -> Void) { completionHandler(nil) }
}

final class HealthAPI {
    private let origin: URL
    private let session: URLSession
    init(endpoint: String) throws {
        origin = try Wire.origin(endpoint)
        let configuration = URLSessionConfiguration.ephemeral
        configuration.httpShouldSetCookies = false
        configuration.httpCookieStorage = nil
        configuration.urlCache = nil
        configuration.timeoutIntervalForRequest = 20
        configuration.timeoutIntervalForResource = 30
        session = URLSession(configuration: configuration, delegate: NoRedirects(), delegateQueue: nil)
    }
    deinit { session.invalidateAndCancel() }

    private func send(_ method: String, _ path: String, body: Data? = nil,
                      token: String? = nil, retry: Bool = false) async throws -> Data {
        guard let url = URL(string: path, relativeTo: origin)?.absoluteURL,
              url.host == origin.host, url.scheme == "https" else { throw CompanionError.invalidEndpoint }
        var request = URLRequest(url: url)
        request.httpMethod = method
        request.httpBody = body
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("no-store", forHTTPHeaderField: "Cache-Control")
        if let token { request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization") }
        let attempts = retry ? 3 : 1
        for attempt in 0..<attempts {
            do {
                let (bytes, response) = try await session.bytes(for: request)
                guard let response = response as? HTTPURLResponse else { throw CompanionError.protocolError }
                guard response.statusCode == (method == "DELETE" ? 204 : 200) else {
                    throw CompanionError.http(response.statusCode)
                }
                if method == "DELETE" { return Data() }
                guard response.mimeType == "application/json" else { throw CompanionError.protocolError }
                var data = Data()
                for try await byte in bytes {
                    guard data.count < 65536 else { throw CompanionError.invalidPayload }
                    data.append(byte)
                }
                return data
            } catch {
                let transient: Bool
                if let failure = error as? CompanionError, case .http(let status) = failure {
                    transient = [408, 429, 500, 502, 503, 504].contains(status)
                } else if let failure = error as? URLError {
                    transient = [.timedOut, .networkConnectionLost, .notConnectedToInternet,
                                 .cannotConnectToHost].contains(failure.code)
                } else { transient = false }
                guard transient && attempt + 1 < attempts else { throw error }
                try await Task.sleep(nanoseconds: UInt64((1 << attempt) * 1_000_000_000)
                                     + UInt64.random(in: 0..<250_000_000))
            }
        }
        throw CompanionError.protocolError
    }
    func pair(code: String) async throws -> Credentials {
        guard code.range(of: "^[0123456789ABCDEFGHJKMNPQRSTVWXYZ]{10}$", options: .regularExpression) != nil
        else { throw CompanionError.invalidPayload }
        let body = try JSONSerialization.data(withJSONObject: ["code": code, "provider": "apple_health",
                                                                "deviceName": "GrowthTrack iOS companion"])
        // No automatic replay of a single-use code; a lost response requires a new browser code.
        let data = try await send("POST", "/api/health-companions/pairings/redeem", body: body)
        _ = try Wire.object(data, keys: ["connectionId", "provider", "accessToken", "expiresAt"])
        let credentials = try JSONDecoder().decode(Credentials.self, from: data)
        try credentials.validate()
        return credentials
    }
    func connection(_ credentials: Credentials, permissions: [String: Permission]? = nil) async throws {
        let body = try permissions.map { try JSONEncoder().encode(Consent(permissions: $0)) }
        let data = try await send(permissions == nil ? "GET" : "PUT",
                                 permissions == nil ? "/api/health-companions/connection" : "/api/health-companions/connection/consent",
                                 body: body, token: credentials.accessToken, retry: true)
        let object = try Wire.object(data, keys: ["connectionId", "provider", "status", "permissions", "lastReceivedAt"])
        guard object["connectionId"] as? String == credentials.connectionId,
              object["provider"] as? String == "apple_health" else { throw CompanionError.invalidPayload }
        guard object["status"] as? String == "active" else { throw CompanionError.http(410) }
        guard let map = object["permissions"] as? [String: Any], Set(map.keys) == Set(Metric.allCases.map(\.rawValue))
        else { throw CompanionError.invalidPayload }
        for (_, value) in map {
            guard let permission = value as? [String: Any], Set(permission.keys) == ["optedIn", "access"],
                  let optedIn = permission["optedIn"] as? Bool, let access = permission["access"] as? String,
                  ["not_requested", "unknown", "granted", "denied", "unavailable"].contains(access),
                  optedIn || access == "not_requested" else { throw CompanionError.invalidPayload }
        }
        if let date = object["lastReceivedAt"] as? String { _ = try Wire.date(date) }
        else if !(object["lastReceivedAt"] is NSNull) { throw CompanionError.invalidPayload }
        if let permissions {
            for (metric, requested) in permissions {
                guard let returned = map[metric] as? [String: Any],
                      returned["optedIn"] as? Bool == requested.optedIn,
                      returned["access"] as? String == requested.access else { throw CompanionError.protocolError }
            }
        }
    }
    func upload(_ batch: Batch, credentials: Credentials) async throws -> String {
        try batch.validate()
        let data = try await send("POST", "/api/health-companions/batches", body: JSONEncoder().encode(batch),
                                  token: credentials.accessToken, retry: true)
        let ack = try Wire.object(data, keys: ["batchId", "accepted", "syncedAt"])
        guard ack["batchId"] as? String == batch.batchId, ack["accepted"] as? Bool == true,
              let synced = ack["syncedAt"] as? String else { throw CompanionError.protocolError }
        _ = try Wire.date(synced)
        return synced
    }
    func disconnect(_ credentials: Credentials) async throws {
        do { _ = try await send("DELETE", "/api/health-companions/connection", token: credentials.accessToken, retry: true) }
        catch CompanionError.http(let status) where status == 410 { return }
    }
    private struct Consent: Encodable { let permissions: [String: Permission] }
}
