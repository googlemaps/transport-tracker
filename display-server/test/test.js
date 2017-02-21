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

const assert = require('assert');
const moment = require('moment');
const Promise = require('bluebird');
const gtfs = require('../gtfs');
const _async = require('asyncawait/async');
const _await = require('asyncawait/await');
const googleMapsClient = require('@google/maps').createClient({
  // TODO: Add Google Maps API Key here
  key: 'YOUR_API_KEY',
  Promise
});
const Simulation = require('../simulation').Simulation;
const bus_simulation = require('../bus_simulation');

// Google Maps Client usage testing
const stop = {
  stop_lat: 37.394109,
  stop_lon: -122.076628,
  stop_name: 'Mountain View Caltrain Station',
  stop_id: 21,
  location_type: 0
};

describe('GoogleMapsClient', () => {
  describe('#reverseGeocode', () => {
    it(
      'should return a formatted address for MTV CalTrain lat/lng',
      _async(() => {
        const response = _await(
          googleMapsClient
            .reverseGeocode({latlng: {lat: stop.stop_lat, lng: stop.stop_lon}})
            .asPromise()
        );
        assert.equal(
          '600-698 W Evelyn Ave, Mountain View, CA 94041, USA',
          response.json.results[0].formatted_address
        );
      })
    );
  });
});

