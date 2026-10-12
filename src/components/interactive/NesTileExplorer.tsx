import { useId, useState } from "react";
import {
	composeNametable,
	createDemoTiles,
	createEmptyTile,
	getTilePixel,
	getTilePixelLocation,
	hex,
	setTilePixel,
} from "./nes-tile-model";
import "./NesTileExplorer.css";

const tileIds = [0, 1, 2, 3] as const;
const byteOffsets = Array.from({ length: 16 }, (_, offset) => offset);
const pixels = Array.from({ length: 8 }, (_, y) =>
	Array.from({ length: 8 }, (_, x) => ({ x, y, key: `${x},${y}` })),
).flat();
const palette = [
	{ id: 0, color: "#242331" },
	{ id: 1, color: "#e85d4a" },
	{ id: 2, color: "#f3c969" },
	{ id: 3, color: "#67a89a" },
];
const nametableCells = [
	{ key: "0,0", x: 0, y: 0, idIndex: 0 },
	{ key: "1,0", x: 1, y: 0, idIndex: 1 },
	{ key: "0,1", x: 0, y: 1, idIndex: 2 },
	{ key: "1,1", x: 1, y: 1, idIndex: 3 },
];
const demo = createDemoTiles;

export default function NesTileExplorer() {
	const id = useId();
	const [tiles, setTiles] = useState(demo);
	const [selectedTile, setSelectedTile] = useState(0);
	const [x, setX] = useState(3);
	const [y, setY] = useState(3);
	const [ids, setIds] = useState([0, 1, 2, 3]);
	const tile = tiles[selectedTile];
	const color = getTilePixel(tile, x, y);
	const location = getTilePixelLocation(x, y);
	const nametable = composeNametable(tiles, ids);

	function paint(nextColor: number, px = x, py = y) {
		setTiles((current) =>
			current.map((item, index) =>
				index === selectedTile ? setTilePixel(item, px, py, nextColor) : item,
			),
		);
	}

	return (
		<section
			className="not-prose nes-tile-explorer text-90"
			data-pagefind-ignore
			aria-label="NES 2bpp 图块交互演示"
		>
			<div className="nes-heading">
				<div>
					<span className="nes-eyebrow">NES CHR · 8 × 8 · 16 BYTES</span>
					<h3>像素如何变成 Tile 字节</h3>
				</div>
				<span className="nes-state">
					Tile {selectedTile} · ({x}, {y}) · 颜色 {color}
				</span>
			</div>
			<p className="nes-hint">
				每行的低位平面在前 8 字节，高位平面在后 8 字节；左侧像素对应 bit
				7。点击像素按 0 → 1 → 2 → 3 循环，方向键移动，空格也可循环颜色。
			</p>

			<div className="nes-layout">
				<div>
					<fieldset className="nes-tile-picker">
						<legend>选择要编辑的 Tile</legend>
						{tileIds.map((tileId) => (
							<button
								type="button"
								key={tileId}
								className={selectedTile === tileId ? "is-selected" : ""}
								aria-pressed={selectedTile === tileId}
								onClick={() => setSelectedTile(tileId)}
							>
								编辑 Tile {tileId}
							</button>
						))}
					</fieldset>
					<fieldset className="nes-editor">
						<legend className="nes-visually-hidden">
							Tile {selectedTile} 的 8 乘 8 像素编辑区
						</legend>
						{pixels.map(({ x: px, y: py, key }) => {
							const value = getTilePixel(tile, px, py);
							return (
								<button
									key={key}
									type="button"
									className={`nes-pixel${px === x && py === y ? " is-selected" : ""}`}
									style={
										{
											"--nes-pixel-color": palette[value].color,
										} as React.CSSProperties
									}
									aria-label={`Tile ${selectedTile} 像素 (${px}, ${py})，颜色 ${value}`}
									aria-pressed={px === x && py === y}
									onClick={() => {
										setX(px);
										setY(py);
										paint((value + 1) % 4, px, py);
									}}
									onKeyDown={(event) => {
										const steps: Record<string, [number, number]> = {
											ArrowLeft: [-1, 0],
											ArrowRight: [1, 0],
											ArrowUp: [0, -1],
											ArrowDown: [0, 1],
										};
										if (event.key === " " || event.key === "Enter") {
											event.preventDefault();
											setX(px);
											setY(py);
											paint((value + 1) % 4, px, py);
											return;
										}
										const step = steps[event.key];
										if (step) {
											event.preventDefault();
											const nx = Math.max(0, Math.min(7, px + step[0]));
											const ny = Math.max(0, Math.min(7, py + step[1]));
											setX(nx);
											setY(ny);
											document
												.getElementById(`${id}-pixel-${ny * 8 + nx}`)
												?.focus();
										}
									}}
									id={`${id}-pixel-${py * 8 + px}`}
									tabIndex={px === x && py === y ? 0 : -1}
								/>
							);
						})}
					</fieldset>
					<div className="nes-actions">
						<button
							type="button"
							onClick={() =>
								setTiles((current) =>
									current.map((item, index) =>
										index === selectedTile ? createEmptyTile() : item,
									),
								)
							}
						>
							清空 Tile {selectedTile}
						</button>
						<button
							type="button"
							onClick={() => {
								setTiles(demo());
								setIds([0, 1, 2, 3]);
							}}
						>
							恢复自绘示例
						</button>
					</div>
					<div className="nes-palette">
						{palette.map(({ id: colorId, color: swatch }) => (
							<span key={colorId}>
								<i style={{ background: swatch }} />
								颜色 {colorId}
							</span>
						))}
					</div>
					<p className="nes-note">
						颜色编号只是教学配色。真实 NES 像素值会由调色板映射到颜色，CHR-ROM
						本身不直接储存 RGB。
					</p>
				</div>

				<div className="nes-data">
					<div className="nes-metrics" aria-live="polite" aria-atomic="true">
						<div>
							<span>选中像素的两位（高位在前）</span>
							<strong>
								{(color >> 1) & 1}
								{color & 1}₂ · {color}
							</strong>
						</div>
						<div>
							<span>低位平面 · byte offset</span>
							<strong>
								+{location.lowOffset} = {hex(tile[location.lowOffset])}
							</strong>
						</div>
						<div>
							<span>高位平面 · byte offset</span>
							<strong>
								+{location.highOffset} = {hex(tile[location.highOffset])}
							</strong>
						</div>
						<div>
							<span>像素 mask</span>
							<strong>{hex(location.mask)}</strong>
						</div>
					</div>
					<section
						className="nes-hex"
						aria-label="当前 Tile 的 16 字节十六进制预览"
					>
						{byteOffsets.map((byteOffset) => (
							<span
								className={
									byteOffset === location.lowOffset ||
									byteOffset === location.highOffset
										? "is-selected"
										: ""
								}
								key={byteOffset}
							>
								<small>+{byteOffset.toString(16).padStart(2, "0")}</small>
								{hex(tile[byteOffset])}
							</span>
						))}
					</section>
					<div className="nes-nametable">
						<div className="nes-subheading">
							<strong>2 × 2 Nametable 小预览</strong>
							<span>拼成 16 × 16 像素</span>
						</div>
						<div className="nes-mini-grid">
							{nametableCells.map(({ key, x: cellX, y: cellY, idIndex }) => (
								<label key={key} htmlFor={`${id}-cell-${key}`}>
									<span>
										位置 ({cellX}, {cellY})
									</span>
									<select
										id={`${id}-cell-${key}`}
										aria-label={`Nametable 位置 (${cellX}, ${cellY}) 的 Tile ID`}
										value={ids[idIndex]}
										onChange={(event) =>
											setIds((current) =>
												current.map((item, index) =>
													index === idIndex
														? Number(event.currentTarget.value)
														: item,
												),
											)
										}
									>
										{tileIds.map((tileId) => (
											<option value={tileId} key={tileId}>
												Tile {tileId}
											</option>
										))}
									</select>
									<div className="nes-mini-tile" aria-hidden="true">
										{pixels.map(({ x: pixelX, y: pixelY, key: pixelKey }) => (
											<i
												key={pixelKey}
												style={{
													background:
														palette[
															nametable[
																(cellY * 8 + pixelY) * 16 + cellX * 8 + pixelX
															]
														].color,
												}}
											/>
										))}
									</div>
								</label>
							))}
						</div>
						<p className="nes-note">
							Nametable 存的是 Tile ID，不是像素；编辑 Tile 0 时，所有引用 ID 0
							的位置都会同步变化。真实背景通常为 32 × 30 个
							Tile；此处简化为四格并共用一个子调色板。真实属性表按 16 × 16
							像素区域选择背景子调色板。
						</p>
					</div>
				</div>
			</div>
		</section>
	);
}
