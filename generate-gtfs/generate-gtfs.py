#!/usr/bin/env python
# coding=UTF8

import transitfeed
from optparse import OptionParser
import datetime

parser = OptionParser()
parser.add_option('--output', dest='output',
                  help='Path of output file. Should end in .zip')
parser.set_defaults(output='google_transit.zip')
(options, args) = parser.parse_args()

schedule = transitfeed.Schedule()
agency = transitfeed.Agency(name="I/O Buses",
    url="https://events.google.com/io/",
    timezone="America/Los_Angeles",
    lang="EN")
schedule.AddAgencyObject(agency)

# Service Periods (1 day each)
day0 = schedule.NewDefaultServicePeriod()
day0.SetDateHasService('20170516')
day1 = schedule.NewDefaultServicePeriod()
day1.SetDateHasService('20170517')
day2 = schedule.NewDefaultServicePeriod()
day2.SetDateHasService('20170518')
day3 = schedule.NewDefaultServicePeriod()
day3.SetDateHasService('20170519')

# Stops
shorelineAmphitheatre = schedule.AddStop(lat=37.426300, lng=-122.078634, name="Shoreline Amphitheatre")

sheratonPaloAlto = schedule.AddStop(lat=37.441290, lng=-122.163991, name="Sheraton Palo Alto")
hiltonGardenInnPaloAlto = schedule.AddStop(lat=37.409352, lng=-122.122660, name="Hilton Garden Inn Palo Alto")
paloAltoCaltrain = schedule.AddStop(lat=37.442909, lng=-122.164275, name="Palo Alto Caltrain")
avatarHotel = schedule.AddStop(lat=37.392028, lng=-121.977778, name="Avatar Hotel")
plazaSuites = schedule.AddStop(lat=37.387002, lng=-121.983223, name="Plaza Suites")
aloftSunnyvale = schedule.AddStop(lat=37.376305,lng=-122.029151, name="Aloft Sunnyvale")
wildPalmsHotel = schedule.AddStop(lat=37.352014, lng=-122.013180, name="Wild Palms Hotel")
towneplace = schedule.AddStop(lat=37.372713, lng=-122.056580, name="TownePlace Suites")
hotelAvante = schedule.AddStop(lat=37.376128, lng=-122.061057, name="Hotel Avante")
countryInnAndSuites = schedule.AddStop(lat=37.409883, lng=-122.002131, name="Country Inn & Suites By Carlson")
millbraeBart = schedule.AddStop(lat=37.600425, lng=-122.385861, name="Millbrae BART Station")
hyattRegencyEmbarcaderoSF = schedule.AddStop(lat=37.794075, lng=-122.395455, name="Hyatt Regency SF")
sfoAirport = schedule.AddStop(lat=37.616763, lng=-122.383949, name="San Francisco Airport (SFO)")
sjcAirport = schedule.AddStop(lat=37.367254, lng=-121.926683, name="San José Airport (SJC)")
mtvCaltrain = schedule.AddStop(lat=37.394109, lng=-122.076628, name="Mountain View Caltrain Station")

# Routes
yellowRoute = schedule.AddRoute(short_name="Yellow", long_name="Hilton Garden Inn Palo Alto, Sheraton Palo Alto, Westin, Palo Alto Caltrain", route_type="Bus")
limeRoute = schedule.AddRoute(short_name="Lime", long_name="Avatar Hotel, Plaza Suites", route_type="Bus")
tealRoute = schedule.AddRoute(short_name="Teal", long_name="Aloft Sunnyvale, Wild Palms", route_type="Bus")
orangeRoute = schedule.AddRoute(short_name="Orange", long_name="Towneplace, Hotel Avante", route_type="Bus")
indigoRoute = schedule.AddRoute(short_name="Indigo", long_name="Country Inn & Suites", route_type="Bus")
mtvCaltrainRoute = schedule.AddRoute(short_name="", long_name="Mountain View Caltrain", route_type="Bus")
sfRoute = schedule.AddRoute(short_name="", long_name="San Francisco Shuttle", route_type="Bus") 
millbraeBartRoute = schedule.AddRoute(short_name="", long_name="Millbrae BART", route_type="Bus")
sfoRoute = schedule.AddRoute(short_name="", long_name="San Francisco Airport", route_type="Bus")
sjcRoute = schedule.AddRoute(short_name="", long_name="San José Airport", route_type="Bus")

