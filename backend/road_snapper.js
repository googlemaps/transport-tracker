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

/* eslint-disable no-undef-expression */
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');

const TRIP_HISTORY_LENGTH = 20;

exports.RoadSnapper = class {
  constructor(
    timeRef,
    rawBusLocationsRef,
    snappedBusLocationsRef,
    googleMapsClient
  ) {
    this.snappedBusLocationsRef = snappedBusLocationsRef;
    this.googleMapsClient = googleMapsClient;
    this.history = {};
    this.snapped = {};
    this.val = null;
    this.time = null;

    timeRef.on('value', snapshot => {
      this.time = snapshot.val();
    });

    rawBusLocationsRef.on('value', snapshot => {
      const val = snapshot.val();
      this.gatherHistory(val);
    });

    // Snap to roads every ten seconds
    this.timeTimerId = setInterval(() => {
      _async(() => {
        this.snapToRoads();
      })().catch(err => {
        console.error(err);
      });
    }, 10000);
  }

  gatherHistory(val) {
    this.val = val;
    if (val && this.time) {
      const tripnames = new Set(Object.keys(val));

      Object.keys(this.history).forEach(historicTripname => {
        if (!tripnames.has(historicTripname)) {
          delete this.history[historicTripname];
        }
      });

      tripnames.forEach(tripname => {
        if (!this.history[tripname]) {
          this.history[tripname] = [];
        }

        const point = {
          lat: val[tripname].lat,
          lng: val[tripname].lng,
          moment: this.time.moment
        };

        this.history[tripname].push(point);

        if (this.history[tripname].length > TRIP_HISTORY_LENGTH) {
          this.history[tripname] = this.history[tripname].slice(
            -TRIP_HISTORY_LENGTH
          );
        }
      });
    }
  }

  snapToRoads() {
    // Work around concurrency issues by taking a snapshot of val
    const valSnapshot = this.val;
    if (valSnapshot && this.time) {
      const tripnames = new Set(Object.keys(valSnapshot));

      Object.keys(this.snapped).forEach(snappedTripname => {
        if (!tripnames.has(snappedTripname)) {
          delete this.snapped[snappedTripname];
        }
      });

      tripnames.forEach(tripname => {
        if (this.history.hasOwnProperty(tripname)) {
          const path = this.history[tripname].map(point => {
            return [point.lat, point.lng];
          });
          const result = _await(
            this.googleMapsClient.snapToRoads({path}).asPromise()
          );
          if (result.json.snappedPoints) {
            this.snapped[tripname] =
              result.json.snappedPoints[
                result.json.snappedPoints.length - 1
              ].location;
          } else {
            console.error(result);
            this.snapped[tripname] = {};
          }
        } else {
          this.snapped[tripname] = {};
        }
      });

      let snappedBusPositions = {};
      tripnames.forEach(tripname => {
        snappedBusPositions[tripname] = {
          lat: this.snapped.hasOwnProperty(tripname) &&
            this.snapped[tripname].latitude
            ? this.snapped[tripname].latitude
            : valSnapshot[tripname].lat,
          lng: this.snapped.hasOwnProperty(tripname) &&
            this.snapped[tripname].longitude
            ? this.snapped[tripname].longitude
            : valSnapshot[tripname].lng,
          route_color: valSnapshot[tripname].route_color,
          route_id: valSnapshot[tripname].route_id,
          route_name: valSnapshot[tripname].route_name
        };
      });

      this.snappedBusLocationsRef.set(snappedBusPositions);
    } else {
      // If valSnapshot is empty, we have no buses on the road.
      this.snappedBusLocationsRef.set({});
    }
  }
};