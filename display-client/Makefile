.PHONY: publish

publish:
	rm -rf publish/images publish/css publish/*.html publish/js
	mkdir -p publish/images/dashboard
	mkdir -p publish/images/promo
	mkdir -p publish/css
	mkdir -p publish/js
	cp -v images/*.png publish/images/
	cp -v images/dashboard/*.png publish/images/dashboard
	cp -v images/promo/*.png publish/images/promo
	cp -v css/*.css publish/css/
	cp -v js/*.js publish/js
	cp -v *.html publish/
	(cd publish/ && appcfg.py update app.yaml)

