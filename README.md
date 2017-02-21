Google Transport Tracker
========================

Google Transport Tracker is a set of applications designed to track a
range of moving assets (such as vehicles) and visualize them on a live map. The
applications use a mixture of technologies - Android, Firebase,
Google Maps, GTFS (General Transit Feed Specification), and more.

## Overview

This is the open source release for the 
[I/O Bus Tracker](https://io-bus-tracker.appspot.com/).

The repository consists of a number of components, representing the individual
moving parts of the bus tracking system. It includes an Android app,
in `/android`, that's installed on Android devices and deployed on the tracked
vehicles, along with a matching administration UI in `/admin`.

The repo also contains the display side of the system, designed to drive 60"
LCD TVs. There is `/display-server`, written in Go and running on App Engine,
which receives the locations reported by the Android app, along with a time
table provided in GTFS format, and makes regular updates to a Firebase Real Time
Database. The client in `/display-client` receives the updates from the
Firebase database and draws them on the LCD TV.

## Getting started

Please refer to the README file for each component, for information about
API keys and other setup guides.

## Directories in this repo

The project is contains the following subdirectories, each housing
a single component:

### `admin`

A web interface for administrators to see a quick overview of all the
assets being tracked, and also to make updates to the GTFS schedule.

### `android`

The Android app that resides with each asset to be tracked.
Once configured, this app keeps its location synced with Firebase, and reports
on other metrics, such as battery life.

### `display-client`

The public web interface that displays schedule information and asset
locations.

### `display-server`

The server-side component that manages the state of the Firebase database.

*This is not an official Google product.*
