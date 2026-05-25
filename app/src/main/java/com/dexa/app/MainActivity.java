package com.dexa.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.content.ActivityNotFoundException;
import android.content.Context;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.ConnectivityManager;
import android.net.Network;
import android.net.NetworkCapabilities;
import android.net.Uri;
import android.net.http.SslError;
import android.os.Build;
import android.os.Bundle;
import android.provider.MediaStore;
import android.provider.Settings;
import android.util.Log;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.view.Window;
import android.view.WindowInsets;
import android.view.WindowInsetsController;
import android.webkit.GeolocationPermissions;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.RenderProcessGoneDetail;
import android.webkit.SslErrorHandler;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.Button;
import android.widget.FrameLayout;
import android.widget.ImageView;
import android.widget.LinearLayout;
import android.widget.ProgressBar;
import android.widget.TextView;

import androidx.annotation.Nullable;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.swiperefreshlayout.widget.SwipeRefreshLayout;

import com.google.firebase.messaging.FirebaseMessaging;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends Activity {
    private static final String TAG = "Dexa";
    private static final String WEB_URL = "https://dexa-seven.vercel.app";
    private static final int REQ_LOCATION = 1001;
    private static final int REQ_NOTIFICATIONS = 1002;
    private static final int REQ_FILE_CHOOSER = 1003;
    private static final int REQ_CAMERA_FOR_CHOOSER = 1004;
    public static final String CHANNEL_ID = "dexa_operations";

    private FrameLayout root;
    private SwipeRefreshLayout swipeRefreshLayout;
    private WebView webView;
    private LinearLayout offlineView;
    private FrameLayout loadingView;
    private ProgressBar topProgress;
    private ValueCallback<Uri[]> filePathCallback;
    private WebChromeClient.FileChooserParams pendingFileChooserParams;
    private Uri cameraCaptureUri;
    private GeolocationPermissions.Callback pendingGeoCallback;
    private String pendingGeoOrigin;

    @Override
    protected void onCreate(@Nullable Bundle savedInstanceState) {
        setTheme(R.style.Theme_Dexa);
        super.onCreate(savedInstanceState);
        configureWindow();
        createNotificationChannel();
        buildLayout();
        configureWebView();
        requestStartupPermissions();
        prepareFirebaseToken();
        loadDexa();
    }

    private void configureWindow() {
        Window window = getWindow();
        window.setStatusBarColor(ContextCompat.getColor(this, R.color.dexa_bg));
        window.setNavigationBarColor(ContextCompat.getColor(this, R.color.dexa_bg));
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            window.setDecorFitsSystemWindows(false);
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(0, WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS);
            }
        }
    }

    private void buildLayout() {
        root = new FrameLayout(this);
        root.setBackgroundColor(ContextCompat.getColor(this, R.color.dexa_bg));
        setContentView(root);

        swipeRefreshLayout = new SwipeRefreshLayout(this);
        swipeRefreshLayout.setColorSchemeColors(ContextCompat.getColor(this, R.color.dexa_cyan));
        swipeRefreshLayout.setOnRefreshListener(() -> {
            if (isOnline()) {
                hideOffline();
                webView.reload();
            } else {
                swipeRefreshLayout.setRefreshing(false);
                showOffline("İnternet bağlantısı yok", "Bağlantını kontrol edip tekrar dene.");
            }
        });

        webView = new WebView(this);
        swipeRefreshLayout.addView(webView, new SwipeRefreshLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.addView(swipeRefreshLayout, matchParent());

        topProgress = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
        topProgress.setMax(100);
        topProgress.setVisibility(View.GONE);
        root.addView(topProgress, new FrameLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                dp(3),
                Gravity.TOP
        ));

        loadingView = createLoadingView();
        root.addView(loadingView, matchParent());

        offlineView = createOfflineView();
        offlineView.setVisibility(View.GONE);
        root.addView(offlineView, matchParent());

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.KITKAT_WATCH) {
            root.setOnApplyWindowInsetsListener((view, insets) -> {
                int top = insets.getSystemWindowInsetTop();
                int bottom = insets.getSystemWindowInsetBottom();
                view.setPadding(0, top, 0, bottom);
                return insets;
            });
        }
    }

    private FrameLayout createLoadingView() {
        FrameLayout container = new FrameLayout(this);
        container.setBackgroundColor(ContextCompat.getColor(this, R.color.dexa_bg));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setPadding(dp(28), dp(28), dp(28), dp(28));

        ImageView logo = new ImageView(this);
        logo.setImageResource(R.drawable.dexa_logo);
        logo.setAdjustViewBounds(true);
        card.addView(logo, new LinearLayout.LayoutParams(dp(112), dp(112)));

        TextView title = new TextView(this);
        title.setText("Dexa");
        title.setTextColor(ContextCompat.getColor(this, R.color.dexa_text));
        title.setTextSize(26);
        title.setGravity(Gravity.CENTER);
        title.setPadding(0, dp(18), 0, dp(6));
        card.addView(title, wrapContent());

        TextView subtitle = new TextView(this);
        subtitle.setText("Operasyon paneli hazırlanıyor");
        subtitle.setTextColor(ContextCompat.getColor(this, R.color.dexa_muted));
        subtitle.setTextSize(14);
        subtitle.setGravity(Gravity.CENTER);
        card.addView(subtitle, wrapContent());

        ProgressBar spinner = new ProgressBar(this);
        LinearLayout.LayoutParams spinnerParams = new LinearLayout.LayoutParams(dp(42), dp(42));
        spinnerParams.topMargin = dp(22);
        card.addView(spinner, spinnerParams);

        container.addView(card, centered());
        return container;
    }

    private LinearLayout createOfflineView() {
        LinearLayout wrapper = new LinearLayout(this);
        wrapper.setGravity(Gravity.CENTER);
        wrapper.setPadding(dp(24), dp(24), dp(24), dp(24));
        wrapper.setBackgroundColor(ContextCompat.getColor(this, R.color.dexa_bg));

        LinearLayout card = new LinearLayout(this);
        card.setOrientation(LinearLayout.VERTICAL);
        card.setGravity(Gravity.CENTER);
        card.setBackgroundResource(R.drawable.offline_panel);

        TextView title = new TextView(this);
        title.setText("İnternet bağlantısı yok");
        title.setTextColor(ContextCompat.getColor(this, R.color.dexa_text));
        title.setTextSize(20);
        title.setGravity(Gravity.CENTER);
        card.addView(title, wrapContent());

        TextView message = new TextView(this);
        message.setText("Dexa panelini açmak için bağlantını kontrol et.");
        message.setTextColor(ContextCompat.getColor(this, R.color.dexa_muted));
        message.setTextSize(14);
        message.setGravity(Gravity.CENTER);
        message.setPadding(0, dp(10), 0, dp(18));
        card.addView(message, wrapContent());

        Button retry = new Button(this);
        retry.setText("Tekrar dene");
        retry.setOnClickListener(v -> loadDexa());
        card.addView(retry, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));

        wrapper.addView(card, new LinearLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.WRAP_CONTENT
        ));
        return wrapper;
    }

    @SuppressLint("SetJavaScriptEnabled")
    private void configureWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
        settings.setCacheMode(WebSettings.LOAD_DEFAULT);

        WebView.setWebContentsDebuggingEnabled(BuildConfig.DEBUG);
        webView.setOverScrollMode(View.OVER_SCROLL_NEVER);
        webView.addJavascriptInterface(new DexaAndroidBridge(), "DexaAndroid");
        webView.setWebViewClient(new DexaWebViewClient());
        webView.setWebChromeClient(new DexaWebChromeClient());
    }

    private void loadDexa() {
        if (!isOnline()) {
            Log.w(TAG, "No active network, showing offline screen before loading " + WEB_URL);
            hideLoading();
            showOffline("İnternet bağlantısı yok", "Bağlantını kontrol edip tekrar dene.");
            return;
        }
        Log.d(TAG, "Loading WebView URL: " + WEB_URL);
        hideOffline();
        loadingView.setVisibility(View.VISIBLE);
        webView.loadUrl(WEB_URL);
    }

    private void requestStartupPermissions() {
        if (!hasLocationPermission()) {
            ActivityCompat.requestPermissions(this, new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
            }, REQ_LOCATION);
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU
                && ContextCompat.checkSelfPermission(this, Manifest.permission.POST_NOTIFICATIONS) != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, new String[]{Manifest.permission.POST_NOTIFICATIONS}, REQ_NOTIFICATIONS);
        }
    }

    private void prepareFirebaseToken() {
        FirebaseMessaging.getInstance().getToken()
                .addOnSuccessListener(token -> {
                    getSharedPreferences("dexa_fcm", MODE_PRIVATE).edit().putString("token", token).apply();
                    Log.d(TAG, "Firebase Messaging token ready");
                })
                .addOnFailureListener(error -> Log.w(TAG, "Firebase Messaging token failed", error));
    }

    public static void createNotificationChannel(Context context) {
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) return;
        NotificationManager manager = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (manager == null || manager.getNotificationChannel(CHANNEL_ID) != null) return;
        NotificationChannel channel = new NotificationChannel(
                CHANNEL_ID,
                "Dexa bildirimleri",
                NotificationManager.IMPORTANCE_DEFAULT
        );
        channel.setDescription("Vardiya, duyuru ve operasyon bildirimleri");
        manager.createNotificationChannel(channel);
    }

    private void createNotificationChannel() {
        createNotificationChannel(this);
    }

    private boolean hasLocationPermission() {
        return ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) == PackageManager.PERMISSION_GRANTED
                || ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) == PackageManager.PERMISSION_GRANTED;
    }

    private boolean isOnline() {
        ConnectivityManager cm = (ConnectivityManager) getSystemService(CONNECTIVITY_SERVICE);
        if (cm == null) return false;
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            Network network = cm.getActiveNetwork();
            if (network == null) return false;
            NetworkCapabilities caps = cm.getNetworkCapabilities(network);
            return caps != null && (caps.hasTransport(NetworkCapabilities.TRANSPORT_WIFI)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_CELLULAR)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_ETHERNET)
                    || caps.hasTransport(NetworkCapabilities.TRANSPORT_VPN));
        }
        android.net.NetworkInfo info = cm.getActiveNetworkInfo();
        return info != null && info.isConnected();
    }

    private void showOffline(String title, String message) {
        offlineView.setVisibility(View.VISIBLE);
        webView.setVisibility(View.GONE);
        swipeRefreshLayout.setRefreshing(false);
    }

    private void hideOffline() {
        offlineView.setVisibility(View.GONE);
        webView.setVisibility(View.VISIBLE);
    }

    private void hideLoading() {
        loadingView.setVisibility(View.GONE);
        topProgress.setVisibility(View.GONE);
        swipeRefreshLayout.setRefreshing(false);
    }

    private void recoverWebViewAfterCrash() {
        root.removeView(swipeRefreshLayout);
        swipeRefreshLayout.removeView(webView);
        webView.destroy();
        swipeRefreshLayout = new SwipeRefreshLayout(this);
        swipeRefreshLayout.setColorSchemeColors(ContextCompat.getColor(this, R.color.dexa_cyan));
        swipeRefreshLayout.setOnRefreshListener(() -> loadDexa());
        webView = new WebView(this);
        swipeRefreshLayout.addView(webView, new SwipeRefreshLayout.LayoutParams(
                ViewGroup.LayoutParams.MATCH_PARENT,
                ViewGroup.LayoutParams.MATCH_PARENT
        ));
        root.addView(swipeRefreshLayout, 0, matchParent());
        configureWebView();
        loadDexa();
    }

    private Intent buildCameraIntent() {
        Intent cameraIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
        if (cameraIntent.resolveActivity(getPackageManager()) == null) return null;
        try {
            File imageFile = createImageFile();
            cameraCaptureUri = FileProvider.getUriForFile(
                    this,
                    BuildConfig.APPLICATION_ID + ".fileprovider",
                    imageFile
            );
            cameraIntent.putExtra(MediaStore.EXTRA_OUTPUT, cameraCaptureUri);
            cameraIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION | Intent.FLAG_GRANT_WRITE_URI_PERMISSION);
            return cameraIntent;
        } catch (IOException error) {
            Log.w(TAG, "Camera file could not be created", error);
            return null;
        }
    }

    private File createImageFile() throws IOException {
        String timestamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.US).format(new Date());
        File dir = getExternalCacheDir() != null ? getExternalCacheDir() : getCacheDir();
        return File.createTempFile("DEXA_" + timestamp + "_", ".jpg", dir);
    }

    private boolean openFileChooser(ValueCallback<Uri[]> callback, WebChromeClient.FileChooserParams params) {
        filePathCallback = callback;
        Intent contentIntent = params.createIntent();
        contentIntent.addCategory(Intent.CATEGORY_OPENABLE);
        Intent cameraIntent = buildCameraIntent();
        Intent chooser = Intent.createChooser(contentIntent, "Dosya seç");
        if (cameraIntent != null) {
            chooser.putExtra(Intent.EXTRA_INITIAL_INTENTS, new Intent[]{cameraIntent});
        }
        try {
            startActivityForResult(chooser, REQ_FILE_CHOOSER);
            return true;
        } catch (ActivityNotFoundException error) {
            filePathCallback = null;
            return false;
        }
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);
        if (requestCode != REQ_FILE_CHOOSER || filePathCallback == null) return;
        Uri[] results = null;
        if (resultCode == RESULT_OK) {
            if (data == null || data.getData() == null) {
                if (cameraCaptureUri != null) results = new Uri[]{cameraCaptureUri};
            } else if (data.getClipData() != null) {
                int count = data.getClipData().getItemCount();
                results = new Uri[count];
                for (int i = 0; i < count; i++) {
                    results[i] = data.getClipData().getItemAt(i).getUri();
                }
            } else {
                results = new Uri[]{data.getData()};
            }
        }
        filePathCallback.onReceiveValue(results);
        filePathCallback = null;
        cameraCaptureUri = null;
    }

    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[] grantResults) {
        super.onRequestPermissionsResult(requestCode, permissions, grantResults);
        if (requestCode == REQ_LOCATION && pendingGeoCallback != null) {
            boolean allowed = hasLocationPermission();
            pendingGeoCallback.invoke(pendingGeoOrigin, allowed, false);
            pendingGeoCallback = null;
            pendingGeoOrigin = null;
        }
        if (requestCode == REQ_CAMERA_FOR_CHOOSER && filePathCallback != null) {
            ValueCallback<Uri[]> callback = filePathCallback;
            WebChromeClient.FileChooserParams params = pendingFileChooserParams;
            pendingFileChooserParams = null;
            if (params != null) {
                openFileChooser(callback, params);
            } else {
                callback.onReceiveValue(null);
                filePathCallback = null;
            }
        }
    }

    @Override
    public void onBackPressed() {
        if (offlineView.getVisibility() == View.VISIBLE) {
            hideOffline();
            loadDexa();
            return;
        }
        if (webView != null && webView.canGoBack()) {
            webView.goBack();
            return;
        }
        super.onBackPressed();
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.stopLoading();
            webView.destroy();
        }
        super.onDestroy();
    }

    private class DexaWebViewClient extends WebViewClient {
        @Override
        public void onPageStarted(WebView view, String url, android.graphics.Bitmap favicon) {
            Log.d(TAG, "WebView page started: " + url);
            topProgress.setVisibility(View.VISIBLE);
            topProgress.setProgress(10);
        }

        @Override
        public void onPageFinished(WebView view, String url) {
            Log.d(TAG, "WebView page finished: " + url);
            hideLoading();
            topProgress.setProgress(100);
        }

        @Override
        public void onReceivedError(WebView view, WebResourceRequest request, WebResourceError error) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request.isForMainFrame()) {
                Log.e(TAG, "WebView main-frame error: code=" + error.getErrorCode()
                        + ", description=" + error.getDescription()
                        + ", url=" + request.getUrl());
                showOffline("Sayfa açılamadı", "Bağlantı veya servis durumunu kontrol edip tekrar dene.");
            }
        }

        @Override
        public void onReceivedHttpError(WebView view, WebResourceRequest request, WebResourceResponse errorResponse) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP && request.isForMainFrame()) {
                Log.e(TAG, "WebView HTTP error: status=" + errorResponse.getStatusCode()
                        + ", reason=" + errorResponse.getReasonPhrase()
                        + ", url=" + request.getUrl());
                showOffline("Sayfa aÃ§Ä±lamadÄ±", "Sunucu yanÄ±tÄ± alÄ±namadÄ±.");
            }
        }

        @Override
        public void onReceivedSslError(WebView view, SslErrorHandler handler, SslError error) {
            Log.e(TAG, "WebView SSL error: " + error);
            handler.cancel();
            showOffline("Güvenli bağlantı kurulamadı", "SSL doğrulaması başarısız oldu.");
        }

        @Override
        public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
            Uri uri = request.getUrl();
            if ("https".equalsIgnoreCase(uri.getScheme()) && "dexa-seven.vercel.app".equalsIgnoreCase(uri.getHost())) {
                return false;
            }
            Intent intent = new Intent(Intent.ACTION_VIEW, uri);
            try {
                startActivity(intent);
            } catch (ActivityNotFoundException ignored) {
                return false;
            }
            return true;
        }

        @Override
        public boolean onRenderProcessGone(WebView view, RenderProcessGoneDetail detail) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                recoverWebViewAfterCrash();
                return true;
            }
            return super.onRenderProcessGone(view, detail);
        }
    }

    private class DexaWebChromeClient extends WebChromeClient {
        @Override
        public void onProgressChanged(WebView view, int newProgress) {
            topProgress.setVisibility(newProgress >= 100 ? View.GONE : View.VISIBLE);
            topProgress.setProgress(newProgress);
        }

        @Override
        public void onGeolocationPermissionsShowPrompt(String origin, GeolocationPermissions.Callback callback) {
            if (hasLocationPermission()) {
                callback.invoke(origin, true, false);
                return;
            }
            pendingGeoOrigin = origin;
            pendingGeoCallback = callback;
            ActivityCompat.requestPermissions(MainActivity.this, new String[]{
                    Manifest.permission.ACCESS_FINE_LOCATION,
                    Manifest.permission.ACCESS_COARSE_LOCATION
            }, REQ_LOCATION);
        }

        @Override
        public void onPermissionRequest(PermissionRequest request) {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
                request.grant(request.getResources());
            }
        }

        @Override
        public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> callback, FileChooserParams params) {
            if (filePathCallback != null) {
                filePathCallback.onReceiveValue(null);
            }
            if (ContextCompat.checkSelfPermission(MainActivity.this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
                filePathCallback = callback;
                pendingFileChooserParams = params;
                ActivityCompat.requestPermissions(MainActivity.this, new String[]{Manifest.permission.CAMERA}, REQ_CAMERA_FOR_CHOOSER);
                return true;
            }
            return openFileChooser(callback, params);
        }
    }

    private class DexaAndroidBridge {
        @JavascriptInterface
        public boolean isMockLocationEnabled() {
            try {
                if (Build.VERSION.SDK_INT < Build.VERSION_CODES.M) {
                    return !"0".equals(Settings.Secure.getString(getContentResolver(), Settings.Secure.ALLOW_MOCK_LOCATION));
                }
            } catch (Exception error) {
                Log.w(TAG, "Mock location check failed", error);
            }
            return false;
        }

        @JavascriptInterface
        public String deviceSummary() {
            return Build.MANUFACTURER + " " + Build.MODEL + " / Android " + Build.VERSION.RELEASE;
        }
    }

    private FrameLayout.LayoutParams matchParent() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.MATCH_PARENT);
    }

    private FrameLayout.LayoutParams centered() {
        return new FrameLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT, Gravity.CENTER);
    }

    private LinearLayout.LayoutParams wrapContent() {
        return new LinearLayout.LayoutParams(ViewGroup.LayoutParams.WRAP_CONTENT, ViewGroup.LayoutParams.WRAP_CONTENT);
    }

    private int dp(int value) {
        return Math.round(value * getResources().getDisplayMetrics().density);
    }
}
