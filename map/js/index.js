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

// @ts-check
/// <reference path="../typings/index.d.ts"/>

/* eslint-disable no-unused-vars, no-shadow-global */
/* globals google firebase */

// TODO: See https://firebase.google.com/docs/web/setup for how to configure access to Firebase
const firebaseConfig = {};

const mapStyle = [
  {
    elementType: 'geometry',
    stylers: [{color: '#eceff1'}]
  },
  {
    elementType: 'labels',
    stylers: [{visibility: 'off'}]
  },
  {
    featureType: 'administrative',
    elementType: 'labels',
    stylers: [{visibility: 'on'}]
  },
  {
    featureType: 'road',
    elementType: 'geometry',
    stylers: [{color: '#cfd8dc'}]
  },
  {
    featureType: 'road',
    elementType: 'geometry.stroke',
    stylers: [{visibility: 'off'}]
  },
  {
    featureType: 'road.local',
    stylers: [{visibility: 'off'}]
  },
  {
    featureType: 'water',
    stylers: [{color: '#b0bec5'}]
  }
];

class MarkerManager {
  constructor(map) {
    this.map = map;
    this.markers = [];
  }

  add(location, icon, title) {
    const marker = new google.maps.Marker({
      position: location,
      map: this.map,
      icon: icon,
      title: title,
      optimized: false
    });
    this.markers.push(marker);
  }

  clear() {
    this.markers.forEach(marker => {
      marker.setMap(null);
    });
    this.markers.length = 0;
  }
}

class Card {
  constructor(data) {
    this.data = data;
  }

  get direction() {
    // Stop ID #0 is Google I/O
    if (this.data.next_trip && this.data.next_trip.stop_info[0].stop_id === 0) {
      return 'To';
    }
    return 'From';
  }

  get headsign() {
    switch (this.data.route.route_id) {
      case 0:
        return 'Palo Alto';
      case 1:
        return 'Avatar & Plaza Suites';
      case 2:
        return 'Aloft, Wild Palms';
      case 3:
        return 'Towneplace, Avante';
      case 4:
        return 'Country Inn & Suites';
      case 5:
        return 'Mtn View Caltrain';
      case 6:
        return 'SF Shuttle';
      case 7:
        return 'Millbrae BART';
      case 8:
        return 'San Francisco (SFO)';
      case 9:
        return "San Jose Int'l (SJC)";
      default:
        return 'Unknown';
    }
  }

  get isDark() {
    // Dark background for white text
    return this.data.route.route_text_color === 'FFFFFF';
  }

  get color() {
    return `#${this.data.route.route_color}`;
  }

  get cardHeight() {
    return 104 + this.bodyHeight;
  }

  get bodyHeight() {
    if (this.data.next_trip) {
      return this.data.next_trip.stop_info.length * 40 + 24;
    }
    return 0;
  }

