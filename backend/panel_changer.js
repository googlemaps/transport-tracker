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

// PanelChanger changes the focus of the front end display
// by publishing the three panels defined in `panelConfig`,
// one after the other every ten seconds. This changes the
// bounds of the displayed map, along with which Hotels and
// bus stops are featured.
exports.PanelChanger = class {
  constructor(mapRef, panelConfig) {
    this.mapRef = mapRef;
    this.panelConfig = panelConfig;
    this.panelIndex = 0;

    // Change the panel once every ten seconds
    this.timeTimerId = setInterval(() => {
      this.panelAdvance();
    }, 20000);
  }

  panelAdvance() {
    this.mapRef.set(this.panelConfig[this.panelIndex]);
    this.panelIndex = (this.panelIndex + 1) % this.panelConfig.length;
  }
};
