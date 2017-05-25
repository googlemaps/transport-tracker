google_transit.zip: generate-gtfs.py
	python $<
	(cd google_transit && unzip -o ../google_transit.zip)

google_transit_uploadable.zip: google_transit/routes.txt
	(cd google_transit && zip ../google_transit_uploadable.zip *.txt)
