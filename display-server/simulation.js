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

// Configurables
// TODO: Add Google Maps API Key here
const mapsApiKey = 'YOUR_API_KEY';

const gtfs = require('./gtfs');
const config = require('./panels_config.json');
const bus_simulation = require('./bus_simulation');
const moment = require('moment');
const Promise = require('bluebird');
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');
const googleMapsClient = require('@google/maps').createClient({
  key: mapsApiKey,
  Promise
});
const DATE_FORMAT = 'YYYYMMDD HH:mm:ss';

class Simulation {
  constructor(timeRef, mapRef, panelsRef, busLocationsRef) {
    this.simulationTime = moment.utc('2016-05-18 06:00', DATE_FORMAT);
    this.endOfSimulation = moment.utc('2016-05-20 18:00', DATE_FORMAT);
    this.panelIndex = 0;
    this.timeRef = timeRef;
    this.mapRef = mapRef;
    this.panelsRef = panelsRef;
    this.busLocationsRef = busLocationsRef;
    this.pttForTrip = {};
    this.pttLookupTime = {};
  }

  startSimulation() {
    this.timeTimerId = setInterval(
      () => {
        _async(() => {
          this.timeAdvance();
        })().catch(err => {
          console.error(err);
        });
      },
      1000
    );
    this.panelTimerId = setInterval(
      () => {
        this.panelAdvance();
      },
      10000
    );
    this.busTimerId = setInterval(
      () => {
        _async(() => {
          this.busAdvance();
        })().catch(err => {
          console.error(err);
        });
      },
      1000
    );

    // Set initial state in Firebase
    this.timeAdvance();
    this.panelAdvance();
    this.busAdvance();
  }

  stopSimulation() {
    clearInterval(this.timeTimerId);
    clearInterval(this.panelTimerId);
    clearInterval(this.busTimerId);
    this.timeTimerId = null;
    this.panelTimerId = null;
    this.busTimerId = null;
  }

  _flatten(arrays) {
    return [].concat.apply([], arrays);
  }

