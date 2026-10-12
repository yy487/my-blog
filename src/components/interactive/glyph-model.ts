export const GLYPH_BYTES = 32;
export const MAX_GLYPH = 4095;

export function getPixelLocation(glyph: number, x: number, y: number) {
	for (const [value, max] of [
		[glyph, MAX_GLYPH],
		[x, 15],
		[y, 15],
	]) {
		if (!Number.isInteger(value) || value < 0 || value > max) {
			throw new RangeError("Glyph or pixel coordinate is out of range.");
		}
	}
	const side = x >> 3;
	const byteIndex = y * 2 + side;
	return {
		side,
		byteIndex,
		glyphOffset: glyph * GLYPH_BYTES,
		romAddress: glyph << 4,
		byteOffset: glyph * GLYPH_BYTES + byteIndex,
		mask: 0x80 >> (x & 7),
	};
}

export function createDemoGlyph() {
	const rows = [
		0x0180, 0x0180, 0x0180, 0x1ff8, 0x1188, 0x1188, 0x1188, 0x1188, 0x1188,
		0x1188, 0x1188, 0x1ff8, 0x0180, 0x0180, 0x0180, 0x0180,
	];
	return Uint8Array.from(rows.flatMap((row) => [row >> 8, row & 0xff]));
}

export function togglePixel(bytes: Uint8Array, x: number, y: number) {
	if (bytes.length !== GLYPH_BYTES) {
		throw new RangeError("A 16 by 16 glyph must contain 32 bytes.");
	}
	const { byteIndex, mask } = getPixelLocation(0, x, y);
	const next = Uint8Array.from(bytes);
	next[byteIndex] ^= mask;
	return next;
}

export function hex(value: number, digits = 4) {
	return `0x${value.toString(16).toUpperCase().padStart(digits, "0")}`;
}
