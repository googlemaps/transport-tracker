# Admin

This is a web interface for administrators to see a quick overview of all the
assets being tracked, and also to make updates to the GTFS schedule.

## Usage

This app has two dependencies: the
[Google Static Maps API](https://developers.google.com/maps/documentation/static-maps/)
to display a map, 
and [Firebase Realtime Database](https://firebase.google.com/docs/database/).

To authorize access to the Google Static Maps API, add an API key in
`mapsApiKey` at the top of `main.js`, using the process outlined in 
[Static Maps API: Get a Key](https://developers.google.com/maps/documentation/static-maps/get-api-key).

To authenticate to Firebase, populate the `serviceAccountKey.json` file using the
process outlined in
[Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup).
