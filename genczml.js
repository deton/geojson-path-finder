//const nearestPoint = require('@turf/nearest-point').default;
const distance = require('@turf/distance').default;
const {point, featureCollection} = require('@turf/helpers');
//const {featureEach} = require('@turf/meta');

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
  genczml: function (leg) {
    // 夜だと建物が暗いので、昼に固定
    //const epochms = Date.now();
    const epochms = new Date('2024-05-04T12:00:00+09:00').getTime();
    const user = mkczml1('user', leg.path, epochms, 'https://gist.githubusercontent.com/deton/f14f9ee2040bbbd452211d7071db03b5/raw/78240fd3be9662240b947d2f19a8ac7b1f0c454e/walk.glb', 0);
    const arr = user.position.cartographicDegrees;
    const endtm = arr[arr.length - 4];
    const availendms = epochms + endtm * 1000;
    const intervalstr = user.position.epoch + '/' + (new Date(availendms).toISOString());
    const czml = [{
      id: 'document',
      name: 'name',
      version: '1.0',
      clock: {
        interval: intervalstr,
        currentTime: user.position.epoch,
        multiplier: 20
      },
    }];
    czml.push(user);
    return czml;
  }
};

function mkczml1(id, path, epochms, gltfurl, altitude) {
  const speed = 0.1 + Math.random() * 3; // [m/s]
  const arr = [];
  let totalkm = 0;
  let tm = 0;
  path.forEach((p, i, ps) => {
    if (i > 0) {
      // XXX: key of compactedVertices is not path[i]
      //const cost = pathFinder._graph.compactedVertices['' + ps[i-1]]['' + p];
      const d = distance(point(ps[i-1]), point(p)); // [km]
      tm += d * 1000 / speed;
      totalkm += d;
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
      show: true,
      gltf: gltfurl,
      scale: 1,
      minimumPixelSize: 1,
      heightReference: 'CLAMP_TO_GROUND'
    },
    orientation: {
      velocityReference: '#position'
    },
    path: {
      show: false,
      resolution: 1.0
    },
    position: {
      epoch: epochstr,
      cartographicDegrees: arr
    },
    _totalkm: totalkm,
  };
}