# Trips
def TripToShoreline(route, service_period, initial_stop, start_time, delta_minutes):
    "Create a trip from `initial_stop` to Shoreline."
    trip = route.AddTrip(schedule, headsign="To Shoreline Amphitheatre", service_period=service_period)
    end_time = datetime.datetime.strftime(datetime.datetime.strptime(start_time, '%H:%M:%S') +
                datetime.timedelta(minutes=delta_minutes), '%H:%M:%S')
    trip.AddStopTime(initial_stop, stop_time=start_time, drop_off_type=1) # Pickup only
    trip.AddStopTime(shorelineAmphitheatre, stop_time=end_time, pickup_type=1) # Drop off only

def TripsToShoreline(route, initial_stop, trips):
    "Create a series of trips from `initial_stop` to Shoreline for each of `trips`."
    for trip in trips:
        TripToShoreline(route, trip['service_period'], initial_stop, trip['start_time'], trip['delta_minutes'])

def TripsToShorelineAtTimes(route, service_period, initial_stop, start_times, delta_minutes):
    for start_time in start_times:
        TripToShoreline(route, service_period, initial_stop, start_time, delta_minutes)

def TripFromShoreline(route, service_period, headsign, start_time, stops):
    "Create a trip from Shoreline to `stops`."
    trip = route.AddTrip(schedule, headsign=headsign, service_period=service_period)
    trip.AddStopTime(shorelineAmphitheatre, stop_time=start_time, drop_off_type=1) # Pickup only
    last_stop_time = start_time
    for stop in stops:
        last_stop_time = datetime.datetime.strftime(datetime.datetime.strptime(last_stop_time, '%H:%M:%S') +
                            datetime.timedelta(minutes=stop['delta_minutes']), '%H:%M:%S')
        trip.AddStopTime(stop['stop'], stop_time=last_stop_time, pickup_type=1) # Drop off only

def TripsFromShorelineAtTimes(route, service_period, headsign, start_times, stops):
    "Create a series of trips from Shoreline to `stops`."
    for start_time in start_times:
        TripFromShoreline(route, service_period, headsign, start_time, stops)

def MultistopTripToShoreline(route, service_period, headsign, start_time, stops):
    trip = route.AddTrip(schedule, headsign=headsign, service_period=service_period)
    trip.AddStopTime(shorelineAmphitheatre, stop_time=start_time, drop_off_type=1) # Pickup only
    last_stop_time = start_time
    for stop in stops:
        last_stop_time = datetime.datetime.strftime(datetime.datetime.strptime(last_stop_time, '%H:%M:%S') +
                            datetime.timedelta(minutes=stop['delta_minutes']), '%H:%M:%S')
        if stop != stops[-1]:
            trip.AddStopTime(stop['stop'], stop_time=last_stop_time, drop_off_type=1) # Pickup only
        else:
            trip.AddStopTime(stop['stop'], stop_time=last_stop_time, pickup_type=1) # Drop off only

def MultistopTripsToShorelineAtTimes(route, service_period, headsign, start_times, stops):
    for start_time in start_times:
        MultistopTripToShoreline(route, service_period, headsign, start_time, stops)

TripsToShoreline(yellowRoute, sheratonPaloAlto, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '07:30:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:30:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '09:30:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '07:30:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:30:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '09:30:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '10:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '10:30:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '11:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '11:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '07:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '09:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '10:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '10:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '11:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '11:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 30},
])

TripsToShoreline(yellowRoute, hiltonGardenInnPaloAlto, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 20},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '10:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '10:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '11:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 30},
])

TripsToShoreline(limeRoute, avatarHotel, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day1, 'start_time': '09:30:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '09:30:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '09:30:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '11:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 30},
])

TripsToShoreline(limeRoute, plazaSuites, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day1, 'start_time': '09:00:00', 'delta_minutes': 45},
    {'service_period': day1, 'start_time': '09:30:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '09:00:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '10:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '09:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '10:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '11:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 45},
])

TripsToShoreline(tealRoute, aloftSunnyvale, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day1, 'start_time': '09:30:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '09:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '09:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '11:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 30},
])