  get render() {
    if (this.data.next_trip) {
      return `
        <div 
          class="card ${this.isDark ? 'dark' : 'light'}"
          style="height: ${this.cardHeight}px"
          >
          <div class="header" style="background-color: ${this.color}">
            <div class="bus_logo">
              <svg width="64px" height="64px" viewBox="0 0 64 64">
                <g stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <circle fill="#FFFFFF" cx="32" cy="32" r="32"></circle>
                  <path
                    d="M20.7894737,31.0526316 L43.5263158,31.0526316 L43.5263158,21.5789474 L20.7894737,21.5789474 L20.7894737,31.0526316 Z M40.6842105,42.4210526 C39.1115789,42.4210526 37.8421053,41.1515789 37.8421053,39.5789474 C37.8421053,38.0063158 39.1115789,36.7368421 40.6842105,36.7368421 C42.2568421,36.7368421 43.5263158,38.0063158 43.5263158,39.5789474 C43.5263158,41.1515789 42.2568421,42.4210526 40.6842105,42.4210526 L40.6842105,42.4210526 Z M23.6315789,42.4210526 C22.0589474,42.4210526 20.7894737,41.1515789 20.7894737,39.5789474 C20.7894737,38.0063158 22.0589474,36.7368421 23.6315789,36.7368421 C25.2042105,36.7368421 26.4736842,38.0063158 26.4736842,39.5789474 C26.4736842,41.1515789 25.2042105,42.4210526 23.6315789,42.4210526 L23.6315789,42.4210526 Z M17,40.5263158 C17,42.2025263 17.7389474,43.6905263 18.8947368,44.7326316 L18.8947368,48.1052632 C18.8947368,49.1473684 19.7473684,50 20.7894737,50 L22.6842105,50 C23.7364211,50 24.5789474,49.1473684 24.5789474,48.1052632 L24.5789474,46.2105263 L39.7368421,46.2105263 L39.7368421,48.1052632 C39.7368421,49.1473684 40.5793684,50 41.6315789,50 L43.5263158,50 C44.5684211,50 45.4210526,49.1473684 45.4210526,48.1052632 L45.4210526,44.7326316 C46.5768421,43.6905263 47.3157895,42.2025263 47.3157895,40.5263158 L47.3157895,21.5789474 C47.3157895,14.9473684 40.5326316,14 32.1578947,14 C23.7831579,14 17,14.9473684 17,21.5789474 L17,40.5263158 Z"
                    fill="${this.color}"></path>
                </g>
              </svg>
            </div>
            <div class="direction">${this.direction}</div>
            <div class="headsign">${this.headsign}</div>
            <div class="leaving-in-label">${this.data.leaving_in_label}</div>
            <div class="leaving-in">${this.data.leaving_in}</div>
          </div>
          <div class="body" style="height: ${this.bodyHeight}px">
            <div class="stop-times">
              ${this.stopTimes}
            </div>
            ${this.stopGuide}
            <div class="stop-names">
              ${this.stopNames}
            </div>
            <div class="next-in-box">
              <div class="next-in-label">${this.data.next_in_label}</div>
              <div class="next-in">${this.data.next_in}</div>
            </div>
          </div>
        </div>`;
    }
    return '';
  }

  get stopTimes() {
    if (this.data.next_trip) {
      return this.data.next_trip.stop_info
        .map(stop_info => {
          return `<div class="stop-time">${stop_info.departure_time.replace(
            /(\d+):(\d+):\d+/,
            (match, hours, minutes) => {
              return `${hours}:${minutes}`;
            }
          )}</div>`;
        })
        .join('\n');
    }
    return '';
  }

  get stopNames() {
    if (this.data.next_trip) {
      return this.data.next_trip.stop_info
        .map(stop_info => {
          return `<div class="stop-name">${stop_info.stop_name}</div>`;
        })
        .join('\n');
    }
    return '';
  }

