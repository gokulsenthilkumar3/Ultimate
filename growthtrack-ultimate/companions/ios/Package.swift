// swift-tools-version: 5.9
import PackageDescription

// Protocol tests only. The SwiftUI/HealthKit application is built by the Xcode project.
let package = Package(name: "HealthWire", platforms: [.macOS(.v13), .iOS(.v16)], targets: [
    .target(name: "HealthWire", path: "GrowthTrackHealth", exclude: [
        "GrowthTrackHealthApp.swift", "CompanionModel.swift", "SecureStore.swift", "HealthAPI.swift",
        "HealthReader.swift", "Info.plist", "GrowthTrackHealth.entitlements",
    ], sources: ["HealthWire.swift"]),
    .testTarget(name: "HealthWireTests", dependencies: ["HealthWire"], path: "Tests"),
])
