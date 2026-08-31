plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.plugin.compose")
}

android {
    namespace = "no.vardir.cleanroom.spike"
    compileSdk = 36

    defaultConfig {
        applicationId = "no.vardir.cleanroom.spike"
        minSdk = 30
        targetSdk = 36
        versionCode = 1
        versionName = "0.0.1-spike"
    }

    buildFeatures {
        compose = true
    }
}

dependencies {
    // Compose 1.12 (BOM 2026.08) requires compileSdk 37. Keep the spike on
    // the final API-36-compatible Compose line until API 37 is available on CI.
    implementation(platform("androidx.compose:compose-bom:2026.06.00"))
    implementation("androidx.activity:activity-compose:1.12.1")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.10.0")
    debugImplementation("androidx.compose.ui:ui-tooling")

    implementation("com.github.MuntashirAkon:libadb-android:3.1.1")
    implementation("com.github.MuntashirAkon:sun-security-android:1.1")
    implementation("org.conscrypt:conscrypt-android:2.5.3")
}