  get stopGuide() {
    if (this.data.next_trip) {
      switch (this.data.next_trip.stop_info.length) {
        case 2:
          return `
        <div class="stop-guide">
          <svg width="16px" height="56px" viewBox="0 0 16 56">
            <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                <g id="ic_stops_one">
                    <g id="top">
                        <g id="bg" fill="${this.color}">
                            <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z" id="fill"></path>
                        </g>
                        <ellipse id="fill_white" fill="#FFFFFF" cx="8" cy="8" rx="5" ry="5"></ellipse>
                    </g>
                    <g id="bottom" transform="translate(0.000000, 28.000000)">
                        <g id="bg" transform="translate(8.000000, 14.000000) scale(1, -1) translate(-8.000000, -14.000000) " fill="${this.color}">
                            <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z M8,13 C10.7614237,13 13,10.7614237 13,8 C13,5.23857625 10.7614237,3 8,3 C5.23857625,3 3,5.23857625 3,8 C3,10.7614237 5.23857625,13 8,13 Z" id="fill"></path>
                        </g>
                        <ellipse id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" rx="5" ry="5"></ellipse>
                    </g>
                </g>
            </g>
          </svg>
        </div>`;
        case 3:
          return `
        <div class="stop-guide">
          <svg width="16px" height="96px" viewBox="0 0 16 96">
              <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g id="ic_stops_two">
                      <g id="top">
                          <g id="bg" fill="${this.color}">
                              <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z" id="fill"></path>
                          </g>
                          <ellipse id="fill_white" fill="#FFFFFF" cx="8" cy="8" rx="5" ry="5"></ellipse>
                      </g>
                      <g id="middle" transform="translate(0.000000, 28.000000)">
                          <g id="bg" fill="${this.color}">
                              <path d="M12,20 L16,20 L16,1.77635684e-14 L0,1.77635684e-14 L0,20 L4,20 C4,17.790861 5.790861,16 8,16 C10.209139,16 12,17.790861 12,20 L16,20 L16,40 L0,40 L0,20 L4,20 C4,22.209139 5.790861,24 8,24 C10.209139,24 12,22.209139 12,20 Z" id="fill"></path>
                          </g>
                          <circle id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" r="4"></circle>
                      </g>
                      <g id="bottom" transform="translate(0.000000, 68.000000)">
                          <g id="bg" transform="translate(8.000000, 14.000000) scale(1, -1) translate(-8.000000, -14.000000) " fill="${this.color}">
                              <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z M8,13 C10.7614237,13 13,10.7614237 13,8 C13,5.23857625 10.7614237,3 8,3 C5.23857625,3 3,5.23857625 3,8 C3,10.7614237 5.23857625,13 8,13 Z" id="fill"></path>
                          </g>
                          <ellipse id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" rx="5" ry="5"></ellipse>
                      </g>
                  </g>
              </g>
          </svg>
        </div>`;
        case 4:
          return `
        <div class="stop-guide">
          <svg width="16px" height="136px" viewBox="0 0 16 136">
              <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g id="ic_stops_three">
                      <g id="top">
                          <g id="bg" fill="${this.color}">
                              <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z" id="fill"></path>
                          </g>
                          <ellipse id="fill_white" fill="#FFFFFF" cx="8" cy="8" rx="5" ry="5"></ellipse>
                      </g>
                      <g id="middle" transform="translate(0.000000, 28.000000)">
                          <g id="bg" fill="${this.color}">
                              <path d="M12,20 L16,20 L16,1.77635684e-14 L0,1.77635684e-14 L0,20 L4,20 C4,17.790861 5.790861,16 8,16 C10.209139,16 12,17.790861 12,20 L16,20 L16,40 L0,40 L0,20 L4,20 C4,22.209139 5.790861,24 8,24 C10.209139,24 12,22.209139 12,20 Z" id="fill"></path>
                          </g>
                          <circle id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" r="4"></circle>
                      </g>
                      <g id="middle-copy" transform="translate(0.000000, 68.000000)">
                          <g id="bg" fill="${this.color}">
                              <path d="M12,20 L16,20 L16,1.77635684e-14 L0,1.77635684e-14 L0,20 L4,20 C4,17.790861 5.790861,16 8,16 C10.209139,16 12,17.790861 12,20 L16,20 L16,40 L0,40 L0,20 L4,20 C4,22.209139 5.790861,24 8,24 C10.209139,24 12,22.209139 12,20 Z" id="fill"></path>
                          </g>
                          <circle id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" r="4"></circle>
                      </g>
                      <g id="bottom" transform="translate(0.000000, 108.000000)">
                          <g id="bg" transform="translate(8.000000, 14.000000) scale(1, -1) translate(-8.000000, -14.000000) " fill="${this.color}">
                              <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z M8,13 C10.7614237,13 13,10.7614237 13,8 C13,5.23857625 10.7614237,3 8,3 C5.23857625,3 3,5.23857625 3,8 C3,10.7614237 5.23857625,13 8,13 Z" id="fill"></path>
                          </g>
                          <ellipse id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" rx="5" ry="5"></ellipse>
                      </g>
                  </g>
              </g>
          </svg>
        </div>`;
        case 5:
          return `
        <div class="stop-guide">
          <svg width="16px" height="176px" viewBox="0 0 16 176">
              <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                  <g id="ic_stops_four">
                      <g id="top">
                          <g id="bg" fill="${this.color}">
                              <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z" id="fill"></path>
                          </g>
                          <ellipse id="fill_white" fill="#FFFFFF" cx="8" cy="8" rx="5" ry="5"></ellipse>
                      </g>
                      <g id="middle" transform="translate(0.000000, 28.000000)">
                          <g id="bg" fill="${this.color}">
                              <path d="M12,20 L16,20 L16,-1.77635684e-14 L0,-1.77635684e-14 L0,20 L4,20 C4,17.790861 5.790861,16 8,16 C10.209139,16 12,17.790861 12,20 L16,20 L16,40 L0,40 L0,20 L4,20 C4,22.209139 5.790861,24 8,24 C10.209139,24 12,22.209139 12,20 Z" id="fill"></path>
                          </g>
                          <circle id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" r="4"></circle>
                      </g>
                      <g id="middle-copy" transform="translate(0.000000, 68.000000)">
                          <g id="bg" fill="${this.color}">
                              <path d="M12,20 L16,20 L16,-1.77635684e-14 L0,-1.77635684e-14 L0,20 L4,20 C4,17.790861 5.790861,16 8,16 C10.209139,16 12,17.790861 12,20 L16,20 L16,40 L0,40 L0,20 L4,20 C4,22.209139 5.790861,24 8,24 C10.209139,24 12,22.209139 12,20 Z" id="fill"></path>
                          </g>
                          <circle id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" r="4"></circle>
                      </g>
                      <g id="middle-copy-2" transform="translate(0.000000, 108.000000)">
                          <g id="bg" fill="${this.color}">
                              <path d="M12,20 L16,20 L16,-1.77635684e-14 L0,-1.77635684e-14 L0,20 L4,20 C4,17.790861 5.790861,16 8,16 C10.209139,16 12,17.790861 12,20 L16,20 L16,40 L0,40 L0,20 L4,20 C4,22.209139 5.790861,24 8,24 C10.209139,24 12,22.209139 12,20 Z" id="fill"></path>
                          </g>
                          <circle id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" r="4"></circle>
                      </g>
                      <g id="bottom" transform="translate(0.000000, 148.000000)">
                          <g id="bg" transform="translate(8.000000, 14.000000) scale(1, -1) translate(-8.000000, -14.000000) " fill="${this.color}">
                              <path d="M16,8 C16,3.581722 12.418278,0 8,0 C3.581722,0 0,3.581722 0,8 L0,28 L16,28 L16,8 Z M8,13 C10.7614237,13 13,10.7614237 13,8 C13,5.23857625 10.7614237,3 8,3 C5.23857625,3 3,5.23857625 3,8 C3,10.7614237 5.23857625,13 8,13 Z" id="fill"></path>
                          </g>
                          <ellipse id="fill_opacity" fill="#FFFFFF" cx="8" cy="20" rx="5" ry="5"></ellipse>
                      </g>
                  </g>
              </g>
          </svg>
        </div>`;
      }
    }
    return '';
  }
}