TripsToShoreline(tealRoute, wildPalmsHotel, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day1, 'start_time': '09:15:00', 'delta_minutes': 60},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '09:15:00', 'delta_minutes': 60},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '09:15:00', 'delta_minutes': 60},
    {'service_period': day3, 'start_time': '11:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 60},
])

TripsToShoreline(orangeRoute, towneplace, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 20},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 20},
    {'service_period': day1, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 20},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 20},
    {'service_period': day2, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '10:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 20},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 20},
    {'service_period': day3, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '10:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 30},
])

TripsToShoreline(orangeRoute, hotelAvante, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '09:00:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '09:00:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '10:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '09:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '10:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '11:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 30},
])

TripsToShoreline(indigoRoute, countryInnAndSuites, [
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day1, 'start_time': '08:00:00', 'delta_minutes': 40},
    {'service_period': day1, 'start_time': '09:15:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day2, 'start_time': '08:00:00', 'delta_minutes': 40},
    {'service_period': day2, 'start_time': '09:15:00', 'delta_minutes': 45},
    {'service_period': day2, 'start_time': '10:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '08:00:00', 'delta_minutes': 40},
    {'service_period': day3, 'start_time': '09:15:00', 'delta_minutes': 45},
    {'service_period': day3, 'start_time': '10:30:00', 'delta_minutes': 30},
    {'service_period': day3, 'start_time': '12:00:00', 'delta_minutes': 30},
])

TripsToShoreline(millbraeBartRoute, millbraeBart, [
    {'service_period': day1, 'start_time': '06:30:00', 'delta_minutes': 60},
    {'service_period': day1, 'start_time': '07:30:00', 'delta_minutes': 80},
    {'service_period': day2, 'start_time': '06:30:00', 'delta_minutes': 60},
    {'service_period': day2, 'start_time': '07:30:00', 'delta_minutes': 80},
    {'service_period': day3, 'start_time': '06:30:00', 'delta_minutes': 60},
    {'service_period': day3, 'start_time': '07:30:00', 'delta_minutes': 80},
])

TripsToShoreline(sfRoute, hyattRegencyEmbarcaderoSF, [
    {'service_period': day1, 'start_time': '06:20:00', 'delta_minutes': 85},
    {'service_period': day1, 'start_time': '06:40:00', 'delta_minutes': 95},
    {'service_period': day1, 'start_time': '07:00:00', 'delta_minutes': 120},
    {'service_period': day2, 'start_time': '06:20:00', 'delta_minutes': 85},
    {'service_period': day2, 'start_time': '06:40:00', 'delta_minutes': 95},
    {'service_period': day2, 'start_time': '07:00:00', 'delta_minutes': 120},
    {'service_period': day3, 'start_time': '06:20:00', 'delta_minutes': 85},
    {'service_period': day3, 'start_time': '06:40:00', 'delta_minutes': 95},
    {'service_period': day3, 'start_time': '07:00:00', 'delta_minutes': 120},
])

# MTV Caltrain Loop
# We are putting the CalTrain loop frequency at every half hour, even though the schedule says "Every 20-30 minutes"

for day in [day1, day2]:
    # Morning route MTV Caltrain => Shoreline
    TripsToShorelineAtTimes(mtvCaltrainRoute, day, mtvCaltrain, [
        '07:15:00', '07:45:00', '08:15:00', '08:45:00', '09:15:00', '09:45:00',
        '10:15:00', '10:45:00', '11:15:00', '11:45:00', '12:15:00', '12:45:00',
        '13:15:00', '13:45:00', '14:15:00', '14:45:00', '15:15:00', '15:45:00',
        '16:15:00',
    ], 15)

    # Afternoon route Shoreline => MTV Caltrain
    TripsFromShorelineAtTimes(mtvCaltrainRoute, day, 'To Mountain View Caltrain', [
        '16:45:00', '17:15:00', '17:45:00', '18:15:00', '18:45:00', '19:15:00',
        '19:45:00', '20:15:00', '20:45:00', '21:15:00', '21:45:00', '22:15:00',
        '22:45:00',
    ], [{'stop': mtvCaltrain, 'delta_minutes': 15}])

# Morning route MTV Caltrain => Shoreline
TripsToShorelineAtTimes(mtvCaltrainRoute, day3, mtvCaltrain, [
    '07:15:00', '07:45:00', '08:15:00', '08:45:00', '09:15:00', '09:45:00',
    '10:15:00', '10:45:00', '11:15:00', '11:45:00', '12:15:00', '12:45:00',
], 15)

# Afternoon route Shoreline => MTV Caltrain
TripsFromShorelineAtTimes(mtvCaltrainRoute, day3, 'To Mountain View Caltrain', [
    '13:15:00', '13:45:00', '14:15:00', '14:45:00', '15:15:00', '15:45:00',
    '16:15:00', '16:45:00',
], [{'stop': mtvCaltrain, 'delta_minutes': 15}])

# Times for coloured routes
elevenToFiveOnceAnHour = [
    '11:00:00', '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00',
]
twelveToFiveOnceAnHour = [
    '12:00:00', '13:00:00', '14:00:00', '15:00:00', '16:00:00', '17:00:00',
]
fiveThirtyToTenThirtyEveryHalfHour = [
    '17:30:00', '18:00:00', '18:30:00', '19:00:00', '19:30:00', '20:00:00',
    '20:30:00', '21:00:00', '21:30:00', '22:00:00', '22:30:00',
]
oneThirtyToFourThirtyOnceAnHour = [
    '13:30:00', '14:30:00', '15:30:00', '16:30:00',
]

# Yellow route: Shoreline -> Hilton Garden Inn Palo Alto -> Sheraton Palo Alto -> Westin -> Palo Alto Caltrain
yellowHeadsign = 'To Hilton Garden Inn Palo Alto, Sheraton Palo Alto, Westin, and Palo Alto Caltrain'
yellowStops = [
    {'stop': hiltonGardenInnPaloAlto, 'delta_minutes': 15},
    {'stop': sheratonPaloAlto, 'delta_minutes': 10},
    #TODO(brettmorgan): Westin?
    {'stop': paloAltoCaltrain, 'delta_minutes': 10}
]

TripsFromShorelineAtTimes(yellowRoute, day1, yellowHeadsign, elevenToFiveOnceAnHour, yellowStops)
TripsFromShorelineAtTimes(yellowRoute, day1, yellowHeadsign, fiveThirtyToTenThirtyEveryHalfHour, yellowStops)
TripsFromShorelineAtTimes(yellowRoute, day2, yellowHeadsign, twelveToFiveOnceAnHour, yellowStops)
TripsFromShorelineAtTimes(yellowRoute, day2, yellowHeadsign, fiveThirtyToTenThirtyEveryHalfHour, yellowStops)
TripsFromShorelineAtTimes(yellowRoute, day3, yellowHeadsign, oneThirtyToFourThirtyOnceAnHour, yellowStops)

# Lime route: Shoreline -> Avatar Hotel -> Plaza Suites
limeHeadsign = 'To Avatar Hotel, Plaza Suites'
limeStops = [
    {'stop': avatarHotel, 'delta_minutes': 25},
    {'stop': plazaSuites, 'delta_minutes': 10},
]

TripsFromShorelineAtTimes(limeRoute, day1, limeHeadsign, elevenToFiveOnceAnHour, limeStops)
TripsFromShorelineAtTimes(limeRoute, day1, limeHeadsign, fiveThirtyToTenThirtyEveryHalfHour, limeStops)
TripsFromShorelineAtTimes(limeRoute, day2, limeHeadsign, twelveToFiveOnceAnHour, limeStops)
TripsFromShorelineAtTimes(limeRoute, day2, limeHeadsign, fiveThirtyToTenThirtyEveryHalfHour, limeStops)
TripsFromShorelineAtTimes(limeRoute, day3, limeHeadsign, oneThirtyToFourThirtyOnceAnHour, limeStops)

# Teal route: Shoreline -> Aloft Sunnyvale -> Wild Palms
tealHeadsign = 'To The Aloft Sunnyvale, Wild Palms Hotel'
tealStops = [
    {'stop': aloftSunnyvale, 'delta_minutes': 30},
    {'stop': wildPalmsHotel, 'delta_minutes': 20},
]

TripsFromShorelineAtTimes(tealRoute, day1, tealHeadsign, elevenToFiveOnceAnHour, tealStops)
TripsFromShorelineAtTimes(tealRoute, day1, tealHeadsign, fiveThirtyToTenThirtyEveryHalfHour, tealStops)
TripsFromShorelineAtTimes(tealRoute, day2, tealHeadsign, twelveToFiveOnceAnHour, tealStops)
TripsFromShorelineAtTimes(tealRoute, day2, tealHeadsign, fiveThirtyToTenThirtyEveryHalfHour, tealStops)
TripsFromShorelineAtTimes(tealRoute, day3, tealHeadsign, oneThirtyToFourThirtyOnceAnHour, tealStops)


# Orange route: Shoreline -> Towneplace -> Hotel Avante
orangeHeadsign = 'To Hotel Avante & Grand Hotel'
orangeStops = [
    {'stop': towneplace, 'delta_minutes': 20},
    {'stop': hotelAvante, 'delta_minutes': 10}
]

TripsFromShorelineAtTimes(orangeRoute, day1, orangeHeadsign, elevenToFiveOnceAnHour, orangeStops)
TripsFromShorelineAtTimes(orangeRoute, day1, orangeHeadsign, fiveThirtyToTenThirtyEveryHalfHour, orangeStops)
TripsFromShorelineAtTimes(orangeRoute, day2, orangeHeadsign, twelveToFiveOnceAnHour, orangeStops)
TripsFromShorelineAtTimes(orangeRoute, day2, orangeHeadsign, fiveThirtyToTenThirtyEveryHalfHour, orangeStops)
TripsFromShorelineAtTimes(orangeRoute, day3, orangeHeadsign, oneThirtyToFourThirtyOnceAnHour, orangeStops)

# Indigo route: Shoreline -> Country Inn & Suites by Carlson
indigoHeadsign = 'To Country Inn & Suites by Carlson'
indigoStops = [
    {'stop': countryInnAndSuites, 'delta_minutes': 20}
]

TripsFromShorelineAtTimes(indigoRoute, day1, indigoHeadsign, elevenToFiveOnceAnHour, indigoStops)
TripsFromShorelineAtTimes(indigoRoute, day1, indigoHeadsign, fiveThirtyToTenThirtyEveryHalfHour, indigoStops)
TripsFromShorelineAtTimes(indigoRoute, day2, indigoHeadsign, twelveToFiveOnceAnHour, indigoStops)
TripsFromShorelineAtTimes(indigoRoute, day2, indigoHeadsign, fiveThirtyToTenThirtyEveryHalfHour, indigoStops)
TripsFromShorelineAtTimes(indigoRoute, day3, indigoHeadsign, oneThirtyToFourThirtyOnceAnHour, indigoStops)

# San Francisco and Millbrae BART
hyattRegencyEmbarcaderoHeadsign = 'Hyatt Regency Embarcadero, via Millbrae BART'

TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '18:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '18:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '19:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '19:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '20:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '20:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '21:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '21:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '22:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day1, hyattRegencyEmbarcaderoHeadsign, '22:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])

TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '18:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '18:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '19:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '19:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '20:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '20:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '21:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '21:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '22:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])
TripFromShoreline(sfRoute, day2, hyattRegencyEmbarcaderoHeadsign, '22:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 45},
    {'stop': hyattRegencyEmbarcaderoSF, 'delta_minutes': 30}
])

TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '12:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '13:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '14:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '14:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '15:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '15:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '16:00:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])
TripFromShoreline(sfRoute, day3, hyattRegencyEmbarcaderoHeadsign, '16:30:00', [
    {'stop':millbraeBart, 'delta_minutes': 80},
    {'stop':hyattRegencyEmbarcaderoSF, 'delta_minutes': 40}
])


# Day 3 Airport Shuttles
sfoHeadsign = 'San Francisco International Airport'
sjcHeadsign = 'Mineta San José International Airport'

TripFromShoreline(sfoRoute, day3, sfoHeadsign, '12:30:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])
TripFromShoreline(sfoRoute, day3, sfoHeadsign, '13:30:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])
TripFromShoreline(sfoRoute, day3, sfoHeadsign, '14:00:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])
TripFromShoreline(sfoRoute, day3, sfoHeadsign, '14:30:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])
TripFromShoreline(sfoRoute, day3, sfoHeadsign, '15:00:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])
TripFromShoreline(sfoRoute, day3, sfoHeadsign, '15:30:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])
TripFromShoreline(sfoRoute, day3, sfoHeadsign, '16:00:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])
TripFromShoreline(sfoRoute, day3, sfoHeadsign, '16:30:00', [
    {'stop': sfoAirport, 'delta_minutes': 60}
])

TripFromShoreline(sjcRoute, day3, sjcHeadsign, '12:30:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])
TripFromShoreline(sjcRoute, day3, sjcHeadsign, '13:30:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])
TripFromShoreline(sjcRoute, day3, sjcHeadsign, '14:00:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])
TripFromShoreline(sjcRoute, day3, sjcHeadsign, '14:30:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])
TripFromShoreline(sjcRoute, day3, sjcHeadsign, '15:00:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])
TripFromShoreline(sjcRoute, day3, sjcHeadsign, '15:30:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])
TripFromShoreline(sjcRoute, day3, sjcHeadsign, '16:00:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])
TripFromShoreline(sjcRoute, day3, sjcHeadsign, '16:30:00', [
    {'stop': sjcAirport, 'delta_minutes': 30}
])

# Day 0 Loop services.
# TODO(brettmorgan): Confirm if this is appropriate

day0LoopTimes = [
    '06:30:00', '07:00:00', '07:30:00', '08:00:00', '08:30:00', '09:00:00',
    '09:30:00', '10:00:00', '10:30:00', '11:00:00', '11:30:00', '12:00:00',
    '12:30:00', '13:00:00', '13:30:00', '14:00:00', '14:30:00', '15:00:00',
    '15:30:00', '16:00:00', '16:30:00', '17:00:00', '17:30:00', '18:00:00',
    '18:30:00', '19:00:00'
]

# Day 0 loop for MTV Caltrain <=> Shoreline Amphitheatre
MultistopTripsToShorelineAtTimes(mtvCaltrainRoute, day0, 'Mountain View Caltrain Loop', day0LoopTimes, [
    {'stop': mtvCaltrain, 'delta_minutes': 15},
    {'stop': shorelineAmphitheatre, 'delta_minutes': 15}
])

# Day 0 loop for Yellow Route
MultistopTripsToShorelineAtTimes(yellowRoute, day0, 'Hilton Garden Inn Palo Alto, Sheraton Palo Alto, Westin, and Palo Alto Caltrain Loop', day0LoopTimes, [
    {'stop': hiltonGardenInnPaloAlto, 'delta_minutes': 15},
    {'stop': sheratonPaloAlto, 'delta_minutes': 10},
    {'stop': paloAltoCaltrain, 'delta_minutes': 10},
    {'stop': shorelineAmphitheatre, 'delta_minutes': 25},
])

# Day 0 loop for Lime Route
MultistopTripsToShorelineAtTimes(limeRoute, day0, 'Avatar Hotel & Plaza Suites Loop', day0LoopTimes, [
    {'stop': avatarHotel, 'delta_minutes': 25},
    {'stop': plazaSuites, 'delta_minutes': 10},
    {'stop': shorelineAmphitheatre, 'delta_minutes': 25}
])

# Day 0 loop for Teal Route
MultistopTripsToShorelineAtTimes(tealRoute, day0, 'Aloft Sunnyvale & Wild Palms Hotel Loop', day0LoopTimes, [
    {'stop': aloftSunnyvale, 'delta_minutes': 30},
    {'stop': wildPalmsHotel, 'delta_minutes': 20},
    {'stop': shorelineAmphitheatre, 'delta_minutes': 30}
])

# Day 0 loop for Orange Route
MultistopTripsToShorelineAtTimes(orangeRoute, day0, 'Hotel Avante & Grand Hotel Loop', day0LoopTimes, [
    {'stop': towneplace, 'delta_minutes': 15},
    {'stop': hotelAvante, 'delta_minutes': 15},
    {'stop': shorelineAmphitheatre, 'delta_minutes': 25}
])

# Day 0 loop for Indigo Route
MultistopTripsToShorelineAtTimes(indigoRoute, day0, 'Country Inn & Suites by Carlson Loop', day0LoopTimes, [
    {'stop': countryInnAndSuites, 'delta_minutes': 20},
    {'stop': shorelineAmphitheatre, 'delta_minutes': 20}
])

schedule.Validate()
schedule.WriteGoogleTransitFeed(options.output)