// GTFS tests
describe('GTFS', () => {
  describe('#getCalendarDates', () => {
    it(
      'should return a list of calendar dates',
      _async(() => {
        const calendarDates = _await(gtfs.getCalendarDates());
        assert.equal(4, calendarDates.length);
        assert.equal(0, calendarDates[0].service_id);
        assert.equal(20160517, calendarDates[0].date);
        assert.equal(3, calendarDates[3].service_id);
        assert.equal(20160520, calendarDates[3].date);
      })
    );
  });

  describe('#getCalendarDateById', () => {
    it(
      'should return a specific calendar date',
      _async(() => {
        const calendarDate = _await(gtfs.getCalendarDateById(1));
        assert.equal(1, calendarDate.service_id);
        assert.equal(20160518, calendarDate.date);
      })
    );
  });

  describe('#getCalendarDateByDate', () => {
    it(
      'should return a calendar date specified by date string',
      _async(() => {
        const date = '20160518';
        const calendarDate = _await(gtfs.getCalendarDateByDate(date));
        assert.equal(date, calendarDate.date);
      })
    );
  });

  describe('#getTripsForCalendarDate', () => {
    it(
      '#trips should return the trips for a specific calendar date',
      _async(() => {
        const trips = _await(gtfs.getTripsForCalendarDate('20160518'));
        assert.equal(243, trips.length);
        const trip = trips[0];
        assert.equal(199, trip.trip_id);
        assert.equal(8, trip.route_id);
        assert.equal('To Shoreline', trip.trip_headsign);
      })
    );
  });

  describe('#getRoutes', () => {
    it(
      'should return a list of routes',
      _async(() => {
        const routes = _await(gtfs.getRoutes());
        assert.equal(13, routes.length);
        assert.equal(0, routes[0].route_id);
        assert.equal('Yellow Route', routes[0].route_long_name);
        assert.equal(12, routes[12].route_id);
        assert.equal('San José Airport (SJC)', routes[12].route_long_name);
      })
    );
  });

  describe('#getRouteById', () => {
    it(
      'should return a specific route',
      _async(() => {
        const route = _await(gtfs.getRouteById(10));
        assert.equal(10, route.route_id);
        assert.equal('Millbrae BART', route.route_long_name);
      })
    );
  });

  describe('#getTripsForRouteOrderedByTime', () => {
    it(
      'should return the trips for a specific route',
      _async(() => {
        const route_id = 1;
        const trips = _await(gtfs.getTripsForRouteOrderedByTime(route_id));
        assert.equal(92, trips.length);
        const trip = trips[0];
        assert.equal(691, trip.trip_id);
        assert.equal(1, trip.route_id);
        assert.equal('To Hotel Avante & Grand Hotel', trip.trip_headsign);
      })
    );
  });

  describe('#getStopsForRoute', () => {
    it(
      ' should return a list of stops for a specific route',
      _async(() => {
        const route_id = 1;
        const stops = _await(gtfs.getStopsForRoute(route_id));
        assert.equal(3, stops.length);
        assert.equal('Google I/O', stops[0].stop_name);
        assert.equal(37.4263, stops[0].stop_lat);
        assert.equal(-122.078634, stops[0].stop_lon);
      })
    );
  });

  describe('#getNextThreeTripsForRoute', () => {
    it(
      'should give the next three trips, given a route, a date and a time',
      _async(() => {
        const [date, time] = ['20160518', '08:25:57'];
        const route_id = 0;
        const trips = _await(
          gtfs.getNextThreeTripsForRoute(route_id, date, time)
        );
        assert.equal(3, trips.length);
        const trip0departureTime = _await(
          gtfs.getStopTimesForTrip(trips[0].trip_id)
        )[0].departure_time;
        const trip1departureTime = _await(
          gtfs.getStopTimesForTrip(trips[1].trip_id)
        )[0].departure_time;
        assert.equal(1, trip0departureTime.localeCompare('08:25:57'));
        assert.equal(1, trip1departureTime.localeCompare('08:25:57'));
        assert.equal(-1, trip0departureTime.localeCompare(trip1departureTime));
        assert.equal(route_id, trips[0].route_id);
        assert.equal(route_id, trips[1].route_id);
      })
    );
  });

  describe('#getStops', () => {
    it(
      'should return a list of stops',
      _async(() => {
        const stops = _await(gtfs.getStops());
        assert.equal(22, stops.length);
        assert.equal('Google I/O', stops[0].stop_name);
        assert.equal(37.4263, stops[0].stop_lat);
        assert.equal(-122.078634, stops[0].stop_lon);
      })
    );
  });

  describe('#getStopById', () => {
    it(
      'should return a specific stop',
      _async(() => {
        const stop = _await(gtfs.getStopById(0));
        assert.equal('Google I/O', stop.stop_name);
        assert.equal(37.4263, stop.stop_lat);
        assert.equal(-122.078634, stop.stop_lon);
      })
    );
  });

  describe('#getTripsForStop', () => {
    it(
      'should return the trips for a specific stop',
      _async(() => {
        const trips = _await(gtfs.getTripsForStop(1));
        assert.equal(93, trips.length);
        const trip = trips[0];
        assert.equal(344, trip.trip_id);
        assert.equal(0, trip.route_id);
        assert.equal(
          'To Hilton Harden Inn Palo Alto & Palo Alto Caltrain',
          trip.trip_headsign
        );
      })
    );
  });

  describe('#getStopTimesForStop', () => {
    it(
      'should return the stop times for a specific stop',
      _async(() => {
        const stopTimes = _await(gtfs.getStopTimesForStop(1));
        assert.equal(93, stopTimes.length);
        const stopTime = stopTimes[0];
        assert.equal(0, stopTime.trip_id);
        assert.equal(1, stopTime.stop_id);
        assert.equal('07:00:00', stopTime.arrival_time);
        assert.equal('07:00:00', stopTime.departure_time);
      })
    );
  });

  describe('#getStopTimes', () => {
    it(
      'should return all stop times',
      _async(() => {
        const stopTimes = _await(gtfs.getStopTimes());
        assert.equal(2472, stopTimes.length);
        const stopTime = stopTimes[0];
        assert.equal(0, stopTime.trip_id);
        assert.equal(1, stopTime.stop_id);
        assert.equal('07:00:00', stopTime.arrival_time);
        assert.equal('07:00:00', stopTime.departure_time);
      })
    );
  });

  describe('#getTrips', () => {
    it(
      'should return all trips',
      _async(() => {
        const trips = _await(gtfs.getTrips());
        assert.equal(847, trips.length);
        const trip = trips[0];
        assert.equal(0, trip.trip_id);
        assert.equal(0, trip.route_id);
        assert.equal('To Shoreline', trip.trip_headsign);
      })
    );
  });

  describe('#getTripsOrderedByTime', () => {
    it(
      'should return all trips, ordered by time',
      _async(() => {
        const trips = _await(gtfs.getTripsOrderedByTime());
        assert.equal(847, trips.length);
        const trip = trips[0];
        assert.equal(717, trip.trip_id);
        assert.equal(3, trip.route_id);
        assert.equal(
          'To Cupertino Inn, Courtyard San Jose Cupertino & Hilton Garden Inn Cupertino',
          trip.trip_headsign
        );
      })
    );
  });

  describe('#getTripById', () => {
    it(
      'should return a specific trip',
      _async(() => {
        const trip = _await(gtfs.getTripById(1));
        assert.equal(1, trip.trip_id);
        assert.equal(0, trip.route_id);
        assert.equal('To Shoreline', trip.trip_headsign);
      })
    );
  });

  describe('#getStopTimesForTrip', () => {
    it(
      'should return the stopTimes for a trip',
      _async(() => {
        const trip_id = 100;
        const stopTimes = _await(gtfs.getStopTimesForTrip(trip_id));
        assert.equal(2, stopTimes.length);
        const stopTime = stopTimes[1];
        assert.equal(trip_id, stopTime.trip_id);
      })
    );
  });

  describe('#getStopsForTrip', () => {
    it(
      'should return the stops for a trip',
      _async(() => {
        const trip_id = 100;
        const stops = _await(gtfs.getStopsForTrip(trip_id));
        assert.equal(2, stops.length);
        const stop = stops[1];
        assert.equal(7, stop.stop_id);
      })
    );
  });

  describe('#getTripsInService', () => {
    it(
      'should return trips that are scheduled to be in service at the specified time',
      _async(() => {
        const [date, time] = ['20160518', '08:25:57'];
        const trips = _await(gtfs.getTripsInServiceForRoute(date, time, 0));
        assert.equal(2, trips.length);
        trips.forEach(trip => {
          const stopTimes = _await(gtfs.getStopTimesForTrip(trip.trip_id));
          assert.equal(
            -1,
            stopTimes[0].departure_time.localeCompare('08:25:57')
          );
          assert.equal(
            1,
            stopTimes[stopTimes.length - 1].arrival_time.localeCompare(
              '08:25:57'
            )
          );
        });
      })
    );
  });
});