function renderCard(data) {
  const card = new Card(data);
  return card.render;
}

function renderSide(side) {
  if (side) {
    return `<div class="side">${side
      .map(card => {
        return renderCard(card);
      })
      .join('')}</div>`;
  }
  return '';
}

function renderPanels(panels) {
  if (!panels) {
    return '';
  }

  return panels
    .map(panel => {
      return `<div class="panel">
              ${renderSide(panel.left)}
              ${renderSide(panel.right)}
            </div>`;
    })
    .join('');
}

function colorToBusMarker(color) {
  switch (color) {
    case 'FCE444':
      return '/images/dashboard/busmarker_yellow.png';
    case 'C4E86B':
      return '/images/dashboard/busmarker_lime.png';
    case '00C1DE':
      return '/images/dashboard/busmarker_teal.png';
    case 'FFAD00':
      return '/images/dashboard/busmarker_orange.png';
    case '0061C8':
      return '/images/dashboard/busmarker_indigo.png';
    case '8A8A8D':
      return '/images/dashboard/busmarker_caltrain.png';
    case 'EA1D76':
      return '/images/dashboard/busmarker_sf.png';
    default:
      console.log(`colorToBusMarker(${color}) not handled`);
      return '';
  }
}

function geocodeAddress(address, map, icon, title) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({address: address}, (results, status) => {
    if (status === 'OK') {
      const marker = new google.maps.Marker({
        map: map,
        position: results[0].geometry.location,
        icon: icon,
        title: title,
        optimized: false
      });
    } else {
      console.log(
        'Geocode was not successful for the following reason: ' + status
      );
    }
  });
}

