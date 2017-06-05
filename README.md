Google Transport Tracker
========================

Google Transport Tracker is a set of applications designed to track a
range of moving assets (such as vehicles) and visualize them on a live map. The
applications use a mixture of technologies - Android, Firebase,
Google Maps, GTFS (General Transit Feed Specification), and more.

**Note:** This application implements asset tracking. For use in a production environment, you therefore need a [Google Maps APIs Premium Plan license](
https://developers.google.com/maps/pricing-and-plans/). For more information, see the [Google Maps APIs terms of service](https://developers.google.com/maps/terms#section_10_4).

## Overview

This is the open source release for the 
[I/O Bus Tracker](https://io-bus-tracker.appspot.com/).

The repository consists of a number of components, representing the individual
moving parts of the bus tracking system. It includes an Android app,
in `/android`, that's installed on Android devices and deployed on the tracked
vehicles, along with a matching administration UI in `/admin`.

The repo also contains the display side of the system, designed to drive 60"
LCD TVs. There is `/backend`, written in Node.js and running on Google Compute
Engine, which receives the locations reported by the Android app, along with a
time table provided in GTFS format, and makes regular updates to a Firebase
Real Time Database. The client in `/map` receives the updates from the Firebase
database and draws them on the LCD TV.

## Getting started

See the [developer documentation](https://developers.google.com/maps/solutions/transport-tracker/start).

## Directories in this repo

The project contains the following subdirectories, each housing
a single component:

### `admin`

A web interface for administrators to see a quick overview of all the
assets being tracked.

### `android`

The Android app that resides with each asset to be tracked.
Once configured, this app keeps its location synced with Firebase, and reports
on other metrics, such as battery life.

### `backend`

The server-side component that manages the state of the Firebase database.  For
a tutorial on this component, please see 
[Transport Tracker Backend codelab](https://codelabs.developers.google.com/codelabs/transport-tracker-backend/)

### `map`

The public web interface that displays schedule information and asset
locations. For a tutorial on this component, please see 
[Transport Tracker Map codelab](https://codelabs.developers.google.com/codelabs/transport-tracker-map/)

*This is not an official Google product.*
