import assert from "node:assert/strict";
import {
	composeNametable,
	createDemoTiles,
	createEmptyTile,
	getTilePixel,
	getTilePixelLocation,
	setTilePixel,
} from "../src/components/interactive/nes-tile-model.ts";

const tiles = createDemoTiles();
assert.deepEqual(
	Array.from(tiles[0].slice(0, 8)),
	[0x3c, 0x42, 0x99, 0xa5, 0xa5, 0x99, 0x42, 0x3c],
);
assert.deepEqual(getTilePixelLocation(7, 7), {
	lowOffset: 7,
	highOffset: 15,
	mask: 1,
});
const empty = createEmptyTile();
const color3 = setTilePixel(empty, 7, 7, 3);
assert.equal(color3[7] & 1, 1);
assert.equal(color3[15] & 1, 1);
assert.equal(getTilePixel(color3, 7, 7), 3);
assert.equal(empty[7] | empty[15], 0, "setTilePixel must not mutate its input");
const color1 = setTilePixel(empty, 0, 0, 1);
assert.equal(color1[0] & 0x80, 0x80);
assert.equal(color1[8] & 0x80, 0);
assert.equal(getTilePixel(color1, 0, 0), 1);
const color2 = setTilePixel(empty, 0, 0, 2);
assert.equal(color2[0] & 0x80, 0);
assert.equal(color2[8] & 0x80, 0x80);
assert.equal(getTilePixel(color2, 0, 0), 2);
assert.equal(
	composeNametable(tiles, [0, 1, 2, 3]).length,
	256,
	"2x2 tiles compose to 16x16 pixels",
);
assert.throws(() => getTilePixel(empty, 8, 0), RangeError);
assert.throws(() => getTilePixel(empty, 0, -1), RangeError);
assert.throws(() => setTilePixel(empty, 0, 0, 4), RangeError);
assert.throws(() => composeNametable(tiles, [0, 1, 2, 4]), RangeError);
console.log("NES tile model checks passed.");