function initMap() {
  const map = new google.maps.Map(document.getElementById('map'), {
    disableDefaultUI: true,
    styles: mapStyle
  });

  // Put I/O on the map
  geocodeAddress(
    '1 Amphitheatre Pkwy, Mountain View, CA 94043',
    map,
    '/images/dashboard/logo_io_64.png',
    'Google I/O'
  );

  const markerManager = new MarkerManager(map);
  const cardsElement = document.getElementsByClassName('cards')[0];
  const displayTimeElement = document.getElementsByClassName('display-time')[0];
  const pageMarkerPanelElts = [
    document.getElementById('page-marker-panel-0'),
    document.getElementById('page-marker-panel-1'),
    document.getElementById('page-marker-panel-2')
  ];

  firebase.initializeApp(firebaseConfig);
  const db = firebase.database();
  db.ref('map').on('value', snapshot => {
    const val = snapshot.val();
    map.fitBounds({
      east: val.northEastLng,
      north: val.northEastLat,
      south: val.southWestLat,
      west: val.southWestLng
    });

    markerManager.clear();
    val.markers.forEach(marker => {
      markerManager.add(
        {
          lat: marker.lat,
          lng: marker.lng
        },
        marker.iconPath,
        marker.name
      );
    });

    cardsElement.style[
      'top'
    ] = `calc(${val.panel * -100}vh - ${val.panel * 64}px)`;

    pageMarkerPanelElts.forEach(elt => {
      elt.classList.remove('selected');
    });
    pageMarkerPanelElts[val.panel].classList.add('selected');
  });

  db.ref('current-time').on('value', snapshot => {
    displayTimeElement.textContent = snapshot.val().display;
  });

  db.ref('panels').on('value', snapshot => {
    cardsElement.innerHTML = renderPanels(snapshot.val());
  });

  const busLocationMarkers = {};

  db.ref('bus-locations').on('value', snapshot => {
    const val = snapshot.val();

    for (let key in busLocationMarkers) {
      if (val === null || !(key in val)) {
        const marker = busLocationMarkers[key];
        marker.setMap(null);
        delete busLocationMarkers[key];
      }
    }

    for (let key in val) {
      const bus = val[key];

      if (key in busLocationMarkers) {
        const marker = busLocationMarkers[key];
        marker.setPosition({
          lat: bus.lat,
          lng: bus.lng
        });
      } else {
        const url = colorToBusMarker(bus.route_color);
        const marker = new google.maps.Marker({
          position: {
            lat: bus.lat,
            lng: bus.lng
          },
          map: map,
          icon: {
            url,
            anchor: new google.maps.Point(30, 30) // Bus markers are 60x60 px
          },
          title: bus.route_name,
          optimized: false
        });
        busLocationMarkers[key] = marker;
      }
    }
  });

  const promoContainerElement = document.getElementsByClassName(
    'promo-container'
  )[0];

  db.ref('promo').on('value', snapshot => {
    const promo = snapshot.val();
    promoContainerElement.innerHTML = `
    <div class="promo">
      <div class="title">What's under the hood</div>
      <div class="cta">
        <a href="http://g.co/io/tracker-app">g.co/io/tracker-app</a>
      </div>
      <img class="ticker-position" src="images/promo/ticker-${promo.position}.png"/>
      <div class="content">${promo.html}</div>
    </div>
    `;
  });
}
