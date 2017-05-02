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

import android.Manifest;
import android.app.ActivityManager;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.DialogInterface;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.location.LocationManager;
import android.net.Uri;
import android.os.Bundle;
import android.os.PowerManager;
import android.provider.Settings;
import android.support.design.widget.Snackbar;
import android.support.v4.app.ActivityCompat;
import android.support.v4.content.ContextCompat;
import android.support.v4.content.LocalBroadcastManager;
import android.support.v7.app.AlertDialog;
import android.support.v7.app.AppCompatActivity;
import android.support.v7.widget.SwitchCompat;
import android.text.method.PasswordTransformationMethod;
import android.view.Menu;
import android.view.MenuItem;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;
import android.widget.Toast;

public class TrackerActivity extends AppCompatActivity {

    private static final int PERMISSIONS_REQUEST = 1;
    private static String[] PERMISSIONS_REQUIRED = new String[]{
            Manifest.permission.ACCESS_FINE_LOCATION, Manifest.permission.WRITE_EXTERNAL_STORAGE};

    private SharedPreferences mPrefs;

    private Button mStartButton;
    private EditText mTransportIdEditText;
    private EditText mEmailEditText;
    private EditText mPasswordEditText;
    private SwitchCompat mSwitch;
    private Snackbar mSnackbarPermissions;
    private Snackbar mSnackbarGps;

