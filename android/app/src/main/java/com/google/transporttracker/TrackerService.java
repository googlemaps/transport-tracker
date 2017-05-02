/**
 * Copyright 2017 Google Inc. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

package com.google.transporttracker;

import com.google.android.gms.common.api.GoogleApiClient;
import com.google.android.gms.gcm.GcmNetworkManager;
import com.google.android.gms.gcm.OneoffTask;
import com.google.android.gms.location.LocationListener;
import com.google.android.gms.location.LocationRequest;
import com.google.android.gms.location.LocationServices;
import com.google.android.gms.tasks.OnCompleteListener;
import com.google.android.gms.tasks.OnSuccessListener;
import com.google.android.gms.tasks.Task;
import com.google.firebase.analytics.FirebaseAnalytics;
import com.google.firebase.auth.AuthResult;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.database.DataSnapshot;
import com.google.firebase.database.DatabaseError;
import com.google.firebase.database.DatabaseReference;
import com.google.firebase.database.FirebaseDatabase;
import com.google.firebase.database.ValueEventListener;
import com.google.firebase.remoteconfig.FirebaseRemoteConfig;
import com.google.firebase.remoteconfig.FirebaseRemoteConfigSettings;

import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.location.Location;
import android.net.ConnectivityManager;
import android.net.NetworkInfo;
import android.os.BatteryManager;
import android.os.Bundle;
import android.os.Environment;
import android.os.IBinder;
import android.os.PowerManager;
import android.support.v4.app.NotificationCompat;
import android.support.v4.content.LocalBroadcastManager;
import android.util.Log;
import android.widget.Toast;

import java.io.File;
import java.io.FileWriter;
import java.util.Calendar;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.LinkedList;

public class TrackerService extends Service implements LocationListener {

    private static final String TAG = TrackerService.class.getSimpleName();
    public static final String STATUS_INTENT = "status";

    private static final int NOTIFICATION_ID = 1;
    private static final int FOREGROUND_SERVICE_ID = 1;
    private static final int CONFIG_CACHE_EXPIRY = 600;  // 10 minutes.

    private GoogleApiClient mGoogleApiClient;
    private DatabaseReference mFirebaseTransportRef;
    private FirebaseRemoteConfig mFirebaseRemoteConfig;
    private LinkedList<Map<String, Object>> mTransportStatuses = new LinkedList<>();
    private NotificationManager mNotificationManager;
    private NotificationCompat.Builder mNotificationBuilder;
    private PowerManager.WakeLock mWakelock;

    private SharedPreferences mPrefs;

    public TrackerService() {
    }

    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onCreate() {
        super.onCreate();

        buildNotification();
        setStatusMessage(R.string.connecting);

        mFirebaseRemoteConfig = FirebaseRemoteConfig.getInstance();
        FirebaseRemoteConfigSettings configSettings = new FirebaseRemoteConfigSettings.Builder()
                .setDeveloperModeEnabled(BuildConfig.DEBUG)
                .build();
                mFirebaseRemoteConfig.setConfigSettings(configSettings);
        mFirebaseRemoteConfig.setDefaults(R.xml.remote_config_defaults);

        mPrefs = getSharedPreferences(getString(R.string.prefs), MODE_PRIVATE);
        String email = mPrefs.getString(getString(R.string.email), "");
        String password = mPrefs.getString(getString(R.string.password), "");
        authenticate(email, password);

    }

    @Override
    public void onDestroy() {
        // Set activity title to not tracking.
        setStatusMessage(R.string.not_tracking);
        // Stop the persistent notification.
        mNotificationManager.cancel(NOTIFICATION_ID);
        // Stop receiving location updates.
        if (mGoogleApiClient != null) {
            LocationServices.FusedLocationApi.removeLocationUpdates(mGoogleApiClient,
                    TrackerService.this);
        }
        // Release the wakelock
        if (mWakelock != null) {
            mWakelock.release();
        }
        super.onDestroy();
    }

    private void authenticate(String email, String password) {
        final FirebaseAuth mAuth = FirebaseAuth.getInstance();
        mAuth.signInWithEmailAndPassword(email, password)
                .addOnCompleteListener(new OnCompleteListener<AuthResult>(){
                    @Override
                    public void onComplete(Task<AuthResult> task) {
                        Log.i(TAG, "authenticate: " + task.isSuccessful());
                        if (task.isSuccessful()) {
                            fetchRemoteConfig();
                            loadPreviousStatuses();
                        } else {
                            Toast.makeText(TrackerService.this, R.string.auth_failed,
                                    Toast.LENGTH_SHORT).show();
                            stopSelf();
                        }
                    }
                });
    }

    private void fetchRemoteConfig() {
        long cacheExpiration = CONFIG_CACHE_EXPIRY;
        if (mFirebaseRemoteConfig.getInfo().getConfigSettings().isDeveloperModeEnabled()) {
            cacheExpiration = 0;
        }
        mFirebaseRemoteConfig.fetch(cacheExpiration)
                .addOnSuccessListener(new OnSuccessListener<Void>() {
                    @Override
                    public void onSuccess(Void aVoid) {
                        Log.i(TAG, "Remote config fetched");
                        mFirebaseRemoteConfig.activateFetched();
                    }
                });
    }

    /**
     * Loads previously stored statuses from Firebase, and once retrieved,
     * start location tracking.
     */
    private void loadPreviousStatuses() {
        String transportId = mPrefs.getString(getString(R.string.transport_id), "");
        FirebaseAnalytics.getInstance(this).setUserProperty("transportID", transportId);
        String path = getString(R.string.firebase_path) + transportId;
        mFirebaseTransportRef = FirebaseDatabase.getInstance().getReference(path);
        mFirebaseTransportRef.addListenerForSingleValueEvent(new ValueEventListener() {
            @Override
            public void onDataChange(DataSnapshot snapshot) {
                if (snapshot != null) {
                    for (DataSnapshot transportStatus : snapshot.getChildren()) {
                        mTransportStatuses.add(Integer.parseInt(transportStatus.getKey()),
                                (Map<String, Object>) transportStatus.getValue());
                    }
                }
                startLocationTracking();
            }

            @Override
            public void onCancelled(DatabaseError error) {
                // TODO: Handle gracefully
            }
        });
    }

    private GoogleApiClient.ConnectionCallbacks mLocationRequestCallback = new GoogleApiClient
            .ConnectionCallbacks() {

        @Override
        public void onConnected(Bundle bundle) {
            LocationRequest request = new LocationRequest();
            request.setInterval(mFirebaseRemoteConfig.getLong("LOCATION_REQUEST_INTERVAL"));
            request.setFastestInterval(mFirebaseRemoteConfig.getLong
                    ("LOCATION_REQUEST_INTERVAL_FASTEST"));
            request.setPriority(LocationRequest.PRIORITY_HIGH_ACCURACY);
            LocationServices.FusedLocationApi.requestLocationUpdates(mGoogleApiClient,
                    request, TrackerService.this);
            setStatusMessage(R.string.tracking);

            // Hold a partial wake lock to keep CPU awake when the we're tracking location.
            PowerManager powerManager = (PowerManager) getSystemService(POWER_SERVICE);
            mWakelock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "MyWakelockTag");
            mWakelock.acquire();
        }

        @Override
        public void onConnectionSuspended(int reason) {
            // TODO: Handle gracefully
        }
    };

    /**
     * Starts location tracking by creating a Google API client, and
     * requesting location updates.
     */
    private void startLocationTracking() {
        mGoogleApiClient = new GoogleApiClient.Builder(this)
                .addConnectionCallbacks(mLocationRequestCallback)
                .addApi(LocationServices.API)
                .build();
        mGoogleApiClient.connect();
    }

    /**
     * Determines if the current location is approximately the same as the location
     * for a particular status. Used to check if we'll add a new status, or
     * update the most recent status of we're stationary.
     */
    private boolean locationIsAtStatus(Location location, int statusIndex) {
        if (mTransportStatuses.size() <= statusIndex) {
            return false;
        }
        Map<String, Object> status = mTransportStatuses.get(statusIndex);
        Location locationForStatus = new Location("");
        locationForStatus.setLatitude((double) status.get("lat"));
        locationForStatus.setLongitude((double) status.get("lng"));
        float distance = location.distanceTo(locationForStatus);
        Log.d(TAG, String.format("Distance from status %s is %sm", statusIndex, distance));
        return distance < mFirebaseRemoteConfig.getLong("LOCATION_MIN_DISTANCE_CHANGED");
    }

    private float getBatteryLevel() {
        Intent batteryStatus = registerReceiver(null,
                new IntentFilter(Intent.ACTION_BATTERY_CHANGED));
        int batteryLevel = -1;
        int batteryScale = 1;
        if (batteryStatus != null) {
            batteryLevel = batteryStatus.getIntExtra(BatteryManager.EXTRA_LEVEL, batteryLevel);
            batteryScale = batteryStatus.getIntExtra(BatteryManager.EXTRA_SCALE, batteryScale);
        }
        return batteryLevel / (float) batteryScale * 100;
    }

    private void logStatusToStorage(Map<String, Object> transportStatus) {
        try {
            File path = new File(Environment.getExternalStoragePublicDirectory(""),
                    "transport-tracker-log.txt");
            if (!path.exists()) {
                path.createNewFile();
            }
            FileWriter logFile = new FileWriter(path.getAbsolutePath(), true);
            logFile.append(transportStatus.toString() + "\n");
            logFile.close();
        } catch (Exception e) {
            Log.e(TAG, "Log file error", e);
        }
    }

    private void shutdownAndScheduleStartup(int when) {
        Log.i(TAG, "overnight shutdown, seconds to startup: " + when);
        com.google.android.gms.gcm.Task task = new OneoffTask.Builder()
                .setService(TrackerTaskService.class)
                .setExecutionWindow(when, when + 60)
                .setUpdateCurrent(true)
                .setTag(TrackerTaskService.TAG)
                .setRequiredNetwork(com.google.android.gms.gcm.Task.NETWORK_STATE_ANY)
                .setRequiresCharging(false)
                .build();
        GcmNetworkManager.getInstance(this).schedule(task);
        stopSelf();
    }

    /**
     * Pushes a new status to Firebase when location changes.
     */
    @Override
    public void onLocationChanged(Location location) {

        fetchRemoteConfig();

        long hour = Calendar.getInstance().get(Calendar.HOUR_OF_DAY);
        int startupSeconds = (int) (mFirebaseRemoteConfig.getDouble("SLEEP_HOURS_DURATION") * 3600);
        if (hour == mFirebaseRemoteConfig.getLong("SLEEP_HOUR_OF_DAY")) {
            shutdownAndScheduleStartup(startupSeconds);
            return;
        }

        Map<String, Object> transportStatus = new HashMap<>();
        transportStatus.put("lat", location.getLatitude());
        transportStatus.put("lng", location.getLongitude());
        transportStatus.put("time", new Date().getTime());
        transportStatus.put("power", getBatteryLevel());

        if (locationIsAtStatus(location, 1) && locationIsAtStatus(location, 0)) {
            // If the most recent two statuses are approximately at the same
            // location as the new current location, rather than adding the new
            // location, we update the latest status with the current. Two statuses
            // are kept when the locations are the same, the earlier representing
            // the time the location was arrived at, and the latest representing the
            // current time.
            mTransportStatuses.set(0, transportStatus);
            // Only need to update 0th status, so we can save bandwidth.
            mFirebaseTransportRef.child("0").setValue(transportStatus);
        } else {
            // Maintain a fixed number of previous statuses.
            while (mTransportStatuses.size() >= mFirebaseRemoteConfig.getLong("MAX_STATUSES")) {
                mTransportStatuses.removeLast();
            }
            mTransportStatuses.addFirst(transportStatus);
            // We push the entire list at once since each key/index changes, to
            // minimize network requests.
            mFirebaseTransportRef.setValue(mTransportStatuses);
        }

        if (BuildConfig.DEBUG) {
            logStatusToStorage(transportStatus);
        }

        NetworkInfo info = ((ConnectivityManager) getSystemService(Context.CONNECTIVITY_SERVICE))
                .getActiveNetworkInfo();
        boolean connected = info != null && info.isConnectedOrConnecting();
        setStatusMessage(connected ? R.string.tracking : R.string.not_tracking);
    }

    private void buildNotification() {
        mNotificationManager = (NotificationManager) getSystemService(NOTIFICATION_SERVICE);
        PendingIntent resultPendingIntent = PendingIntent.getActivity(this, 0,
                new Intent(this, TrackerActivity.class), PendingIntent.FLAG_UPDATE_CURRENT);
        mNotificationBuilder = new NotificationCompat.Builder(this)
                .setSmallIcon(R.drawable.bus_white)
                .setColor(getColor(R.color.colorPrimary))
                .setContentTitle(getString(R.string.app_name))
                .setOngoing(true)
                .setContentIntent(resultPendingIntent);
        startForeground(FOREGROUND_SERVICE_ID, mNotificationBuilder.build());
    }

    /**
     * Sets the current status message (connecting/tracking/not tracking).
     */
    private void setStatusMessage(int stringId) {

        mNotificationBuilder.setContentText(getString(stringId));
        mNotificationManager.notify(NOTIFICATION_ID, mNotificationBuilder.build());

        // Also display the status message in the activity.
        Intent intent = new Intent(STATUS_INTENT);
        intent.putExtra(getString(R.string.status), stringId);
        LocalBroadcastManager.getInstance(this).sendBroadcast(intent);
    }

}
