var L = require('leaflet'),
    Router = require('./router'),
    extent = require('turf-extent'),
    lineDistance = require('@turf/line-distance');

L.Icon.Default.imagePath = 'images/';

require('leaflet.icon.glyph');
require('leaflet-routing-machine');

var map = L.map('map');

L.tileLayer('https://tile.openstreetmap.jp/styles/osm-bright/512/{z}/{x}/{y}.png', {
        attribution: '<a href="https://www.openmaptiles.org/" target="_blank">&copy; OpenMapTiles</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>'
    })
    .addTo(map);

var xhr = new XMLHttpRequest();
xhr.onload = function() {
    if (xhr.status === 200) {
        setTimeout(function() {
            initialize(JSON.parse(xhr.responseText));
        });
    }
    else {
        alert('Could not load routing network :( HTTP ' + xhr.status);
    }
};
xhr.open('GET', 'network.json');
xhr.send();

function initialize(network) {
    var bbox = extent(network);
    console.log('bbox', bbox);
    var bounds = L.latLngBounds([bbox[1], bbox[0]], [bbox[3], bbox[2]]);
    map.fitBounds(bounds);

    L.rectangle(bounds, {color: 'orange', weight: 1, fillOpacity: 0.03, interactive: false}).addTo(map);

    var router = new Router(network),
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

    control.setWaypoints([
        [35.6982, 139.7727],
        [35.6994, 139.7698],
    ]);

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

    var networkLayer = L.layerGroup(),
        vertices = router._pathFinder.graph.sourceCoordinates,
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

    L.control.layers(null, {
        'Routing Network': networkLayer
    }, { position: 'bottomright'}).addTo(map);
}