    /**
     * Configures UI elements, and starts validation if inputs have previously been entered.
     */
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.content_main);

        mStartButton = (Button) findViewById(R.id.button_start);
        mStartButton.setOnClickListener(new View.OnClickListener() {
            public void onClick(View v) {
                checkInputFields();
            }
        });

        mTransportIdEditText = (EditText) findViewById(R.id.transport_id);
        mEmailEditText = (EditText) findViewById(R.id.email);
        mPasswordEditText = (EditText) findViewById(R.id.password);

        mPrefs = getSharedPreferences(getString(R.string.prefs), MODE_PRIVATE);
        String transportID = mPrefs.getString(getString(R.string.transport_id), "");
        String email = mPrefs.getString(getString(R.string.email), "");
        String password = mPrefs.getString(getString(R.string.password), "");

        mTransportIdEditText.setText(transportID);
        mEmailEditText.setText(email);
        mPasswordEditText.setText(password);

        if (isServiceRunning(TrackerService.class)) {
            // If service already running, simply update UI.
            setTrackingStatus(R.string.tracking);
        } else if (transportID.length() > 0 && email.length() > 0 && password.length() > 0) {
            // Inputs have previously been stored, start validation.
            checkLocationPermission();
        } else {
            // First time running - check for inputs pre-populated from build.
            mTransportIdEditText.setText(getString(R.string.build_transport_id));
            mEmailEditText.setText(getString(R.string.build_email));
            mPasswordEditText.setText(getString(R.string.build_password));
        }

    }

    private boolean isServiceRunning(Class<?> serviceClass) {
        ActivityManager manager = (ActivityManager) getSystemService(Context.ACTIVITY_SERVICE);
        for (ActivityManager.RunningServiceInfo service : manager.getRunningServices(Integer.MAX_VALUE)) {
            if (serviceClass.getName().equals(service.service.getClassName())) {
                return true;
            }
        }
        return false;
    }

    private void setTrackingStatus(int status) {
        boolean tracking = status == R.string.tracking;
        mTransportIdEditText.setEnabled(!tracking);
        mEmailEditText.setEnabled(!tracking);
        mPasswordEditText.setEnabled(!tracking);
        mStartButton.setVisibility(tracking ? View.INVISIBLE : View.VISIBLE);
        if (mSwitch != null) {
            // Initial broadcast may come before menu has been initialized.
            mSwitch.setChecked(tracking);
        }
        ((TextView) findViewById(R.id.title)).setText(getString(status));
    }

    /**
     * Receives status messages from the tracking service.
     */
    private BroadcastReceiver mMessageReceiver = new BroadcastReceiver() {
        @Override
        public void onReceive(Context context, Intent intent) {
            setTrackingStatus(intent.getIntExtra(getString(R.string.status), 0));
        }
    };

    @Override
    protected void onResume() {
        super.onResume();
        LocalBroadcastManager.getInstance(this).registerReceiver(mMessageReceiver,
                new IntentFilter(TrackerService.STATUS_INTENT));
    }

    @Override
    protected void onPause() {
        LocalBroadcastManager.getInstance(this).unregisterReceiver(mMessageReceiver);
        super.onPause();
    }

    /**
     * First validation check - ensures that required inputs have been
     * entered, and if so, store them and runs the next check.
     */
    private void checkInputFields() {
        if (mTransportIdEditText.length() == 0 || mEmailEditText.length() == 0 ||
                mPasswordEditText.length() == 0) {
            Toast.makeText(TrackerActivity.this, R.string.missing_inputs, Toast.LENGTH_SHORT).show();
        } else {
            // Store values.
            SharedPreferences.Editor editor = mPrefs.edit();
            editor.putString(getString(R.string.transport_id), mTransportIdEditText.getText().toString());
            editor.putString(getString(R.string.email), mEmailEditText.getText().toString());
            editor.putString(getString(R.string.password), mPasswordEditText.getText().toString());
            editor.apply();
            // Validate permissions.
            checkLocationPermission();
            mSwitch.setEnabled(true);
        }
    }

    /**
     * Second validation check - ensures the app has location permissions, and
     * if not, requests them, otherwise runs the next check.
     */
    private void checkLocationPermission() {
        int locationPermission = ContextCompat.checkSelfPermission(this,
                Manifest.permission.ACCESS_FINE_LOCATION);
        int storagePermission = ContextCompat.checkSelfPermission(this,
                Manifest.permission.WRITE_EXTERNAL_STORAGE);
        if (locationPermission != PackageManager.PERMISSION_GRANTED
                || storagePermission != PackageManager.PERMISSION_GRANTED) {
            ActivityCompat.requestPermissions(this, PERMISSIONS_REQUIRED, PERMISSIONS_REQUEST);
        } else {
            checkGpsEnabled();
        }
    }

    /**
     * Third and final validation check - ensures GPS is enabled, and if not, prompts to
     * enable it, otherwise all checks pass so start the location tracking service.
     */
    private void checkGpsEnabled() {
        LocationManager lm = (LocationManager) getSystemService(LOCATION_SERVICE);
        if (!lm.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
            reportGpsError();
        } else {
            resolveGpsError();
            startLocationService();
        }
    }

    /**
     * Callback for location permission request - if successful, run the GPS check.
     */
    @Override
    public void onRequestPermissionsResult(int requestCode, String[] permissions, int[]
            grantResults) {
        if (requestCode == PERMISSIONS_REQUEST) {
            // We request storage perms as well as location perms, but don't care
            // about the storage perms - it's just for debugging.
            for (int i = 0; i < permissions.length; i++) {
                if (permissions[i].equals(Manifest.permission.ACCESS_FINE_LOCATION)) {
                    if (grantResults[i] != PackageManager.PERMISSION_GRANTED) {
                        reportPermissionsError();
                    } else {
                        resolvePermissionsError();
                        checkGpsEnabled();
                    }
                }
            }
        }
    }

    private void startLocationService() {
        // Before we start the service, confirm that we have extra power usage privileges.
        PowerManager pm = (PowerManager) getSystemService(POWER_SERVICE);
        Intent intent = new Intent();
        if (!pm.isIgnoringBatteryOptimizations(getPackageName())) {
            intent.setAction(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS);
            intent.setData(Uri.parse("package:" + getPackageName()));
            startActivity(intent);
        }
        startService(new Intent(this, TrackerService.class));
    }

    private void stopLocationService() {
        stopService(new Intent(this, TrackerService.class));
    }

    @Override
    public boolean onCreateOptionsMenu(Menu menu) {
        // Inflate the menu; this adds items to the action bar if it is present.
        getMenuInflater().inflate(R.menu.main_activity, menu);

        // Get the action view used in your toggleservice item
        final MenuItem toggle = menu.findItem(R.id.menu_switch);
        mSwitch = (SwitchCompat) toggle.getActionView().findViewById(R.id.switchInActionBar);
        mSwitch.setEnabled(mTransportIdEditText.length() > 0 && mEmailEditText.length() > 0 &&
                mPasswordEditText.length() > 0);
        mSwitch.setChecked(mStartButton.getVisibility() != View.VISIBLE);
        mSwitch.setOnClickListener(new View.OnClickListener() {
            @Override
            public void onClick(View v) {
                if (((SwitchCompat) v).isChecked()) {
                    checkInputFields();
                } else {
                    confirmStop();
                }
            }
        });
        return super.onCreateOptionsMenu(menu);
    }

    private void confirmStop() {
        mSwitch.setChecked(true);
        new AlertDialog.Builder(this)
                .setMessage(getString(R.string.confirm_stop))
                .setIcon(android.R.drawable.ic_dialog_alert)
                .setPositiveButton(android.R.string.yes, new DialogInterface.OnClickListener() {
                    public void onClick(DialogInterface dialog, int whichButton) {
                        mSwitch.setChecked(false);
                        mTransportIdEditText.setEnabled(true);
                        mEmailEditText.setEnabled(true);
                        mPasswordEditText.setEnabled(true);
                        mStartButton.setVisibility(View.VISIBLE);
                        stopLocationService();
                    }})
                .setNegativeButton(android.R.string.no, null).show();
    }

    private void reportPermissionsError() {
        if (mSwitch != null) {
            mSwitch.setChecked(false);
        }
        Snackbar snackbar = Snackbar
                .make(
                        findViewById(R.id.rootView),
                        getString(R.string.location_permission_required),
                        Snackbar.LENGTH_INDEFINITE)
                .setAction(R.string.enable, new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        Intent intent = new Intent(android.provider.Settings
                                .ACTION_APPLICATION_DETAILS_SETTINGS);
                        intent.setData(Uri.parse("package:" + getPackageName()));
                        startActivity(intent);
                    }
                });

        // Changing message text color
        snackbar.setActionTextColor(Color.RED);

        // Changing action button text color
        View sbView = snackbar.getView();
        TextView textView = (TextView) sbView.findViewById(
                android.support.design.R.id.snackbar_text);
        textView.setTextColor(Color.YELLOW);
        snackbar.show();
    }

    private void resolvePermissionsError() {
        if (mSnackbarPermissions != null) {
            mSnackbarPermissions.dismiss();
            mSnackbarPermissions = null;
        }
    }

    private void reportGpsError() {
        if (mSwitch != null) {
            mSwitch.setChecked(false);
        }
        Snackbar snackbar = Snackbar
                .make(findViewById(R.id.rootView), getString(R.string
                        .gps_required), Snackbar.LENGTH_INDEFINITE)
                .setAction(R.string.enable, new View.OnClickListener() {
                    @Override
                    public void onClick(View view) {
                        startActivity(new Intent(Settings.ACTION_LOCATION_SOURCE_SETTINGS));
                    }
                });

        // Changing message text color
        snackbar.setActionTextColor(Color.RED);

        // Changing action button text color
        View sbView = snackbar.getView();
        TextView textView = (TextView) sbView.findViewById(android.support.design.R.id
                .snackbar_text);
        textView.setTextColor(Color.YELLOW);
        snackbar.show();

    }

    private void resolveGpsError() {
        if (mSnackbarGps != null) {
            mSnackbarGps.dismiss();
            mSnackbarGps = null;
        }
    }
}
