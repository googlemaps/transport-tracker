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
const moment = require('moment');
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');

const DATE_FORMAT = 'YYYYMMDD HH:mm:ss';

// BusSimulator updates the simulated location of the buses
// every time `timeRef` changes. This uses a combination of the
// generated paths along with route information pulled from `gtfs`.
// The updated simulated bus locations is published to `busLocationsRef`.
exports.BusSimulator = class {
  constructor(timeRef, gtfs, busLocationsRef, generatedPaths) {
    this.timeRef = timeRef;
    this.gtfs = gtfs;
    this.busLocationsRef = busLocationsRef;
    this.paths = generatedPaths;

    this.timeRef.on(
      'value',
      snapshot => {
        _async(() => {
          const now = moment.utc(snapshot.val().moment);
          this.busAdvance(now);
        })().catch(err => {
          console.error(err);
        });
      },
      errorObject => {
        console.error('The read failed: ' + errorObject.code);
      }
    );
  }

  busAdvance(now) {
    const buses = this.getBusPositionsAt(now);
    const busLocations = {};
    buses.forEach(bus => {
      const route = _await(this.gtfs.getRouteById(bus.trip.route_id));
      busLocations[`Trip_${bus.trip.trip_id}`] = {
        route_id: bus.trip.route_id,
        route_name: route.route_long_name,
        route_color: route.route_color,
        lat: bus.location.lat,
        lng: bus.location.lng
      };
    });
    this.busLocationsRef.set(busLocations);
  }

  getBusPositionsAt(time) {
    function interpolate(before, after, proportion) {
      return {
        lat: before.lat * proportion + after.lat * (1 - proportion),
        lng: before.lng * proportion + after.lng * (1 - proportion)
      };
    }

    function search(bus, before, after) {
      if (after - before > 1) {
        const midpoint = Math.round(before + (after - before) / 2);
        const midpointTime = moment.utc(bus.points[midpoint].time, DATE_FORMAT);
        if (midpointTime.isBefore(time)) {
          return search(bus, midpoint, after);
        }
        return search(bus, before, midpoint);
      }
      const beforeTime = moment.utc(bus.points[before].time, DATE_FORMAT);
      const afterTime = moment.utc(bus.points[after].time, DATE_FORMAT);
      const proportion = time.diff(beforeTime) / afterTime.diff(beforeTime);
      return interpolate(
        bus.points[before].location,
        bus.points[after].location,
        proportion
      );
    }

    const busPositions = [];
    this.getBusesActiveAt(time).forEach(bus => {
      busPositions.push({
        trip: bus.trip,
        location: search(bus, 0, bus.points.length - 1)
      });
    });
    return busPositions;
  }

  getBusesActiveAt(time) {
    const buses = [];
    this.paths.forEach(bus => {
      const start = moment.utc(bus.points[0].time, DATE_FORMAT);
      const end = moment.utc(
        bus.points[bus.points.length - 1].time,
        DATE_FORMAT
      );
      if (start.isBefore(time) && end.isAfter(time)) {
        buses.push(bus);
      }
    });
    return buses;
  }
};
