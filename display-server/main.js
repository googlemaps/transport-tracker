/*
 * Copyright 2017 Google Inc. All rights reserved.
 *
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this
 * file except in compliance with the License. You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF
 * ANY KIND, either express or implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

// TODO: configure this to be your Firebase Real Time database URL
const databaseURL = '';

const admin = require('firebase-admin');
const Simulation = require('./simulation').Simulation;
const _async = require('asyncawait/async');

const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL
});

const mapRef = admin.database().ref('map');
const timeRef = admin.database().ref('current-time');
const panelsRef = admin.database().ref('panels');
const busLocationsRef = admin.database().ref('bus-locations');

const simulation = new Simulation(timeRef, mapRef, panelsRef, busLocationsRef);
_async(() => {
  simulation.startSimulation();
})().catch(err => {
  console.error(err);
});