// Simulation tests
// Simulation depends on a set of firebase Ref objects to publish it's updates to.
class FakeFirebaseRef {
  constructor(val) {
    this.val = val;
  }
  set(val) {
    this.val = val;
  }
}

describe('Simulation', () => {
  describe('#startSimulation', () => {
    it(
      'should set up timers and advance to the first panel',
      _async(() => {
        const timeRef = new FakeFirebaseRef();
        const mapRef = new FakeFirebaseRef();
        const panelsRef = new FakeFirebaseRef();
        const busLocationsRef = new FakeFirebaseRef();
        const simulation = new Simulation(
          timeRef,
          mapRef,
          panelsRef,
          busLocationsRef
        );

        assert.equal(0, simulation.panelIndex);
        _await(simulation.startSimulation());
        assert.notEqual(null, simulation.timeTimerId);
        assert.notEqual(null, simulation.panelTimerId);
        assert.notEqual(null, simulation.busTimerId);
        assert.equal(1, simulation.panelIndex);
        assert.equal(0, mapRef.val.panel);
        simulation.stopSimulation();
        assert.equal(null, simulation.timeTimerId);
        assert.equal(null, simulation.panelTimerId);
        assert.equal(null, simulation.busTimerId);
      })
    );
  });

  describe('#panelAdvance', () => {
    it('should populate mapRef with correct panel state at t0', () => {
      const timeRef = new FakeFirebaseRef();
      const mapRef = new FakeFirebaseRef();
      const panelsRef = new FakeFirebaseRef();
      const busLocationsRef = new FakeFirebaseRef();
      const simulation = new Simulation(
        timeRef,
        mapRef,
        panelsRef,
        busLocationsRef
      );

      assert.equal(0, simulation.panelIndex);
      simulation.panelAdvance();
      assert.equal(1, simulation.panelIndex);
      assert.equal(null, timeRef.val);
      assert.equal(null, panelsRef.val);
      assert.equal(null, busLocationsRef.val);
      assert.equal(0, mapRef.val.panel);
    });
  });

  describe('#timeAdvance', () => {
    it(
      'should advance time',
      _async(() => {
        const timeRef = new FakeFirebaseRef();
        const mapRef = new FakeFirebaseRef();
        const panelsRef = new FakeFirebaseRef();
        const busLocationsRef = new FakeFirebaseRef();
        const simulation = new Simulation(
          timeRef,
          mapRef,
          panelsRef,
          busLocationsRef
        );

        assert.equal(
          '2016-05-18 06:00',
          simulation.simulationTime.format('YYYY-MM-DD hh:mm')
        );
        simulation.timeAdvance();
        assert.deepEqual(
          '2016-05-18 06:01',
          simulation.simulationTime.format('YYYY-MM-DD hh:mm')
        );
      })
    );

    it(
      'should roll over after end of simulation',
      _async(() => {
        const timeRef = new FakeFirebaseRef();
        const panelsRef = new FakeFirebaseRef();
        const simulation = new Simulation(timeRef, null, panelsRef);

        simulation.simulationTime = moment.utc(
          '2016-05-20 23:59',
          'YYYY-MM-DD hh:mm'
        );
        simulation.timeAdvance();
        assert.deepEqual(
          '2016-05-18 06:00',
          simulation.simulationTime.format('YYYY-MM-DD hh:mm')
        );
      })
    );

    it(
      'should set the panelsRef',
      _async(() => {
        const timeRef = new FakeFirebaseRef();
        const panelsRef = new FakeFirebaseRef();
        const simulation = new Simulation(timeRef, null, panelsRef);

        _await(simulation.timeAdvance());
        assert(panelsRef.val);
        assert.equal(3, panelsRef.val[0].left.length);
        assert.equal(2, panelsRef.val[0].right.length);
        assert.equal(3, panelsRef.val[1].left.length);
        assert.equal(0, panelsRef.val[1].right.length);
        assert.equal(3, panelsRef.val[2].left.length);
        assert.equal(2, panelsRef.val[2].right.length);
      })
    );
  });

  describe('#requestDirectionsForTrip', () => {
    it(
      'should generate the correct request structure for a trip',
      _async(() => {
        const tripId = 630;
        const start = {lat: 37.4263, lng: -122.078634};
        const end = {lat: 37.616763, lng: -122.383949};
        const simulation = new Simulation();

        const trip = _await(gtfs.getTripById(tripId));
        const {origin, destination} = simulation.requestDirectionsForTrip(trip);
        assert.deepEqual(start, origin);
        assert.deepEqual(end, destination);
      })
    );

    it(
      'should generate the correct request structure for a multi-stop trip',
      _async(() => {
        const tripId = 469;
        const expected = {
          origin: {lat: 37.4263, lng: -122.078634},
          waypoints: [{lat: 37.387002, lng: -121.983223}],
          destination: {lat: 37.383781, lng: -121.978797}
        };

        const simulation = new Simulation();

        const trip = _await(gtfs.getTripById(tripId));
        const request = simulation.requestDirectionsForTrip(trip);
        assert.deepEqual(request, expected);
      })
    );
  });
});

