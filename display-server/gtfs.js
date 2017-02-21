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
const sqlite3 = Promise.promisifyAll(require('sqlite3').verbose());
const db = new sqlite3.Database(':memory:');

function getCalendarDates() {
  return db.allAsync('SELECT * FROM calendar_dates ORDER BY service_id');
}

function getCalendarDateById(service_id) {
  return db.getAsync(
    'SELECT * FROM calendar_dates WHERE service_id = ?',
    service_id
  );
}

function getCalendarDateByDate(date) {
  return db.getAsync('SELECT * FROM calendar_dates WHERE date = ?', date);
}
function getRoutes() {
  return db.allAsync('SELECT * FROM routes ORDER BY route_id');
}

function getRouteById(route_id) {
  return db.getAsync('SELECT * FROM routes WHERE route_id = ?', route_id);
}

function getStops() {
  return db.allAsync('SELECT * FROM stops ORDER BY stop_id');
}

function getStopById(stop_id) {
  return db.getAsync('SELECT * FROM stops WHERE stop_id = ?', stop_id);
}

function getStopsForRoute(route_id) {
  return db.allAsync(
    ` SELECT * FROM stops
      WHERE stop_id IN (
          SELECT stop_id FROM stop_times
          WHERE trip_id IN (
              SELECT trip_id FROM trips
              WHERE route_id = ?))`,
    route_id
  );
}

function getStopTimes() {
  return db.allAsync(
    'SELECT * FROM stop_times ORDER BY trip_id, stop_sequence'
  );
}

function getStopInfoForTrip(trip_id) {
  return db.allAsync(
    ` SELECT st.arrival_time as arrival_time, st.departure_time as departure_time,
              st.stop_id as stop_id, st.stop_sequence as stop_sequence, 
              s.stop_lat as lat, s.stop_lon as lng, s.stop_name as stop_name, cd.date as date
      FROM stop_times as st 
        INNER JOIN stops as s 
        INNER JOIN calendar_dates AS cd 
        INNER JOIN trips AS t
      WHERE st.trip_id = :trip_id 
        AND st.stop_id = s.stop_id
        AND st.trip_id = t.trip_id 
        AND t.service_id = cd.service_id
      ORDER BY departure_time`,
    trip_id
  );
}

function getStopsForTrip(trip_id) {
  return db.allAsync(
    ` SELECT * 
      FROM stops
      WHERE stop_id IN (SELECT stop_id 
                        FROM stop_times
                        WHERE trip_id = ?
                        ORDER BY departure_time)`,
    trip_id
  );
}

function getStopTimesForTrip(trip_id) {
  return db.allAsync(
    ` SELECT * FROM stop_times
      WHERE trip_id = :trip_id
      ORDER BY departure_time`,
    trip_id
  );
}

function getStopTimesForStop(stop_id) {
  return db.allAsync(
    ` SELECT * FROM stop_times
      WHERE stop_id = :stop_id
      ORDER BY departure_time`,
    stop_id
  );
}

function getTrips() {
  return db.allAsync('SELECT * FROM trips ORDER BY trip_id');
}

function getTripById(trip_id) {
  return db.getAsync('SELECT * FROM trips WHERE trip_id = ?', trip_id);
}

function getTripsForStop(stop_id) {
  return db.allAsync(
    ` SELECT * FROM trips
      WHERE trip_id IN (
          SELECT trip_id FROM stop_times
          WHERE stop_id = ?)`,
    stop_id
  );
}

