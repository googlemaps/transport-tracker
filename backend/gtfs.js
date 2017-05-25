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

const fs = require('fs');
const parse = require('csv-parse/lib/sync');
const Promise = require('bluebird');
const sqlite3 = Promise.promisifyAll(require('sqlite3'));

exports.GTFS = class {
  constructor() {
    function tableColumns(properties) {
      return properties
        .map(prop => {
          return `${prop.name} ${prop.type}`;
        })
        .join(',');
    }

    function tablePlaceholders(properties) {
      return properties
        .map(() => {
          return '?';
        })
        .join(',');
    }

    function insertRecord(stmt, record, properties) {
      stmt.run(
        properties.map(prop => {
          return record[prop.name];
        })
      );
    }

    function load(db, filename, properties) {
      const createStmt = `CREATE TABLE ${filename} (
          ${tableColumns(properties)}
      )`;
      db.run(createStmt);
      const csv = fs.readFileSync(`${__dirname}/gtfs/${filename}.txt`);
      const records = parse(csv, {columns: true});
      const insertStmt = `INSERT INTO ${filename}
                          VALUES (${tablePlaceholders(properties)})`;
      const stmt = db.prepare(insertStmt);
      records.forEach(record => {
        insertRecord(stmt, record, properties);
      });
      stmt.finalize();
    }

    function loadAgency(db) {
      load(db, 'agency', [
        {name: 'agency_id', type: 'TEXT'},
        {name: 'agency_name', type: 'TEXT'},
        {name: 'agency_url', type: 'TEXT'},
        {name: 'agency_timezone', type: 'TEXT'},
        {name: 'agency_lang', type: 'TEXT'}
      ]);
    }

    function loadCalendarDates(db) {
      load(db, 'calendar_dates', [
        {name: 'service_id', type: 'TEXT'},
        {name: 'date', type: 'INTEGER'},
        {name: 'exception_type', type: 'INTEGER'}
      ]);
    }

    function loadRoutes(db) {
      load(db, 'routes', [
        {name: 'route_type', type: 'INTEGER'},
        {name: 'route_id', type: 'INTEGER'},
        {name: 'route_short_name', type: 'TEXT'},
        {name: 'route_long_name', type: 'TEXT'},
        {name: 'agency_id', type: 'TEXT'},
        {name: 'route_color', type: 'TEXT'},
        {name: 'route_text_color', type: 'TEXT'}
      ]);
    }

    function loadStopTimes(db) {
      load(db, 'stop_times', [
        {name: 'trip_id', type: 'INTEGER'},
        {name: 'arrival_time', type: 'TEXT'},
        {name: 'departure_time', type: 'TEXT'},
        {name: 'stop_id', type: 'INTEGER'},
        {name: 'stop_sequence', type: 'INTEGER'},
        {name: 'stop_headsign', type: 'TEXT'},
        {name: 'pickup_type', type: 'INTEGER'},
        {name: 'drop_off_type', type: 'INTEGER'},
        {name: 'shape_dist_traveled', type: 'TEXT'}
      ]);
    }

    function loadStops(db) {
      load(db, 'stops', [
        {name: 'stop_lat', type: 'REAL'},
        {name: 'stop_lon', type: 'REAL'},
        {name: 'stop_name', type: 'TEXT'},
        {name: 'stop_id', type: 'INTEGER'},
        {name: 'location_type', type: 'INTEGER'}
      ]);
    }

    function loadTrips(db) {
      load(db, 'trips', [
        {name: 'route_id', type: 'INTEGER'},
        {name: 'trip_id', type: 'INTEGER'},
        {name: 'trip_headsign', type: 'TEXT'},
        {name: 'service_id', type: 'TEXT'}
      ]);
    }

    this.db = new sqlite3.Database(':memory:');
    this.db.serialize(() => {
      loadAgency(this.db);
      loadCalendarDates(this.db);
      loadRoutes(this.db);
      loadStops(this.db);
      loadStopTimes(this.db);
      loadTrips(this.db);
    });
  }

  getCalendarDates() {
    return this.db.allAsync('SELECT * FROM calendar_dates ORDER BY service_id');
  }

  getCalendarDateById(service_id) {
    return this.db.getAsync(
      'SELECT * FROM calendar_dates WHERE service_id = ?',
      service_id
    );
  }

  getCalendarDateByDate(date) {
    return this.db.getAsync('SELECT * FROM calendar_dates WHERE date = $date', {
      $date: date
    });
  }
  getRoutes() {
    return this.db.allAsync('SELECT * FROM routes ORDER BY route_id');
  }

  getRouteById(route_id) {
    return this.db.getAsync('SELECT * FROM routes WHERE route_id = $route_id', {
      $route_id: route_id
    });
  }

  getStops() {
    return this.db.allAsync('SELECT * FROM stops ORDER BY stop_id');
  }

  getStopById(stop_id) {
    return this.db.getAsync('SELECT * FROM stops WHERE stop_id = $stop_id', {
      $stop_id: stop_id
    });
  }

  getStopsForRoute(route_id) {
    return this.db.allAsync(
      ` SELECT * FROM stops
        WHERE stop_id IN (
          SELECT stop_id FROM stop_times
          WHERE trip_id IN (
            SELECT trip_id FROM trips
            WHERE route_id = $route_id))`,
      {$route_id: route_id}
    );
  }

  getStopTimes() {
    return this.db.allAsync(
      'SELECT * FROM stop_times ORDER BY trip_id, stop_sequence'
    );
  }

  getStopInfoForTrip(trip_id) {
    return this.db.allAsync(
      ` SELECT st.arrival_time as arrival_time, st.departure_time as departure_time,
               st.stop_id as stop_id, st.stop_sequence as stop_sequence,
               s.stop_lat as lat, s.stop_lon as lng, s.stop_name as stop_name, cd.date as date
        FROM stop_times as st
          INNER JOIN stops as s
          INNER JOIN calendar_dates AS cd
          INNER JOIN trips AS t
        WHERE st.trip_id = $trip_id
          AND st.stop_id = s.stop_id
          AND st.trip_id = t.trip_id
          AND t.service_id = cd.service_id
        ORDER BY departure_time`,
      {$trip_id: trip_id}
    );
  }

  getStopsForTrip(trip_id) {
    return this.db.allAsync(
      ` SELECT *
        FROM stops
        WHERE stop_id IN (SELECT stop_id
                          FROM stop_times
                          WHERE trip_id = $trip_id
                          ORDER BY departure_time)`,
      {$trip_id: trip_id}
    );
  }

  getStopTimesForTrip(trip_id) {
    return this.db.allAsync(
      ` SELECT * FROM stop_times
        WHERE trip_id = $trip_id
        ORDER BY departure_time`,
      {$trip_id: trip_id}
    );
  }

  getStopTimesForStop(stop_id) {
    return this.db.allAsync(
      ` SELECT * FROM stop_times
        WHERE stop_id = $stop_id
        ORDER BY departure_time`,
      {$stop_id: stop_id}
    );
  }

  getTrips() {
    return this.db.allAsync('SELECT * FROM trips ORDER BY trip_id');
  }

  getTripById(trip_id) {
    return this.db.getAsync('SELECT * FROM trips WHERE trip_id = $trip_id', {
      $trip_id: trip_id
    });
  }

  getTripsForStop(stop_id) {
    return this.db.allAsync(
      ` SELECT * FROM trips
        WHERE trip_id IN (
          SELECT trip_id FROM stop_times
          WHERE stop_id = $stop_id)`,
      {$stop_id: stop_id}
    );
  }

  getTripsForCalendarDate(calendar_date) {
    return this.db.allAsync(
      ` SELECT t.route_id AS route_id, t.service_id AS service_id,
               t.trip_headsign AS trip_headsign, t.trip_id AS trip_id,
               c.date AS departure_date,
               ( SELECT departure_time FROM stop_times
                 WHERE trip_id = t.trip_id
                 ORDER BY departure_time ASC LIMIT 1) as departure_time,
               ( SELECT stop_id FROM stop_times
                 WHERE trip_id = t.trip_id
                 ORDER BY departure_time ASC LIMIT 1) as departure_stop_id
        FROM trips AS t INNER JOIN calendar_dates AS c
        WHERE t.service_id = c.service_id AND c.date = $calendar_date
        ORDER BY departure_date, departure_time`,
      {$calendar_date: calendar_date}
    );
  }

  getTripsOrderedByTime() {
    return this.db.allAsync(
      ` SELECT t.route_id AS route_id, t.service_id AS service_id,
               t.trip_headsign AS trip_headsign, t.trip_id AS trip_id,
               c.date AS departure_date,
             ( SELECT departure_time FROM stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_time,
             ( SELECT stop_id FROM stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_stop_id
        FROM trips AS t INNER JOIN calendar_dates AS c
        WHERE t.service_id = c.service_id
        ORDER BY departure_date, departure_time`
    );
  }

  getTripsForRouteOrderedByTime(route_id) {
    return this.db.allAsync(
      ` SELECT t.route_id AS route_id, t.service_id AS service_id, t.trip_headsign AS trip_headsign,
               t.trip_id AS trip_id, c.date AS departure_date,
             ( SELECT departure_time FROM stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_time,
             ( SELECT stop_id FROM stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_stop_id
        FROM trips AS t INNER JOIN calendar_dates AS c
        WHERE t.route_id = $route_id AND t.service_id = c.service_id
        ORDER BY departure_date, departure_time`,
      {$route_id: route_id}
    );
  }

  getNextThreeTripsForRoute(route_id, calendar_date, time) {
    return this.db.allAsync(
      ` SELECT t.route_id AS route_id, t.service_id AS service_id, t.trip_headsign AS trip_headsign,
               t.trip_id AS trip_id, c.date AS departure_date,
             ( SELECT departure_time FROM stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_time,
             ( SELECT stop_id FROM stop_times
               WHERE trip_id = t.trip_id
               ORDER BY departure_time ASC LIMIT 1) as departure_stop_id
        FROM trips AS t INNER JOIN calendar_dates AS c
        WHERE t.route_id = $route_id AND t.service_id = c.service_id
          AND (departure_date > $calendar_date OR departure_date = $calendar_date and departure_time > $time)
        ORDER BY departure_date, departure_time
        LIMIT 3`,
      {
        $route_id: route_id,
        $calendar_date: calendar_date,
        $time: time
      }
    );
  }

  getTripsInServiceForRoute(calendar_date, time, route_id) {
    return this.db.allAsync(
      ` SELECT  t.route_id AS route_id, t.service_id AS service_id, t.trip_headsign AS trip_headsign,
                t.trip_id AS trip_id,
              ( SELECT   departure_time
                FROM     stop_times
                WHERE    trip_id = t.trip_id
                ORDER BY departure_time ASC limit 1) AS initial_departure_time,
              ( SELECT   arrival_time
                FROM     stop_times
                WHERE    trip_id = t.trip_id
                ORDER BY arrival_time DESC limit 1) AS final_arrival_time
        FROM trips AS t INNER JOIN calendar_dates AS c
        WHERE t.service_id = c.service_id
          AND c.date = $calendar_date
          AND initial_departure_time <= $time
          AND $time <= final_arrival_time
          AND t.route_id = $route_id
        ORDER BY trip_id ASC`,
      {
        $calendar_date: calendar_date,
        $time: time,
        $route_id: route_id
      }
    );
  }
};
