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
[Static Maps API: Get API Key](https://developers.google.com/maps/documentation/static-maps/get-api-key).

To authorize access to the Firebase Realtime Database, get your authentication credentials as outlined in
[the Firebase documentation](https://firebase.google.com/docs/web/setup).

Edit the file at the top of `main.js`:
* Add your Maps API key as the value of `mapsApiKey`.
* Add your Firebase API key in `firebaseApiKey` and the URL of your Firebase Realtime Database in `firebaseDatabaseURL`.