function getTripsForCalendarDate(calendar_date) {
  return db.allAsync(
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
      WHERE t.service_id = c.service_id AND c.date = ?
      ORDER BY departure_date, departure_time`,
    calendar_date
  );
}

function getTripsOrderedByTime() {
  return db.allAsync(
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

function getTripsForRouteOrderedByTime(route_id) {
  return db.allAsync(
    ` SELECT t.route_id AS route_id, t.service_id AS service_id, t.trip_headsign AS trip_headsign,
              t.trip_id AS trip_id, c.date AS departure_date,
            ( SELECT departure_time FROM stop_times
              WHERE trip_id = t.trip_id
              ORDER BY departure_time ASC LIMIT 1) as departure_time,
            ( SELECT stop_id FROM stop_times
              WHERE trip_id = t.trip_id
              ORDER BY departure_time ASC LIMIT 1) as departure_stop_id
      FROM trips AS t INNER JOIN calendar_dates AS c
      WHERE t.route_id = ? AND t.service_id = c.service_id
      ORDER BY departure_date, departure_time`,
    route_id
  );
}

function getNextThreeTripsForRoute(route_id, calendarDate, time) {
  return db.allAsync(
    ` SELECT t.route_id AS route_id, t.service_id AS service_id, t.trip_headsign AS trip_headsign,
              t.trip_id AS trip_id, c.date AS departure_date,
            ( SELECT departure_time FROM stop_times
              WHERE trip_id = t.trip_id
              ORDER BY departure_time ASC LIMIT 1) as departure_time,
            ( SELECT stop_id FROM stop_times
              WHERE trip_id = t.trip_id
              ORDER BY departure_time ASC LIMIT 1) as departure_stop_id
      FROM trips AS t INNER JOIN calendar_dates AS c
      WHERE t.route_id = ? AND t.service_id = c.service_id
        AND (departure_date > ? OR departure_date = ? and departure_time > ?)
      ORDER BY departure_date, departure_time
      LIMIT 3`,
    route_id,
    calendarDate,
    calendarDate,
    time
  );
}

function getTripsInServiceForRoute(calendarDate, time, route) {
  return db.allAsync(
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
        AND c.date = ? 
        AND initial_departure_time <= ? 
        AND ? <= final_arrival_time
        AND t.route_id = ?
      ORDER BY trip_id ASC`,
    calendarDate,
    time,
    time,
    route
  );
}

exports.getCalendarDates = getCalendarDates;
exports.getCalendarDateById = getCalendarDateById;
exports.getCalendarDateByDate = getCalendarDateByDate;
exports.getRoutes = getRoutes;
exports.getRouteById = getRouteById;
exports.getStops = getStops;
exports.getStopsForRoute = getStopsForRoute;
exports.getStopsForTrip = getStopsForTrip;
exports.getStopTimesForTrip = getStopTimesForTrip;
exports.getStopTimesForStop = getStopTimesForStop;
exports.getStopById = getStopById;
exports.getStopTimes = getStopTimes;
exports.getTrips = getTrips;
exports.getTripById = getTripById;
exports.getTripsForStop = getTripsForStop;
exports.getTripsForCalendarDate = getTripsForCalendarDate;
exports.getTripsOrderedByTime = getTripsOrderedByTime;
exports.getTripsForRouteOrderedByTime = getTripsForRouteOrderedByTime;
exports.getNextThreeTripsForRoute = getNextThreeTripsForRoute;
exports.getTripsInServiceForRoute = getTripsInServiceForRoute;
exports.getStopInfoForTrip = getStopInfoForTrip;

db.serialize(() => {
  loadAgency();
  loadCalendarDates();
  loadRoutes();
  loadStops();
  loadStopTimes();
  loadTrips();
});

function loadAgency() {
  load('agency', [
    {name: 'agency_id', type: 'TEXT'},
    {name: 'agency_name', type: 'TEXT'},
    {name: 'agency_url', type: 'TEXT'},
    {name: 'agency_timezone', type: 'TEXT'},
    {name: 'agency_lang', type: 'TEXT'}
  ]);
}

function loadCalendarDates() {
  load('calendar_dates', [
    {name: 'service_id', type: 'TEXT'},
    {name: 'date', type: 'INTEGER'},
    {name: 'exception_type', type: 'INTEGER'}
  ]);
}

function loadRoutes() {
  load('routes', [
    {name: 'route_type', type: 'INTEGER'},
    {name: 'route_id', type: 'INTEGER'},
    {name: 'route_short_name', type: 'TEXT'},
    {name: 'route_long_name', type: 'TEXT'},
    {name: 'agency_id', type: 'TEXT'},
    {name: 'route_color', type: 'TEXT'},
    {name: 'route_text_color', type: 'TEXT'}
  ]);
}

function loadStopTimes() {
  load('stop_times', [
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

function loadStops() {
  load('stops', [
    {name: 'stop_lat', type: 'REAL'},
    {name: 'stop_lon', type: 'REAL'},
    {name: 'stop_name', type: 'TEXT'},
    {name: 'stop_id', type: 'INTEGER'},
    {name: 'location_type', type: 'INTEGER'}
  ]);
}

function loadTrips() {
  load('trips', [
    {name: 'route_id', type: 'INTEGER'},
    {name: 'trip_id', type: 'INTEGER'},
    {name: 'trip_headsign', type: 'TEXT'},
    {name: 'service_id', type: 'TEXT'}
  ]);
}

function load(filename, properties) {
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
