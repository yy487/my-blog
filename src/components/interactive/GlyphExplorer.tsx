import { useId, useRef, useState } from "react";
import {
	createDemoGlyph,
	getPixelLocation,
	hex,
	MAX_GLYPH,
	togglePixel,
} from "./glyph-model";
import "./GlyphExplorer.css";

const coordinates = Array.from({ length: 16 }, (_, index) => index);
const bitPositions = coordinates.slice(0, 8);
const directions: Record<string, [number, number]> = {
	ArrowLeft: [-1, 0],
	ArrowRight: [1, 0],
	ArrowUp: [0, -1],
	ArrowDown: [0, 1],
};

export default function GlyphExplorer() {
	const id = useId();
	const [glyph, setGlyph] = useState(1537);
	const [glyphInput, setGlyphInput] = useState("1537");
	const [x, setX] = useState(12);
	const [y, setY] = useState(5);
	const [bytes, setBytes] = useState(createDemoGlyph);
	const cells = useRef<(HTMLButtonElement | null)[]>([]);
	const location = getPixelLocation(glyph, x, y);
	const selectedByte = bytes[location.byteIndex];
	const isOn = (selectedByte & location.mask) !== 0;

	function changeGlyph(value: string) {
		setGlyphInput(value);
		const next = Number(value);
		if (
			value !== "" &&
			Number.isInteger(next) &&
			next >= 0 &&
			next <= MAX_GLYPH
		) {
			setGlyph(next);
		}
	}

	return (
		<section
			className="not-prose glyph-explorer text-90"
			data-pagefind-ignore
			aria-label="字模与字节偏移交互演示"
		>
			<div className="glyph-heading">
				<div>
					<span className="glyph-eyebrow">16 × 16 · 1 GLYPH = 32 BYTES</span>
					<h3>点阵 → 字节 → 文件偏移</h3>
				</div>
				<span className="glyph-state">
					({x}, {y}) · {isOn ? "已点亮" : "未点亮"}
				</span>
			</div>
			<p className="glyph-hint">
				点击点阵可切换像素。黄色边框标记当前坐标；键盘方向键移动，空格切换。
			</p>

			<div className="glyph-layout">
				<div>
					<fieldset className="glyph-grid" aria-label="16乘16点阵">
						<span aria-hidden="true" />
						{coordinates.map((column) => (
							<span
								key={`column-${column}`}
								className="glyph-coordinate"
								aria-hidden="true"
							>
								{column}
							</span>
						))}
						{coordinates.map((row) => (
							<div className="glyph-grid-row" key={row}>
								<span className="glyph-coordinate" aria-hidden="true">
									{row}
								</span>
								{coordinates.map((column) => {
									const pixel = getPixelLocation(glyph, column, row);
									const active = (bytes[pixel.byteIndex] & pixel.mask) !== 0;
									const selected = column === x && row === y;
									return (
										<button
											key={column}
											type="button"
											ref={(element) => {
												cells.current[row * 16 + column] = element;
											}}
											className={`glyph-pixel${active ? " is-on" : ""}${selected ? " is-selected" : ""}`}
											aria-label={`像素 (${column}, ${row})`}
											aria-pressed={active}
											tabIndex={selected ? 0 : -1}
											onClick={() => {
												setX(column);
												setY(row);
												setBytes((current) =>
													togglePixel(current, column, row),
												);
											}}
											onKeyDown={(event) => {
												const direction = directions[event.key];
												if (!direction) return;
												event.preventDefault();
												const nextX = Math.max(
													0,
													Math.min(15, column + direction[0]),
												);
												const nextY = Math.max(
													0,
													Math.min(15, row + direction[1]),
												);
												setX(nextX);
												setY(nextY);
												cells.current[nextY * 16 + nextX]?.focus();
											}}
										/>
									);
								})}
							</div>
						))}
					</fieldset>
					<div className="glyph-actions">
						<button type="button" onClick={() => setBytes(createDemoGlyph())}>
							示例字形
						</button>
						<button type="button" onClick={() => setBytes(new Uint8Array(32))}>
							清空点阵
						</button>
					</div>
					<div className="glyph-controls">
						<label htmlFor={`${id}-glyph`}>
							glyph 槽编号 <span>0–4095</span>
						</label>
						<input
							id={`${id}-glyph`}
							type="number"
							min="0"
							max={MAX_GLYPH}
							step="1"
							value={glyphInput}
							onChange={(event) => changeGlyph(event.currentTarget.value)}
							onBlur={() => setGlyphInput(String(glyph))}
						/>
						<label htmlFor={`${id}-x`}>
							x 坐标 <span>{x}</span>
						</label>
						<input
							id={`${id}-x`}
							type="range"
							min="0"
							max="15"
							value={x}
							onChange={(event) => setX(Number(event.currentTarget.value))}
						/>
						<label htmlFor={`${id}-y`}>
							y 坐标 <span>{y}</span>
						</label>
						<input
							id={`${id}-y`}
							type="range"
							min="0"
							max="15"
							value={y}
							onChange={(event) => setY(Number(event.currentTarget.value))}
						/>
					</div>
					<button
						className="glyph-toggle"
						type="button"
						onClick={() => setBytes((current) => togglePixel(current, x, y))}
					>
						切换所选像素 ({x}, {y})
					</button>
				</div>

				<div>
					<div className="glyph-metrics" aria-live="polite" aria-atomic="true">
						<div>
							<span>字模起点 · ROM address</span>
							<strong>{hex(location.romAddress)}</strong>
						</div>
						<div>
							<span>当前像素 · 文件字节偏移</span>
							<strong>{hex(location.byteOffset)}</strong>
						</div>
						<div>
							<span>
								当前字节 · {location.side === 0 ? "左半边" : "右半边"}
							</span>
							<strong>{hex(selectedByte, 2)}</strong>
						</div>
						<div>
							<span>bit mask</span>
							<strong>{hex(location.mask, 2)}</strong>
						</div>
					</div>
					<div
						className="glyph-bits"
						role="img"
						aria-label={`当前字节二进制 ${selectedByte.toString(2).padStart(8, "0")}`}
					>
						{bitPositions.map((bit) => (
							<span className={bit === (x & 7) ? "is-selected" : ""} key={bit}>
								{(selectedByte >> (7 - bit)) & 1}
							</span>
						))}
					</div>
					<div className="glyph-formula">
						<span>offset = glyph × 0x20 + y × 2 + (x &gt;&gt; 3)</span>
						<strong>
							{hex(location.glyphOffset)} + {y} × 2 + {location.side} ={" "}
							{hex(location.byteOffset)}
						</strong>
						<span>mask = 0x80 &gt;&gt; (x &amp; 7)</span>
						<strong>
							0x80 &gt;&gt; {x & 7} = {hex(location.mask, 2)}
						</strong>
					</div>
					<table className="glyph-byte-table">
						<caption>当前字模的 32 个字节</caption>
						<thead>
							<tr>
								<th scope="col">行 y</th>
								<th scope="col">左字节</th>
								<th scope="col">右字节</th>
							</tr>
						</thead>
						<tbody>
							{coordinates.map((row) => (
								<tr key={row}>
									<th scope="row">{row}</th>
									{[0, 1].map((side) => (
										<td
											key={side}
											className={
												row === y && side === location.side ? "is-selected" : ""
											}
										>
											{hex(bytes[row * 2 + side], 2)}
										</td>
									))}
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>
		</section>
	);
}
