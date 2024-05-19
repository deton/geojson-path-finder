# GeoJSON Path Finder

Modified [GeoJSON Path Finder demo](https://deton.github.io/geojson-path-finder/).

* Use uploaded network.geojson generated by [GraphFromOSM](https://deton.github.io/GraphFromOSM/).
* Export the path as GeoJSON LineString.
* Export the path as CZML.

## Query Parameters

* `networkjson`: URL of network.geojson file.
  * Example: `networkjson=https://gist.githubusercontent.com/deton/c030eae2af830364580727a291913f8e/raw/f1ab3e649e2bde20c6be67ec5be2d3c0f467e040/network-shibuya.geojson`
* `waypointLatLng`: Waypoints (origin, destination, etc.)
  * Example: `waypointLatLng=35.6983,139.7725&waypointLatLng=35.6994,139.7700`
