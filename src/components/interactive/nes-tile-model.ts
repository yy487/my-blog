export type NesTile = Uint8Array;

export const TILE_SIZE = 8;
export const TILE_BYTES = 16;
export const TILE_COLORS = 4;

export function createEmptyTile(): NesTile {
	return new Uint8Array(TILE_BYTES);
}

export function createDemoTiles(): NesTile[] {
	return [
		Uint8Array.from([
			0x3c, 0x42, 0x99, 0xa5, 0xa5, 0x99, 0x42, 0x3c, 0x00, 0x18, 0x24, 0x42,
			0x42, 0x24, 0x18, 0x00,
		]),
		Uint8Array.from([
			0x00, 0x18, 0x3c, 0x7e, 0x7e, 0x3c, 0x18, 0x00, 0x18, 0x3c, 0x66, 0x42,
			0x42, 0x66, 0x3c, 0x18,
		]),
		Uint8Array.from([
			0x00, 0x00, 0x3c, 0x42, 0x42, 0x3c, 0x00, 0x00, 0x00, 0x00, 0x24, 0x5a,
			0x5a, 0x24, 0x00, 0x00,
		]),
		Uint8Array.from([
			0x81, 0x42, 0x24, 0x18, 0x18, 0x24, 0x42, 0x81, 0x00, 0x18, 0x24, 0x42,
			0x42, 0x24, 0x18, 0x00,
		]),
	];
}

export function getTilePixel(
	tile: ArrayLike<number>,
	x: number,
	y: number,
): number {
	assertTile(tile);
	assertCoordinate(x, "x");
	assertCoordinate(y, "y");
	const mask = 0x80 >> x;
	return (
		Number((tile[y] & mask) !== 0) | (Number((tile[y + 8] & mask) !== 0) << 1)
	);
}

export function setTilePixel(
	tile: ArrayLike<number>,
	x: number,
	y: number,
	color: number,
): NesTile {
	assertTile(tile);
	assertCoordinate(x, "x");
	assertCoordinate(y, "y");
	if (!Number.isInteger(color) || color < 0 || color >= TILE_COLORS) {
		throw new RangeError("color must be an integer from 0 to 3");
	}
	const next = Uint8Array.from(tile);
	const mask = 0x80 >> x;
	for (const plane of [0, 1]) {
		const index = y + plane * 8;
		next[index] =
			color & (1 << plane) ? next[index] | mask : next[index] & ~mask;
	}
	return next;
}

export function getTilePixelLocation(x: number, y: number) {
	assertCoordinate(x, "x");
	assertCoordinate(y, "y");
	const mask = 0x80 >> x;
	return { lowOffset: y, highOffset: y + 8, mask };
}

export function composeNametable(
	tiles: readonly ArrayLike<number>[],
	ids: readonly number[],
): Uint8Array {
	if (
		ids.length !== 4 ||
		ids.some((id) => !Number.isInteger(id) || id < 0 || id >= tiles.length)
	) {
		throw new RangeError("ids must contain four valid tile indexes");
	}
	const result = new Uint8Array(16 * 16);
	for (let cellY = 0; cellY < 2; cellY++) {
		for (let cellX = 0; cellX < 2; cellX++) {
			const tile = tiles[ids[cellY * 2 + cellX]];
			assertTile(tile);
			for (let y = 0; y < 8; y++) {
				for (let x = 0; x < 8; x++) {
					result[(cellY * 8 + y) * 16 + cellX * 8 + x] = getTilePixel(
						tile,
						x,
						y,
					);
				}
			}
		}
	}
	return result;
}

export function hex(value: number): string {
	return `0x${value.toString(16).toUpperCase().padStart(2, "0")}`;
}

function assertTile(tile: ArrayLike<number>): void {
	if (
		tile.length !== TILE_BYTES ||
		Array.from(tile).some(
			(value) => !Number.isInteger(value) || value < 0 || value > 255,
		)
	) {
		throw new RangeError("tile must contain exactly 16 byte values");
	}
}

function assertCoordinate(value: number, name: string): void {
	if (!Number.isInteger(value) || value < 0 || value >= TILE_SIZE) {
		throw new RangeError(`${name} must be an integer from 0 to 7`);
	}
}
