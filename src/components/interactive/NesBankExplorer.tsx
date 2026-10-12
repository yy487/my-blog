import { useId, useState } from "react";
import { mapCpuAddress, PRG_BANK_COUNT } from "./nes-mapping-model";
import "./NesMapping.css";

const banks = Array.from({ length: PRG_BANK_COUNT }, (_, bank) => ({
	id: `bank-${bank}`,
	bank,
}));

export default function NesBankExplorer() {
	const id = useId();
	const [bank, setBank] = useState(0);
	const [addressText, setAddressText] = useState("8000");
	const addressValue = addressText.trim().replace(/^\$/, "");
	const addressValid =
		/^[\da-f]{1,4}$/i.test(addressValue) &&
		Number.parseInt(addressValue, 16) >= 0x8000 &&
		Number.parseInt(addressValue, 16) <= 0xffff;
	const entered = addressValid ? Number.parseInt(addressValue, 16) : Number.NaN;
	const mapping = mapCpuAddress(entered, bank);
	return (
		<section
			className="not-prose nes-mapping text-90"
			data-pagefind-ignore
			aria-label="NES PRG Bank switching 交互演示"
		>
			<header className="nes-heading">
				<div>
					<span className="nes-eyebrow">128 KiB PRG · 8 × 16 KiB</span>
					<h3>PRG Bank switching</h3>
				</div>
			</header>
			<p className="nes-note">
				UxROM 类简化示例：$8000–$BFFF 可切换，$C000–$FFFF 固定映射最后一个
				bank（bank 7）。具体窗口与行为取决于 Mapper，并非所有卡带都如此。
			</p>
			<div className="nes-bank-controls">
				<label htmlFor={`${id}-bank`}>切换窗口 bank</label>
				<select
					id={`${id}-bank`}
					value={bank}
					onChange={(event) => setBank(Number(event.currentTarget.value))}
				>
					{banks.map(({ id: bankId, bank: value }) => (
						<option key={bankId} value={value}>
							Bank {value}
						</option>
					))}
				</select>
				<label htmlFor={`${id}-address`}>CPU 地址（十六进制）</label>
				<div className="nes-address-input">
					<span aria-hidden="true">$</span>
					<input
						id={`${id}-address`}
						inputMode="text"
						value={addressText}
						onChange={(event) => setAddressText(event.currentTarget.value)}
						aria-invalid={!addressValid}
					/>
				</div>
			</div>
			<div
				className="nes-bank-map"
				role="img"
				aria-label={`CPU窗口映射：可切换窗口 bank ${bank}，固定窗口 bank 7`}
			>
				{[
					{
						start: "$8000",
						end: "$BFFF",
						bank,
						selected: mapping !== null && entered <= 0xbfff,
					},
					{
						start: "$C000",
						end: "$FFFF",
						bank: 7,
						selected: mapping !== null && entered >= 0xc000,
					},
				].map((window) => (
					<div
						className={`nes-window${window.selected ? " is-selected" : ""}`}
						key={window.start}
					>
						<span>
							{window.start}–{window.end}
						</span>
						<strong>Bank {window.bank}</strong>
						<small>
							PRG +$
							{(window.bank * 0x4000)
								.toString(16)
								.toUpperCase()
								.padStart(5, "0")}
							–+$
							{(window.bank * 0x4000 + 0x3fff)
								.toString(16)
								.toUpperCase()
								.padStart(5, "0")}
						</small>
					</div>
				))}
			</div>
			<div className="nes-bank-strip" aria-hidden="true">
				{banks.map(({ id: bankId, bank: index }) => (
					<span
						className={`${index === bank ? "is-switch-selected" : ""}${index === 7 ? " is-fixed" : ""}`}
						key={bankId}
					>
						B{index}
					</span>
				))}
			</div>
			<div className="nes-result" aria-live="polite" aria-atomic="true">
				{mapping ? (
					<>
						<span>实际 PRG 区域偏移（不含 iNES 头 / trainer）</span>
						<strong>
							Bank {mapping.bank} · +$
							{mapping.offsetInBank.toString(16).toUpperCase().padStart(4, "0")}{" "}
							= ${mapping.prgOffset.toString(16).toUpperCase().padStart(5, "0")}
						</strong>
					</>
				) : (
					<output>请输入 $8000–$FFFF 内的有效十六进制 CPU 地址。</output>
				)}
			</div>
		</section>
	);
}
