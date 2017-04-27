# Admin

This is a web interface for administrators to see a quick overview of all the
assets being tracked.

## Usage

This app has two dependencies: the
[Google Static Maps API](https://developers.google.com/maps/documentation/static-maps/)
to display a map, 
and [Firebase Realtime Database](https://firebase.google.com/docs/database/).

To authorize access to the Google Static Maps API, get a Maps API key using the process
outlined in 
[Static Maps API: Get API Key](https://developers.google.com/maps/documentation/static-maps/get-api-key),
then add the API key as the value of `mapsApiKey` at the top of `main.js`

To authenticate to Firebase, create and populate a `serviceAccountKey.json` file using the
process outlined in
[Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup).