  busAdvance() {
    const buses = bus_simulation.getBusPositionsAt(this.simulationTime);
    const busLocations = {};
    buses.forEach(bus => {
      const route = _await(gtfs.getRouteById(bus.trip.route_id));
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

  tripLookup(trip) {
    const stop_info = _await(gtfs.getStopInfoForTrip(trip.trip_id));
    return {trip, stop_info};
  }

  requestDirectionsForTrip(trip) {
    const trip_info = this.tripLookup(trip);
    const stops = [];
    trip_info.stop_info.forEach(stop => {
      stops.push({lat: stop.lat, lng: stop.lng});
    });
    const request = {origin: stops[0], destination: stops[stops.length - 1]};
    if (stops.length > 2) {
      request['waypoints'] = stops.slice(1, -1);
    }
    return request;
  }

  cacheDirectionsResponseForTrip(trip) {
    if (
      this.pttLookupTime[trip.trip_id] === undefined ||
        moment().diff(this.pttLookupTime[trip.trip_id], 'minutes') > 20 ||
        this.pttForTrip[trip.trip_id] === undefined &&
          moment().diff(this.pttLookupTime[trip.trip_id], 'minutes') > 3
    ) {
      this.pttLookupTime[trip.trip_id] = moment();
      const request = this.requestDirectionsForTrip(trip);
      if (
        this.pttLookupFailure == undefined ||
          moment().diff(this.pttLookupFailure, 'minutes') > 20
      ) {
        const initiatedAt = moment();
        googleMapsClient
          .directions(request)
          .asPromise()
          .then(response => {
            this.pttForTrip[trip.trip_id] = response.json;
          })
          .catch(err => {
            this.pttLookupFailure = moment();
            console.error(
              `Google Maps Directions API request failed, initiated at ${initiatedAt.format(
                'hh:mm a'
              )}: ${err}`
            );
          });
      } else {
        console.log(
          `Not looking up ${trip.trip_id}, rate limiting due to API error, at ${moment().format(
            'hh:mm a'
          )}`
        );
      }
    }
  }

  haveDirectionsResponseCachedForTrip(trip) {
    return this.directionsResponseForTrip(trip) !== undefined;
  }

  directionsResponseForTrip(trip) {
    return this.pttForTrip[trip.trip_id];
  }

  tripsLookup(route_id) {
    const date = this.simulationTime.format('YYYYMMDD');
    const time = this.simulationTime.format('HH:mm:ss');
    const route = _await(gtfs.getRouteById(route_id));
    const nextTrips = _await(
      gtfs.getNextThreeTripsForRoute(route_id, date, time)
    );

    nextTrips.forEach(trip => {
      this.cacheDirectionsResponseForTrip(trip);
    });

    const returnValue = {route, next_in_label: '', next_in: ''};
    if (nextTrips.length >= 1) {
      const next_trip = _await(this.tripLookup(nextTrips[0]));
      returnValue.next_trip = next_trip;
      if (
        this.haveDirectionsResponseCachedForTrip(returnValue.next_trip.trip)
      ) {
        const ptt = this.directionsResponseForTrip(returnValue.next_trip.trip);
        const time = moment.utc(
          `${next_trip.stop_info[0].date} ${next_trip.stop_info[
            0
          ].departure_time}`,
          DATE_FORMAT
        );
        let index = 1;
        ptt.routes[0].legs.forEach(leg => {
          const delta = leg.duration.value;
          time.add(delta, 'seconds');
          next_trip.stop_info[index].departure_time = time.format('HH:mm:ss');
          next_trip.stop_info[index].arrival_time = time.format('HH:mm:ss');
          // Assume we stop at each way point for three minutes
          time.add(3, 'minutes');
          index++;
        });
      }
      const next_trip_time_str = `${next_trip.stop_info[
        0
      ].date} ${next_trip.stop_info[0].departure_time}`;
      const next_trip_time = moment.utc(next_trip_time_str, DATE_FORMAT);
      const next_trip_delta = next_trip_time.diff(
        this.simulationTime,
        'minutes'
      );
      if (next_trip_delta <= 120) {
        returnValue['leaving_in_label'] = 'Leaving in';
        returnValue['leaving_in'] = `${next_trip_delta} mins`;
        if (nextTrips.length >= 2) {
          let trip_after = _await(this.tripLookup(nextTrips[1]));

          // In the mornings we have a bunch of overlapping trips on inbound routes
          if (
            trip_after.stop_info[0].date === next_trip.stop_info[0].date &&
              trip_after.stop_info[0].departure_time ===
                next_trip.stop_info[0].departure_time
          ) {
            trip_after = _await(this.tripLookup(nextTrips[2]));
          }

          const trip_after_time = moment.utc(
            `${trip_after.stop_info[0].date} ${trip_after.stop_info[
              0
            ].departure_time}`,
            DATE_FORMAT
          );
          returnValue['next_in_label'] = 'Next in';
          const trip_after_delta = trip_after_time.diff(
            this.simulationTime,
            'minutes'
          );
          if (trip_after_delta <= 120) {
            returnValue['next_in'] = `${trip_after_delta} min`;
          } else {
            returnValue['next_in'] = `${trip_after_time.diff(
              this.simulationTime,
              'hours'
            )} hrs`;
          }
        }
      } else {
        returnValue['leaving_in_label'] = next_trip_time.format('MMM Do');
        returnValue['leaving_in'] = next_trip_time.format('h A');
      }
    }
    return returnValue;
  }

  timeAdvance() {
    this.timeRef.set(this.simulationTime.format('h:mm A, MMM Do'));
    const panels = _await(
      config.map(panel => {
        return {
          left: _await(
            panel.routesGroups[0].map(route_id => {
              return this.tripsLookup(route_id);
            })
          ),
          right: _await(
            panel.routesGroups[1].map(route_id => {
              return this.tripsLookup(route_id);
            })
          )
        };
      })
    );
    this.panelsRef.set(panels);

    this.simulationTime = this.simulationTime.add(30, 'seconds');
    if (this.simulationTime.diff(this.endOfSimulation, 'minutes') > 0) {
      // Reset simulation to start once we run out of bus trips.
      this.simulationTime = moment.utc('2016-05-18 06:00', DATE_FORMAT);
    }
  }

  panelAdvance() {
    this.mapRef.set(config[this.panelIndex]);
    this.panelIndex = (this.panelIndex + 1) % config.length;
  }
}

exports.Simulation = Simulation;
