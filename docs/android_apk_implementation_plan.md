# Implementation Plan: Android APK (Option A - WebView Wrapper)

This plan outlines the steps to convert Prasan ERP into a professional Android APK using **Capacitor**. This approach wraps the web application into a native Android container.

---

## 🛠️ Prerequisites
1.  **Hosting:** The application must be hosted on a live URL (e.g., Vercel, Railway) or a stable Local IP address.
2.  **Environment:** 
    *   Node.js installed on the build machine.
    *   **Android Studio** installed and configured with the Android SDK.
3.  **Assets:** High-resolution square icon (1024x1024) for the app launcher.

---

## 🚀 Phase 1: Preparation
### 1. Enable PWA Features
While not strictly required for an APK, adding a `manifest.json` ensures the app behaves correctly on mobile devices (e.g., preventing accidental zoom, setting theme colors).

### 2. Host the Application
The APK acts as a portal. For the app to work, the backend (Next.js server) must be accessible.
*   **Production:** Deploy to `https://app.prasan-erp.com`.
*   **Development/Local:** Ensure your phone and PC are on the same Wi-Fi and use `http://[YOUR_PC_IP]:3000`.

---

## 📦 Phase 2: Capacitor Integration
### 1. Install Capacitor
Run the following commands in the project root:
```bash
npm install @capacitor/core @capacitor/cli
npx cap init [AppName] [AppID] --web-dir out
```
*   **AppName:** Prasan ERP
*   **AppID:** com.prasan.erp (Unique identifier)

### 2. Add Android Platform
```bash
npm install @capacitor/android
npx cap add android
```

---

## ⚙️ Phase 3: Configuration
### 1. Configure the WebView
Edit `capacitor.config.json` to point to your hosted URL:
```json
{
  "appId": "com.prasan.erp",
  "appName": "Prasan ERP",
  "webDir": "out",
  "server": {
    "url": "https://your-deployed-app.vercel.app",
    "cleartext": true
  }
}
```
*   `cleartext: true` is required if testing over a local `http` IP.

### 2. Sync Configuration
```bash
npx cap sync
```

---

## 🛠️ Phase 4: Native Build (Android Studio)
### 1. Open in Android Studio
```bash
npx cap open android
```

### 2. Branding & Icons
*   Use the **Image Asset Studio** in Android Studio to generate all required icon sizes from your master logo.
*   Update `res/values/strings.xml` for any native string changes.

### 3. Generate APK / App Bundle
*   Go to **Build > Build Bundle(s) / APK(s) > Build APK(s)**.
*   For Play Store release: **Generate Signed Bundle / APK**.

---

## 🧪 Phase 5: Testing & Validation
1.  **Navigation:** Ensure the "Back" button on Android doesn't exit the app immediately but navigates back in history.
2.  **Inputs:** Verify that the soft keyboard doesn't overlap critical input fields (like Invoice Totals).
3.  **Permissions:** If the app ever needs to save PDFs to the phone, add `WRITE_EXTERNAL_STORAGE` permissions to `AndroidManifest.xml`.

---

## 📈 Future Improvements
*   **Deep Linking:** Allow clicking a "View Invoice" link in an email to open directly inside the app.
*   **Push Notifications:** Use the Firebase Capacitor plugin to notify users of overdue invoices.
*   **Biometric Auth:** Use Android Fingerprint/Face ID to unlock the app instead of typing the Master Password every time.
