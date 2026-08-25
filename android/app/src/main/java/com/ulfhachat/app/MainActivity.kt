package com.ulfhachat.app

import android.Manifest
import android.annotation.SuppressLint
import android.app.Activity
import android.content.Context
import android.content.Intent
import android.content.pm.PackageManager
import android.net.ConnectivityManager
import android.net.NetworkCapabilities
import android.net.Uri
import android.os.Build
import android.os.Bundle
import android.os.Environment
import android.provider.MediaStore
import android.util.Log
import android.view.View
import android.webkit.*
import android.widget.Button
import android.widget.ProgressBar
import android.widget.RelativeLayout
import android.widget.TextView
import android.widget.Toast
import androidx.activity.OnBackPressedCallback
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.core.content.ContextCompat
import java.io.File
import java.io.IOException
import java.text.SimpleDateFormat
import java.util.*

class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView
    private lateinit var splashContainer: RelativeLayout
    private lateinit var offlineContainer: View
    private lateinit var retryButton: Button
    private lateinit var statusText: TextView

    // URL to load - This is the official production live URL for Ulfah Chat App
    private val appUrl = "https://ais-pre-ubxjjscbfuclhzfbawd7nd-85039836823.asia-east1.run.app"
    private val TAG = "UlfahChatWebView"

    // File upload callback variables
    private var fileUploadCallback: ValueCallback<Array<Uri>>? = null
    private var cameraPhotoPath: String? = null

    // Required permission request arrays
    private val requiredPermissions = arrayOf(
        Manifest.permission.CAMERA,
        Manifest.permission.RECORD_AUDIO,
        Manifest.permission.MODIFY_AUDIO_SETTINGS,
        Manifest.permission.ACCESS_FINE_LOCATION,
        Manifest.permission.READ_EXTERNAL_STORAGE,
        Manifest.permission.WRITE_EXTERNAL_STORAGE
    )

    // Activity result launcher for file choosing
    private val fileChooserLauncher = registerForActivityResult(
        ActivityResultContracts.StartActivityForResult()
    ) { result ->
        if (result.resultCode == Activity.RESULT_OK) {
            val data = result.data
            var results: Array<Uri>? = null

            if (data == null || data.data == null) {
                // If there is no data, check if camera was used
                if (cameraPhotoPath != null) {
                    results = arrayOf(Uri.parse(cameraPhotoPath))
                }
            } else {
                val dataString = data.dataString
                if (dataString != null) {
                    results = arrayOf(Uri.parse(dataString))
                }
            }
            fileUploadCallback?.onReceiveValue(results)
        } else {
            fileUploadCallback?.onReceiveValue(null)
        }
        fileUploadCallback = null
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        // Initialize UI Elements
        webView = findViewById(R.id.webView)
        splashContainer = findViewById(R.id.splashContainer)
        offlineContainer = findViewById(R.id.offlineContainer)
        retryButton = findViewById(R.id.retryButton)
        statusText = findViewById(R.id.statusText)

        // Set up Back Button Press Callback
        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack()
                } else {
                    finish()
                }
            }
        })

        // Setup Retry Button for offline screen
        retryButton.setOnClickListener {
            checkConnectionAndLoad()
        }

        // Configure and start WebApp
        configureWebView()
        checkConnectionAndLoad()
    }

    // Helper to verify internet access
    private fun isNetworkAvailable(): Boolean {
        val connectivityManager = getSystemService(Context.CONNECTIVITY_SERVICE) as ConnectivityManager
        val activeNetwork = connectivityManager.activeNetwork ?: return false
        val capabilities = connectivityManager.getNetworkCapabilities(activeNetwork) ?: return false
        return capabilities.hasCapability(NetworkCapabilities.NET_CAPABILITY_INTERNET)
    }

    private fun checkConnectionAndLoad() {
        if (isNetworkAvailable()) {
            offlineContainer.visibility = View.GONE
            splashContainer.visibility = View.VISIBLE
            statusText.text = "Loading Ulfah Chat..."
            webView.loadUrl(appUrl)
        } else {
            splashContainer.visibility = View.GONE
            webView.visibility = View.INVISIBLE
            offlineContainer.visibility = View.VISIBLE
            Toast.makeText(this, "Please check your internet connection.", Toast.LENGTH_SHORT).show()
        }
    }

    @SuppressLint("SetJavaScriptEnabled")
    private fun configureWebView() {
        val settings = webView.settings

        // Enable essential Javascript & storage properties for robust messaging app functionality
        settings.javaScriptEnabled = true
        settings.domStorageEnabled = true
        settings.databaseEnabled = true
        settings.allowFileAccess = true
        settings.allowContentAccess = true
        settings.mediaPlaybackRequiresUserGesture = false // Crucial for calling ringtones/audio
        
        // Cache Configuration
        settings.cacheMode = WebSettings.LOAD_DEFAULT
        
        // Mobile layout & zoom adjustments
        settings.useWideViewPort = true
        settings.loadWithOverviewMode = true
        settings.supportZoom()
        settings.builtInZoomControls = true
        settings.displayZoomControls = false

        // User Agent adaptation (Identifies as native Android Wrapper)
        settings.userAgentString = settings.userAgentString + " UlfahChatAndroidNative/2.0.0"

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
            settings.mixedContentMode = WebSettings.MIXED_CONTENT_ALWAYS_ALLOW
            CookieManager.getInstance().setAcceptThirdPartyCookies(webView, true)
        }

        // Custom Web View Client to monitor page loading
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                // Smooth splash animation/transition hide
                splashContainer.animate().alpha(0f).setDuration(400).withEndAction {
                    splashContainer.visibility = View.GONE
                    webView.visibility = View.VISIBLE
                    webView.alpha = 0f
                    webView.animate().alpha(1f).setDuration(200).start()
                }.start()
            }

            override fun onReceivedError(
                view: WebView?,
                request: WebResourceRequest?,
                error: WebResourceError?
            ) {
                // If main page loading fails, display offline native view
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
                    if (request?.isForMainFrame == true) {
                        splashContainer.visibility = View.GONE
                        webView.visibility = View.INVISIBLE
                        offlineContainer.visibility = View.VISIBLE
                    }
                }
            }

            override fun shouldOverrideUrlLoading(
                view: WebView?,
                request: WebResourceRequest?
            ): Boolean {
                val url = request?.url?.toString() ?: return false
                
                // Allow opening phone numbers, emails, WhatsApp natively
                if (url.startsWith("tel:") || url.startsWith("mailto:") || url.startsWith("sms:") || url.startsWith("whatsapp:")) {
                    try {
                        val intent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                        startActivity(intent)
                        return true
                    } catch (e: Exception) {
                        Log.e(TAG, "Error resolving URI: $url", e)
                    }
                }
                return false
            }
        }

        // Custom Web Chrome Client for Native Camera/Microphone Permission prompts and File uploads
        webView.webChromeClient = object : WebChromeClient() {
            
            // Handle WebRTC permission grants
            override fun onPermissionRequest(request: PermissionRequest?) {
                val resources = request?.resources ?: return
                val permissionsToGrant = mutableListOf<String>()

                for (resource in resources) {
                    if (resource == PermissionRequest.RESOURCE_VIDEO_CAPTURE) {
                        permissionsToGrant.add(Manifest.permission.CAMERA)
                    } else if (resource == PermissionRequest.RESOURCE_AUDIO_CAPTURE) {
                        permissionsToGrant.add(Manifest.permission.RECORD_AUDIO)
                    }
                }

                // Check permissions dynamically
                val missingPermissions = permissionsToGrant.filter {
                    ContextCompat.checkSelfPermission(this@MainActivity, it) != PackageManager.PERMISSION_GRANTED
                }

                if (missingPermissions.isEmpty()) {
                    request.grant(resources)
                } else {
                    // Ask user dynamically
                    ActivityCompat.requestPermissions(
                        this@MainActivity,
                        missingPermissions.toTypedArray(),
                        101
                    )
                    // Auto grant for demonstration/simplicity, custom wrapper flow
                    request.grant(resources)
                }
            }

            // High performance file upload overrides (Enables sending files in chats & admin avatar uploads)
            override fun onShowFileChooser(
                webView: WebView?,
                filePathCallback: ValueCallback<Array<Uri>>?,
                fileChooserParams: FileChooserParams?
            ): Boolean {
                if (fileUploadCallback != null) {
                    fileUploadCallback?.onReceiveValue(null)
                    fileUploadCallback = null
                }

                fileUploadCallback = filePathCallback

                // Option 1: Launch camera capture intent
                var takePictureIntent: Intent? = Intent(MediaStore.ACTION_IMAGE_CAPTURE)
                if (takePictureIntent?.resolveActivity(packageManager) != null) {
                    var photoFile: File? = null
                    try {
                        photoFile = createImageFile()
                        takePictureIntent.putExtra("PhotoPath", cameraPhotoPath)
                    } catch (ex: IOException) {
                        Log.e(TAG, "Unable to create Image File", ex)
                    }

                    if (photoFile != null) {
                        cameraPhotoPath = "file:" + photoFile.absolutePath
                        takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, Uri.fromFile(photoFile))
                    } else {
                        takePictureIntent = null
                    }
                }

                // Option 2: Gallery/File picker intent
                val contentSelectionIntent = Intent(Intent.ACTION_GET_CONTENT)
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE)
                contentSelectionIntent.type = "*/*" // Allow all file types for flexible uploads

                val intentArray: Array<Intent?> = takePictureIntent?.let { arrayOf(it) } ?: emptyArray()

                val chooserIntent = Intent(Intent.ACTION_CHOOSER)
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent)
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "Upload Media or Files")
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray)

                fileChooserLauncher.launch(chooserIntent)
                return true
            }
        }

        // Set up Web File Download listener (Download PDF library books / Quran offline easily)
        webView.setDownloadListener { url, userAgent, contentDisposition, mimetype, contentLength ->
            try {
                val intent = Intent(Intent.ACTION_VIEW)
                intent.data = Uri.parse(url)
                startActivity(intent)
                Toast.makeText(this, "Downloading file...", Toast.LENGTH_SHORT).show()
            } catch (e: Exception) {
                Log.e(TAG, "Download error", e)
                Toast.makeText(this, "Opening in browser to download...", Toast.LENGTH_SHORT).show()
                val browserIntent = Intent(Intent.ACTION_VIEW, Uri.parse(url))
                startActivity(browserIntent)
            }
        }
    }

    @Throws(IOException::class)
    private fun createImageFile(): File {
        val timeStamp = SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(Date())
        val imageFileName = "JPEG_" + timeStamp + "_"
        val storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES)
        return File.createTempFile(imageFileName, ".jpg", storageDir)
    }
}
