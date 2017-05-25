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
const moment = require('moment-timezone');

const DATE_FORMAT = 'YYYYMMDD HH:mm:ss';
const SIMULATION_START = '2017-05-17 06:00';
const SIMULATION_END = '2017-05-19 18:00';

// HeartBeat generates a stream of updates to `timeRef`, with either
// simulated time updates, or real time updates, depending on the
// truthyness of `simulatedTime`
exports.HeartBeat = class {
  constructor(timeRef, simulatedTime) {
    this.simulationTime = moment.utc(SIMULATION_START, DATE_FORMAT);
    this.endOfSimulation = moment.utc(SIMULATION_END, DATE_FORMAT);
    this.timeRef = timeRef;
    this.simulated = simulatedTime;

    // Update the time once a second
    this.timeTimerId = setInterval(() => {
      this.timeAdvance();
    }, 1000);
  }

  timeAdvance() {
    if (this.simulated) {
      this.timeRef.set({
        display: this.simulationTime.format('h:mm A, MMM Do'),
        moment: this.simulationTime.valueOf()
      });
      this.simulationTime = this.simulationTime.add(30, 'seconds');
      if (this.simulationTime.diff(this.endOfSimulation, 'minutes') > 0) {
        // Reset simulation to start once we run out of bus trips.
        this.simulationTime = moment.utc(SIMULATION_START, DATE_FORMAT);
      }
    } else {
      const now = moment();
      this.timeRef.set({
        display: now.tz('America/Los_Angeles').format('h:mm A, MMM Do'),
        moment: now.valueOf()
      });
    }
  }
};
