# Display Server

This server simulates the changing location of a set of vehicles given a
[GTFS](https://en.wikipedia.org/wiki/General_Transit_Feed_Specification)
schedule.

## Usage

The server has two dependencies, Google Maps APIs to query predicted travel
times using the [Directions API](https://developers.google.com/maps/documentation/directions/),
and [Firebase Realtime Database](https://firebase.google.com/docs/database/).

To authorize access to the Google Directions API, add a Google Maps API key in the following places:

* At the top of `generate_paths.js`
* At the top of `simulation.js`
* Near the top of `test/test.js`

Using the process outlined in
[Directions API: Get a Key](https://developers.google.com/maps/documentation/directions/get-api-key).

To authenticate to Firebase, populate the `serviceAccountKey.json` file using the
process outlined in
[Firebase Admin SDK setup](https://firebase.google.com/docs/admin/setup).

To configure which Firebase Realtime Database URL to use to communicate with
`display-client`, configure the `databaseURL` at the top of `main.js`.

To install library dependencies, use Node Package Manager.

```bash
npm install
```

To run the server, again use npm.

```bash
npm run main
```

## Testing

Please run the following to run the tests:

```bash
npm test
```

And generate a coverage report:

```bash
npm run coverage
```