//const nearestPoint = require('@turf/nearest-point').default;
const distance = require('@turf/distance').default;
const {point, featureCollection} = require('@turf/helpers');

/*
const vertices = _pathFinder._graph.vertices;
const _points = featureCollection(Object.keys(vertices)
  .filter(nodeName => Object.keys(vertices[nodeName]).length)
  .map(nodeName => point(_pathFinder._graph.sourceVertices[nodeName])));

const origin = nearestPoint(originPoint, this._points);
const leg = _pathFinder.findPath(origin, dest);
if (leg === null || leg.path.length < 2) {
  return;
}
*/
module.exports = {
  genczml: function (opts) {
    // Set the time to daytime because buildings are dark at night.
    const epochms = new Date('2024-05-04T12:00:00+09:00').getTime();
    const modelpos = mkczml1('modelpos', opts.path, epochms, opts.gltfurl, opts.altitude || 0);
    const arr = modelpos.position.cartographicDegrees;
    const endtm = arr[arr.length - 4];
    const availendms = epochms + endtm * 1000;
    const intervalstr = modelpos.position.epoch + '/' + (new Date(availendms).toISOString());
    const czml = [{
      id: 'document',
      name: 'path-czml',
      version: '1.0',
      clock: {
        interval: intervalstr,
        currentTime: modelpos.position.epoch,
        multiplier: 5
      },
    }];
    czml.push(modelpos);
    if (opts.addPolyline) {
      czml.push(modelpos2polyline(modelpos));
    }
    return czml;
  }
};

function mkczml1(id, path, epochms, gltfurl, altitude) {
  const speed = 2.0; // [m/s]
  const arr = [];
  let tm = 0;
  path.forEach((p, i, ps) => {
    if (i > 0) {
      const d = distance(point(ps[i-1]), point(p)); // [km]
      tm += d * 1000 / speed;
    }
    arr.push(Math.round(tm)); // seconds from epoch
    arr.push(p[0]); // longitude
    arr.push(p[1]); // latitude
    arr.push(altitude);
  });
  const availendms = epochms + tm * 1000;
  const epochstr = new Date(epochms).toISOString();
  const availability = epochstr + '/' + (new Date(availendms).toISOString());
  return {
    id,
    availability,
    model: {
      show: false,
      gltf: gltfurl,
      minimumPixelSize: 1,
      heightReference: 'RELATIVE_TO_GROUND'
    },
    orientation: {
      velocityReference: '#position'
    },
    position: {
      epoch: epochstr,
      cartographicDegrees: arr
    },
  };
}

function modelpos2polyline(czml1) {
  return {
    id: `polyline-${czml1.id}`,
    polyline: {
      show: true,
      clampToGround: true,
      positions: {
        cartographicDegrees: czml1.position.cartographicDegrees.filter((x, idx) => idx % 4 !== 0)
      },
    }
  };
}
