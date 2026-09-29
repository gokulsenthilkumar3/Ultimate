import SwiftUI

@main
struct GrowthTrackHealthApp: App {
    @StateObject private var model = CompanionModel()
    @Environment(\.scenePhase) private var phase
    var body: some Scene {
        WindowGroup {
            CompanionView(model: model)
                .onChange(of: phase) { value in
                    if value == .active { Task { await model.checkConnection() } }
                }
        }
    }
}

struct CompanionView: View {
    @ObservedObject var model: CompanionModel
    @State private var endpoint = ""
    @State private var code = ""
    var body: some View {
        NavigationStack {
            Form {
                Section("Pair with your GrowthTrack account") {
                    Text("In the signed-in GrowthTrack web app, create an Apple Health pairing code. Verify that this is your server before entering it here. Codes expire after two minutes.")
                    TextField("HTTPS server origin", text: $endpoint)
                        .textContentType(.URL).keyboardType(.URL).textInputAutocapitalization(.never).autocorrectionDisabled()
                    SecureField("Single-use code", text: $code).textInputAutocapitalization(.characters).autocorrectionDisabled()
                    Button(model.state.credentials == nil ? "Pair device" : "Device paired") {
                        Task { await model.pair(endpoint: endpoint, code: code); code = "" }
                    }.disabled(model.busy || model.state.credentials != nil)
                }
                Section("Share only what you choose") {
                    ForEach(Metric.allCases) { metric in
                        Toggle(metric.rawValue.capitalized, isOn: Binding(
                            get: { model.state.selected[metric.rawValue] == true },
                            set: { enabled in Task { await model.setOptIn(metric, enabled: enabled) } }))
                        Text(model.permissions[metric.rawValue]?.access == "unavailable" ? "HealthKit unavailable" :
                            model.state.selected[metric.rawValue] == true ? "Read access unknown (HealthKit privacy)" : "Not requested")
                            .font(.caption).foregroundStyle(.secondary)
                    }
                    Button("Request access to selected metrics") { Task { await model.authorize() } }
                        .disabled(model.busy || !model.available || model.state.disconnectPending)
                    Text("HealthKit read permission cannot be inspected. Manage or revoke it in Health → profile → Apps. An empty read is never treated as denial. Sharing is read-only and never writes to HealthKit.")
                }.disabled(model.busy || model.state.disconnectPending)
                Section("Sync and freshness") {
                    Text("Recent seven days on first read; bounded incremental reads while this app is open. No health history or pending sample queue is stored on this device.")
                    Button("Sync now") { Task { await model.sync() } }
                        .disabled(model.busy || model.state.credentials == nil || model.state.disconnectPending)
                    ForEach(Metric.allCases) { metric in
                        VStack(alignment: .leading) {
                            Text(metric.rawValue.capitalized)
                            Text("Last read: \(model.state.lastRead[metric.rawValue] ?? "Never")")
                            Text("Last server acknowledgement: \(model.state.lastAck[metric.rawValue] ?? "Never")")
                            Text("Newest observed sample: \(model.state.newestSample[metric.rawValue] ?? "None observed")")
                        }.font(.caption)
                    }
                    Text(model.message).accessibilityIdentifier("companion-status")
                    if model.busy { ProgressView() }
                }
                Section("Disconnect") {
                    Button(model.state.disconnectPending ? "Retry server revocation" : "Disconnect device", role: .destructive) {
                        Task { await model.disconnect() }
                    }.disabled(model.busy || model.state.credentials == nil)
                    if model.state.disconnectPending {
                        Text("Sync is stopped locally. Server revocation is pending. Forgetting locally erases credentials but requires you to revoke this device in GrowthTrack.")
                        Button("Forget this device locally", role: .destructive) { Task { await model.forgetLocal() } }
                            .disabled(model.busy)
                    }
                }
            }
            .navigationTitle("GrowthTrack Health")
            .onAppear { endpoint = model.state.endpoint }
        }
    }
}
