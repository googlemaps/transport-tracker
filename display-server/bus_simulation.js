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

const moment = require('moment');
const paths = require('./paths.json');

const DATE_FORMAT = 'YYYYMMDD HH:mm:ss';

function getBusesActiveAt(time) {
  const buses = [];
  paths.forEach(bus => {
    const start = moment.utc(bus.points[0].time, DATE_FORMAT);
    const end = moment.utc(bus.points[bus.points.length - 1].time, DATE_FORMAT);
    if (start.isBefore(time) && end.isAfter(time)) {
      buses.push(bus);
    }
  });
  return buses;
}

function getBusPositionsAt(time) {
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
      } else {
        return search(bus, before, midpoint);
      }
    } else {
      const beforeTime = moment.utc(bus.points[before].time, DATE_FORMAT);
      const afterTime = moment.utc(bus.points[after].time, DATE_FORMAT);
      const proportion = time.diff(beforeTime) / afterTime.diff(beforeTime);
      return interpolate(
        bus.points[before].location,
        bus.points[after].location,
        proportion
      );
    }
  }

  const busPositions = [];
  getBusesActiveAt(time).forEach(bus => {
    const location = search(bus, 0, bus.points.length - 1);
    busPositions.push({trip: bus.trip, location});
  });
  return busPositions;
}

exports.getBusesActiveAt = getBusesActiveAt;
exports.getBusPositionsAt = getBusPositionsAt;
