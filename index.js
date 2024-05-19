var L = require('leaflet'),
    Router = require('./router'),
    genczml = require("./genczml"),
    extent = require('turf-extent'),
    {lineString} = require("@turf/helpers"),
    lineDistance = require('@turf/line-distance');

L.Icon.Default.imagePath = 'images/';

require('leaflet.icon.glyph');
require('leaflet-routing-machine');

var baseLayer = L.tileLayer('https://tile.openstreetmap.jp/styles/osm-bright/512/{z}/{x}/{y}.png', {
    attribution: '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
});
var map = L.map('map', {
    layers: [baseLayer]
});
var layerControl = L.control.layers(
    { 'osm-bright': baseLayer }, null, { position: 'bottomright'}
).addTo(map);

const urlParams = new URLSearchParams(document.location.search);
const networkjson = urlParams.get('networkjson');
// waypointLatLng=35.6983,139.7725&waypointLatLng=35.6994,139.7700
let waypointParam = urlParams.getAll('waypointLatLng');
if (!networkjson && waypointParam.length === 0) {
    // default waypoints for default network.json
    waypointParam = ['35.6983,139.7725', '35.6994,139.7700'];
}
// [[35.6983, 139.7725], [35.6994, 139.7700]]
const waypoints = waypointParam.map(latLngStr => latLngStr.split(','))
    .map(latLngArray => latLngArray.map(s => Number(s)));
fetch(networkjson || 'network.geojson')
    .then(resp => resp.json())
    .then(json => initialize(json, waypoints))
    .catch(err => {
        alert('Could not load routing network :( HTTP ' + err.message);
    });

var control;
var networkLayer;
function initialize(network, waypoints) {
    if (networkLayer) {
        layerControl.removeLayer(networkLayer);
    }
    if (control) {
        control.remove();
    }
    map.eachLayer(layer => {
        if (layer !== baseLayer) {
            map.removeLayer(layer)
        }
    });

    var bbox = network.metaData && network.metaData.generatingBbox || extent(network);
    console.log('bbox', bbox);
    var bounds = L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);
    map.fitBounds(bounds);

    L.rectangle(bounds, {color: 'orange', weight: 1, fillOpacity: 0.03, interactive: false}).addTo(map);

    var router = new Router(network);
    control = L.Routing.control({
        createMarker: function(i, wp) {
            return L.marker(wp.latLng, {
                icon: L.icon.glyph({ prefix: '', glyph: String.fromCharCode(65 + i) }),
                draggable: true
            })
        },
        router: router,
        routeWhileDragging: true,
        routeDragInterval: 100
    }).addTo(map);
    if (waypoints) {
        control.setWaypoints(waypoints);
    }

    var totalDistance = network.features.reduce(function(total, feature) {
            if (feature.geometry.type === 'LineString') {
                return total += lineDistance(feature, 'kilometers');
            } else {
                return total;
            }
        }, 0),
        graph = router._pathFinder.graph.compactedVertices,
        nodeNames = Object.keys(graph),
        totalNodes = nodeNames.length,
        totalEdges = nodeNames.reduce(function(total, nodeName) {
            return total + Object.keys(graph[nodeName]).length;
        }, 0);

    var infoContainer = document.querySelector('#info-container');
    [
        ['Total Road Length', totalDistance, 'km'],
        ['Network Nodes', totalNodes / 1000, 'k'],
        ['Network Edges', totalEdges / 1000, 'k'],
        ['Coordinates', router._points.features.length / 1000, 'k']
    ].forEach(function(info) {
        var li = L.DomUtil.create('li', '', infoContainer);
        li.innerHTML = info[0] + ': <strong>' + Math.round(info[1]) + (info[2] ? '&nbsp;' + info[2] : '') + '</strong>';
    });

    networkLayer = L.layerGroup();
    var vertices = router._pathFinder.graph.sourceCoordinates,
        renderer = L.canvas().addTo(map);
    nodeNames.forEach(function(nodeName) {
        var node = graph[nodeName];
        Object.keys(node).forEach(function(neighbor) {
            var c1 = vertices[nodeName],
                c2 = vertices[neighbor];
            L.polyline([[c1[1], c1[0]], [c2[1], c2[0]]], { weight: 1, opacity: 0.4, renderer: renderer, interactive: false })
                .addTo(networkLayer)
                .bringToBack();
        });
    });
    layerControl.addOverlay(networkLayer, 'Routing Network');

    const exportGeojsonElem = document.getElementById("exportGeojson");
    exportGeojsonElem.addEventListener("click", exportGeojson);
    function exportGeojson() {
        const path = getPath();
        console.log('GeoJSON LineString', lineString(path));
        exportGeojsonElem.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(lineString(path)));
        exportGeojsonElem.download = 'path.geojson';
    }

    const exportCzmlElem = document.getElementById("exportCzml");
    exportCzmlElem.addEventListener("click", exportCzml);
    function exportCzml() {
        const path = getPath();
        const height = +document.getElementById("czmlHeight").value;
        const czml = genczml.genczml({
            path: path,
            gltfurl: 'https://gist.githubusercontent.com/deton/f14f9ee2040bbbd452211d7071db03b5/raw/78240fd3be9662240b947d2f19a8ac7b1f0c454e/walk.glb',
            altitude: height,
            addPolyline: true,
        });
        console.log('CZML', czml);
        exportCzmlElem.href = 'data:application/json,' + encodeURIComponent(JSON.stringify(czml));
        exportCzmlElem.download = 'path.czml';
    }

    function getPath() {
        // add origin and dest that may not on network.json
        const waypoints = control.getWaypoints();

        // TODO: add waypoints to exported geojson.
        // to check intermediate waypoints
        const wpCoords = waypoints.map(x => [x.latLng.lng, x.latLng.lat]);
        console.log('waypoints', {
            type: 'FeatureCollection',
            features: [{
                type: 'Feature',
                properties: {
                    id: 'waypoints',
                },
                geometry: {
                    type: 'MultiPoint',
                    coordinates: wpCoords,
                }
            }]
        });

        const origin = waypoints[0];
        const dest = waypoints.at(-1);
        return [
            [origin.latLng.lng, origin.latLng.lat],
            ...router._lastPath,
            [dest.latLng.lng, dest.latLng.lat]
        ];
    }
}

const fileInput = document.getElementById("fileElem");
fileElem.addEventListener("change", () => {
  const [file] = fileElem.files;
  if (file) {
    file.text().then(text => initialize(JSON.parse(text))).catch(console.error);
  }
  //fileElem.value = '';
});

// https://www.liedman.net/leaflet-routing-machine/tutorials/interaction/
function createButton(label, container) {
    var btn = L.DomUtil.create('button', '', container);
    btn.setAttribute('type', 'button');
    btn.innerHTML = label;
    return btn;
}

map.on('click', function(e) {
    var container = L.DomUtil.create('div'),
        startBtn = createButton('Start from this location', container),
        destBtn = createButton('Go to this location', container);

    L.DomEvent.on(startBtn, 'click', function() {
        control.spliceWaypoints(0, 1, e.latlng);
        map.closePopup();
    });

    L.DomEvent.on(destBtn, 'click', function() {
        control.spliceWaypoints(control.getWaypoints().length - 1, 1, e.latlng);
        map.closePopup();
    });

    L.popup()
        .setContent(container)
        .setLatLng(e.latlng)
        .openOn(map);
});