describe('Bus Simulation', () => {
  describe('getBusesActiveAt', () => {
    it('should return nothing for a time before the start of IO', () => {
      const beforeIO = moment.utc('20160515 10:01:23', 'YYYYMMDD HH:mm:ss');
      const activeBuses = bus_simulation.getBusesActiveAt(beforeIO);
      assert.equal(activeBuses.length, 0);
    });

    it('should return active buses for a time during IO', () => {
      const duringIO = moment.utc('20160518 06:33:23', 'YYYYMMDD HH:mm:ss');
      const activeBuses = bus_simulation.getBusesActiveAt(duringIO);
      assert.equal(activeBuses.length, 4);
    });

    it('should return nothing for a time after the end of IO', () => {
      const afterIO = moment.utc('20160520 19:01:23', 'YYYYMMDD HH:mm:ss');
      const activeBuses = bus_simulation.getBusesActiveAt(afterIO);
      assert.equal(activeBuses.length, 0);
    });
  });

  describe('getBusPositionsAt', () => {
    it('should return nothing for a time before the start of IO', () => {
      const beforeIO = moment.utc('20160515 10:01:23', 'YYYYMMDD HH:mm:ss');
      const activeBuses = bus_simulation.getBusPositionsAt(beforeIO);
      assert.equal(activeBuses.length, 0);
    });

    it('should return active buses for a time during IO', () => {
      const duringIO = moment.utc('20160518 06:33:23', 'YYYYMMDD HH:mm:ss');
      const activeBuses = bus_simulation.getBusPositionsAt(duringIO);
      assert.equal(activeBuses.length, 4);
      assert.deepEqual(activeBuses, [
        {
          trip: {
            route_id: 8,
            service_id: '1',
            trip_headsign: 'To Shoreline',
            trip_id: 199,
            departure_date: 20160518,
            departure_time: '06:00:00',
            departure_stop_id: 16
          },
          location: {lat: 37.523275, lng: -122.26683}
        },
        {
          trip: {
            route_id: 9,
            service_id: '1',
            trip_headsign: 'To Shoreline',
            trip_id: 211,
            departure_date: 20160518,
            departure_time: '06:00:00',
            departure_stop_id: 17
          },
          location: {lat: 37.53609, lng: -122.28024666666667}
        },
        {
          trip: {
            route_id: 8,
            service_id: '1',
            trip_headsign: 'To Shoreline',
            trip_id: 200,
            departure_date: 20160518,
            departure_time: '06:20:00',
            departure_stop_id: 16
          },
          location: {lat: 37.73872, lng: -122.4008}
        },
        {
          trip: {
            route_id: 9,
            service_id: '1',
            trip_headsign: 'To Shoreline',
            trip_id: 212,
            departure_date: 20160518,
            departure_time: '06:20:00',
            departure_stop_id: 17
          },
          location: {lat: 37.75855, lng: -122.40552}
        }
      ]);
    });

    it('should return nothing for a time after the end of IO', () => {
      const afterIO = moment.utc('20160520 19:01:23', 'YYYYMMDD HH:mm:ss');
      const activeBuses = bus_simulation.getBusPositionsAt(afterIO);
      assert.equal(activeBuses.length, 0);
    });
  });
});
