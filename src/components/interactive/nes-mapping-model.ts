export const PRG_BANK_BYTES = 16 * 1024;
export const PRG_BANK_COUNT = 8;
export const CPU_SWITCH_START = 0x8000;
export const CPU_SWITCH_END = 0xbfff;
export const CPU_FIXED_START = 0xc000;
export const CPU_END = 0xffff;

export function mapCpuAddress(address: number, selectedBank: number) {
	if (
		!Number.isInteger(address) ||
		address < CPU_SWITCH_START ||
		address > CPU_END
	)
		return null;
	if (!Number.isInteger(selectedBank) || selectedBank < 0 || selectedBank > 7)
		return null;
	const bank = address <= CPU_SWITCH_END ? selectedBank : PRG_BANK_COUNT - 1;
	const offsetInBank =
		address <= CPU_SWITCH_END
			? address - CPU_SWITCH_START
			: address - CPU_FIXED_START;
	return {
		bank,
		offsetInBank,
		prgOffset: bank * PRG_BANK_BYTES + offsetInBank,
	};
}

export function fontCapacity(
	characters: number,
	tileSize: 8 | 16,
	tableBytes: 4096 | 8192,
) {
	const bytesPerCharacter = tileSize === 8 ? 16 : 64;
	const requiredBytes = characters * bytesPerCharacter;
	const availableTiles = tableBytes / 16;
	const tilesPerCharacter = tileSize === 8 ? 1 : 4;
	return {
		bytesPerCharacter,
		requiredBytes,
		requiredTiles: characters * tilesPerCharacter,
		residentCharacters: Math.floor(availableTiles / tilesPerCharacter),
		batches: Math.ceil(
			characters / Math.floor(availableTiles / tilesPerCharacter),
		),
	};
}
