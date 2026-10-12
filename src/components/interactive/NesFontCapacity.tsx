import { useId, useState } from "react";
import { fontCapacity } from "./nes-mapping-model";
import "./NesMapping.css";

export default function NesFontCapacity() {
	const id = useId();
	const [countText, setCountText] = useState("1500");
	const [tileSize, setTileSize] = useState<8 | 16>(16);
	const [tableBytes, setTableBytes] = useState<4096 | 8192>(4096);
	const count = Number(countText);
	const valid = Number.isInteger(count) && count >= 1 && count <= 100000;
	const result = fontCapacity(valid ? count : 0, tileSize, tableBytes);
	return (
		<section
			className="not-prose nes-mapping text-90"
			data-pagefind-ignore
			aria-label="NES 中文字库容量估算"
		>
			<header className="nes-heading">
				<div>
					<span className="nes-eyebrow">2bpp · raw tile data</span>
					<h3>中文字库容量估算</h3>
				</div>
			</header>
			<div className="nes-font-controls">
				<label htmlFor={`${id}-count`}>不同汉字数量</label>
				<input
					id={`${id}-count`}
					type="number"
					min="1"
					max="100000"
					step="1"
					value={countText}
					aria-invalid={!valid}
					onChange={(event) => setCountText(event.currentTarget.value)}
				/>
				<label htmlFor={`${id}-size`}>单字字形尺寸</label>
				<select
					id={`${id}-size`}
					value={tileSize}
					onChange={(event) =>
						setTileSize(Number(event.currentTarget.value) as 8 | 16)
					}
				>
					<option value={8}>8 × 8（1 tile）</option>
					<option value={16}>16 × 16（4 tiles）</option>
				</select>
				<label htmlFor={`${id}-table`}>比较的 PPU 图案表空间</label>
				<select
					id={`${id}-table`}
					value={tableBytes}
					onChange={(event) =>
						setTableBytes(Number(event.currentTarget.value) as 4096 | 8192)
					}
				>
					<option value={4096}>4 KiB 单个图案表</option>
					<option value={8192}>8 KiB 两个图案表总量</option>
				</select>
			</div>
			{valid ? (
				<div
					className="nes-capacity-grid"
					aria-live="polite"
					aria-atomic="true"
				>
					<div>
						<span>原始字形数据</span>
						<strong>
							{(result.requiredBytes / 1024).toLocaleString("en-US", {
								maximumFractionDigits: 2,
							})}{" "}
							KiB
						</strong>
					</div>
					<div>
						<span>需要 tile 数</span>
						<strong>{result.requiredTiles.toLocaleString()}</strong>
					</div>
					<div>
						<span>此空间常驻字数上限</span>
						<strong>{result.residentCharacters.toLocaleString()}</strong>
					</div>
					<div>
						<span>至少分批 / Bank 数</span>
						<strong>{result.batches.toLocaleString()}</strong>
					</div>
				</div>
			) : (
				<output className="nes-note">请输入 1 到 100000 之间的整数。</output>
			)}
			<p className="nes-note">
				按未压缩数据估算：每个 8×8 tile 为 16 字节，16×16 字形由 4 个 tile
				组成，共 64
				字节。容量只按图案表原始空间计算，没有计入实际游戏给其他背景和精灵预留的图块；8
				KiB 是两个 4 KiB 表的总量，不代表单个背景能直接使用 512 个
				tile。分批数是容量除法估算，不代表具体 Mapper 的 bank 行为或实际压缩率。
			</p>
		</section>
	);
}
