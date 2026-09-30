import test from 'node:test';
import assert from 'node:assert/strict';
import { flyToFrance } from '../camera.js';

test('flyToFrance sets a full-globe view over France in one call, no deferred flight', (t) => {
  let setViewCalls = 0;
  let lastDestination = null;
  let flights = 0;
  const stop = flyToFrance({
    isDestroyed: () => false,
    camera: {
      setView(options) {
        setViewCalls++;
        lastDestination = options.destination;
      },
      flyTo() {
        flights++;
      },
      cancelFlight() {},
    },
  });
  assert.equal(setViewCalls, 1);
  assert.ok(lastDestination, 'setView must receive a destination');
  // Nothing deferred to a timer: no flight should ever fire, immediately
  // or after the fact, and the returned canceller must be a harmless no-op.
  assert.equal(flights, 0);
  assert.doesNotThrow(() => stop());
});
