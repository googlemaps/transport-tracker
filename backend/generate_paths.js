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

/*eslint-disable no-shadow-global, unknown-require, no-undef-expression*/
const mapsApiKey = require('./tracker_configuration.json').mapsApiKey;
const {GTFS} = require('./gtfs');
const gtfs = new GTFS();
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');
const Promise = require('bluebird');
const moment = require('moment');
const polyline = require('@mapbox/polyline');
const fs = require('fs');
const readline = require('readline');

const googleMapsClient = require('@google/maps').createClient({
  key: mapsApiKey,
  Promise
});

function generate_paths() {
  const trips = _await(gtfs.getTripsOrderedByTime());
  const tripsWithLocations = [];
  trips.forEach((trip, tripIndex) => {
    logProgress(`Processing trip ${tripIndex + 1} of ${trips.length}`);
    const timeCursor = moment(
      `${trip.departure_date} ${trip.departure_time}`,
      'YYYYMMDD HH:mm:ss'
    );
    const tripPoints = [];
    const stopInfo = _await(gtfs.getStopInfoForTrip(trip.trip_id));
    const stops = [];
    stopInfo.forEach(stop => {
      stops.push({lat: stop.lat, lng: stop.lng});
    });
    const request = {origin: stops[0], destination: stops[stops.length - 1]};
    if (stops.length > 2) {
      request['waypoints'] = stops.slice(1, -1);
    }
    var response = _await(googleMapsClient.directions(request).asPromise())
      .json;
    if (response.status === 'OK') {
      const route = response.routes[0];
      route.legs.forEach(leg => {
        leg.steps.forEach(step => {
          const durationInSeconds = step.duration.value;
          const points = polyline.decode(step.polyline.points);
          const secondsPerPoint = durationInSeconds / points.length;
          points.forEach(point => {
            tripPoints.push({
              time: timeCursor.format('YYYYMMDD HH:mm:ss'),
              location: {lat: point[0], lng: point[1]}
            });
            timeCursor.add(secondsPerPoint, 'seconds');
          });
        });
      });
      tripsWithLocations.push({trip: trip, points: tripPoints});
    } else {
      console.log('ERROR');
    }
  });
  fs.writeFileSync('paths.json', JSON.stringify(tripsWithLocations, null, 2));
  logProgress('Paths written successfully to paths.json.');
  process.stdout.write('\n');
}

function logProgress(str) {
  // A little bit of readline magic to not fill the screen with progress messages.
  readline.clearLine(process.stdout, 0);
  readline.cursorTo(process.stdout, 0, null);
  process.stdout.write(str);
}

_async(() => {
  generate_paths();
})().catch(err => {
  console.error(err);
});
