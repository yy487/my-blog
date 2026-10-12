import assert from "node:assert/strict";
import {
	fontCapacity,
	mapCpuAddress,
} from "../src/components/interactive/nes-mapping-model.ts";

assert.deepEqual(mapCpuAddress(0x8000, 3), {
	bank: 3,
	offsetInBank: 0,
	prgOffset: 49152,
});
assert.deepEqual(mapCpuAddress(0xbfff, 2), {
	bank: 2,
	offsetInBank: 16383,
	prgOffset: 49151,
});
assert.deepEqual(mapCpuAddress(0xc000, 0), {
	bank: 7,
	offsetInBank: 0,
	prgOffset: 114688,
});
assert.deepEqual(mapCpuAddress(0xffff, 0), {
	bank: 7,
	offsetInBank: 16383,
	prgOffset: 131071,
});
assert.equal(mapCpuAddress(0x7fff, 0), null);
assert.equal(fontCapacity(1500, 16, 4096).requiredBytes / 1024, 93.75);
assert.equal(fontCapacity(1, 16, 4096).residentCharacters, 64);
assert.equal(fontCapacity(1, 16, 8192).residentCharacters, 128);
console.log("NES mapping checks passed");
