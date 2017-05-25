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

/* eslint-disable unknown-require */
const moment = require('moment-timezone');
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');

const DATE_FORMAT = 'YYYYMMDD HH:mm:ss';

// TimeTable listens for updates on `timeRef`, and then publishes updated
// time table information on `panelsRef`, using `gtfs` as a source of
// next trips, `panelConfig` for the grouping of routes to panels, and
// `googleMapsClient` to access Directions API for Predicted Travel Times.
exports.TimeTable = class {
  constructor(timeRef, panelsRef, gtfs, panelConfig, googleMapsClient) {
    this.timeRef = timeRef;
    this.panelsRef = panelsRef;
    this.gtfs = gtfs;
    this.panelConfig = panelConfig;
    this.googleMapsClient = googleMapsClient;

    // Cache of Predicted Travel Times
    this.pttForTrip = {};
    // When we last issued a Predicted Travel Time request for a route.
    this.pttLookupTime = {};

    this.timeRef.on(
      'value',
      snapshot => {
        _async(() => {
          const now = moment.utc(snapshot.val().moment);
          this.publishTimeTables(now);
        })().catch(err => {
          console.error(err);
        });
      },
      errorObject => {
        console.error('The read failed: ' + errorObject.code);
      }
    );
  }

  publishTimeTables(now) {
    const panels = _await(
      this.panelConfig.map(panel => {
        return {
          left: _await(
            panel.routesGroups[0].map(route_id => {
              return this.tripsLookup(route_id, now);
            })
          ),
          right: _await(
            panel.routesGroups[1].map(route_id => {
              return this.tripsLookup(route_id, now);
            })
          )
        };
      })
    );
    this.panelsRef.set(panels);
  }

  tripLookup(trip) {
    const stop_info = _await(this.gtfs.getStopInfoForTrip(trip.trip_id));
    return {trip, stop_info};
  }

  haveDirectionsResponseCachedForTrip(trip) {
    return this.directionsResponseForTrip(trip) !== undefined;
  }

  directionsResponseForTrip(trip) {
    return this.pttForTrip[trip.trip_id];
  }

  tripsLookup(route_id, now) {
    function round_moment(m) {
      if (m.second() > 30) {
        return m.add(1, 'minute').startOf('minute');
      }
      return m.startOf('minute');
    }

    const date = now.tz('America/Los_Angeles').format('YYYYMMDD');
    const time = now.tz('America/Los_Angeles').format('HH:mm:ss');
    const route = _await(this.gtfs.getRouteById(route_id));
    const nextTrips = _await(
      this.gtfs.getNextThreeTripsForRoute(route_id, date, time)
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
        const time = moment.tz(
          `${next_trip.stop_info[0].date} ${next_trip.stop_info[0].departure_time}`,
          DATE_FORMAT,
          'America/Los_Angeles'
        );
        let index = 1;
        ptt.routes[0].legs.forEach(leg => {
          const delta = leg.duration.value;
          time.add(delta, 'seconds');
          const time_display = round_moment(time).format('HH:mm:ss');
          next_trip.stop_info[index].departure_time = time_display;
          next_trip.stop_info[index].arrival_time = time_display;
          // Assume we stop at each way point for three minutes
          time.add(3, 'minutes');
          index++;
        });
      }
      const next_trip_time_str = `${next_trip.stop_info[0].date} ${next_trip.stop_info[0].departure_time}`;
      const next_trip_time = moment.tz(
        next_trip_time_str,
        DATE_FORMAT,
        'America/Los_Angeles'
      );
      const next_trip_delta = next_trip_time.diff(now, 'minutes');
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

          const trip_after_time = moment.tz(
            `${trip_after.stop_info[0].date} ${trip_after.stop_info[0].departure_time}`,
            DATE_FORMAT,
            'America/Los_Angeles'
          );
          returnValue['next_in_label'] = 'Next in';
          const trip_after_delta = trip_after_time.diff(now, 'minutes');
          if (trip_after_delta <= 120) {
            returnValue['next_in'] = `${trip_after_delta} min`;
          } else {
            returnValue[
              'next_in'
            ] = `${trip_after_time.diff(now, 'hours')} hrs`;
          }
        }
      } else {
        returnValue['leaving_in_label'] = next_trip_time.format('MMM Do');
        returnValue['leaving_in'] = next_trip_time.format('h A');
      }
    }
    return returnValue;
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
      (this.pttForTrip[trip.trip_id] === undefined &&
        moment().diff(this.pttLookupTime[trip.trip_id], 'minutes') > 3)
    ) {
      this.pttLookupTime[trip.trip_id] = moment();
      const request = this.requestDirectionsForTrip(trip);
      if (
        this.pttLookupFailure == undefined ||
        moment().diff(this.pttLookupFailure, 'minutes') > 20
      ) {
        const initiatedAt = moment();
        this.googleMapsClient
          .directions(request)
          .asPromise()
          .then(response => {
            this.pttForTrip[trip.trip_id] = response.json;
          })
          .catch(err => {
            this.pttLookupFailure = moment();
            console.error(
              `Google Maps Directions API request failed, initiated at ${initiatedAt.format('hh:mm a')}: ${err}`
            );
          });
      } else {
        console.log(
          `Not looking up ${trip.trip_id}, rate limiting due to API error, at ${moment().format('hh:mm a')}`
        );
      }
    }
  }
};
