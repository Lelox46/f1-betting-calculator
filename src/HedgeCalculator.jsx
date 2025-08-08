import React, { useState, useCallback } from "react";

/**
 * Polymarket Hedge Calculator — v3.1
 * -----------------------------------------------------------------
 * Changes in this patch
 * • Budget block pulled into its own highlighted card so it’s impossible to miss.
 * • Minor wording tweaks.
 */

export default function HedgeCalculator() {
    /** ---------------- State ---------------- */
    const [budget, setBudget] = useState("100");
    const [autoIdx, setAutoIdx] = useState(0);
    const [markets, setMarkets] = useState([
        { id: 0, name: "Driver A", price: "0.4", profit: 20 },
        { id: 1, name: "Driver B", price: "0.37", profit: 3 },
        { id: 2, name: "Driver C", price: "0.13", profit: 0 },
    ]);
    const [nextId, setNextId] = useState(3);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    /** Compute dynamic slider bounds so the full range is usable */
    const getProfitBounds = (profit) => {
        const max = Math.max(profit * 2, 10);
        return { min: 0, max };
    };

    /** Rebalance */
    const rebalance = useCallback(
        (arr, changedIdx = null) => {
            const B = parseFloat(budget) || 0;
            const p = arr.map((m) => parseFloat(m.price) || 0);
            const costExceptAuto = arr.reduce(
                (acc, m, i) => (i === autoIdx ? acc : acc + p[i] * (B + m.profit)),
                0
            );
            let kAuto = p[autoIdx] ? (B - costExceptAuto) / p[autoIdx] - B : 0;

            if (kAuto < 0) {
                if (changedIdx !== null && changedIdx !== autoIdx) {
                    const i = changedIdx;
                    const delta = (-kAuto * p[autoIdx]) / p[i];
                    arr = arr.map((m, idx) =>
                        idx === i ? { ...m, profit: clamp(m.profit - delta, 0, Infinity) } : m
                    );
                } else {
                    const ratio = B / costExceptAuto;
                    arr = arr.map((m, idx) =>
                        idx === autoIdx
                            ? m
                            : { ...m, profit: clamp((B + m.profit) * ratio - B, 0, Infinity) }
                    );
                }
                const cost2 = arr.reduce(
                    (acc, m, j) => (j === autoIdx ? acc : acc + p[j] * (B + m.profit)),
                    0
                );
                kAuto = p[autoIdx] ? (B - cost2) / p[autoIdx] - B : 0;
            }
            kAuto = Math.max(0, kAuto);
            return arr.map((m, i) => (i === autoIdx ? { ...m, profit: kAuto } : m));
        },
        [autoIdx, budget]
    );

    /** Derived */
    const marketsAdj = rebalance(markets);
    const Bnum = parseFloat(budget) || 0;
    const stakes = marketsAdj.map((m) => Bnum + m.profit);
    const totalCost = marketsAdj.reduce(
        (s, m, i) => s + (parseFloat(m.price) || 0) * stakes[i],
        0
    );
    const sumPrices = marketsAdj.reduce(
        (s, m) => s + (parseFloat(m.price) || 0),
        0
    );

    /** Event handlers */
    const updateMarket = (idx, key, value) => {
        setMarkets((prev) => {
            const arr = [...prev];
            arr[idx] = { ...arr[idx], [key]: value };
            return key === "profit" ? rebalance(arr, idx) : arr;
        });
    };

    const addOutcome = () => {
        setMarkets((prev) => [
            ...prev,
            { id: nextId, name: "New Driver", price: "0.2", profit: 0 },
        ]);
        setNextId((i) => i + 1);
    };
    const removeOutcome = (idx) => {
        if (markets.length <= 2) return;
        setMarkets((prev) => prev.filter((_, i) => i !== idx));
        setAutoIdx((prev) => {
            if (prev === idx) return 0;
            if (prev > idx) return prev - 1;
            return prev;
        });
    };

    /** Render */
    return (
        <div className="p-6 mx-auto max-w-4xl space-y-8">
            <h1 className="text-3xl font-bold mb-4">Polymarket Hedge Calculator</h1>

            {/* Budget card */}
            <div className="border border-gray-700 rounded-xl bg-gray-800 shadow-inner p-6 flex flex-col sm:flex-row flex-wrap items-center gap-4">
                <label htmlFor="budget" className="font-semibold text-lg">
                    Available money to bet ($):
                </label>
                <input
                    id="budget"
                    type="number"
                    min={0}
                    step={1}
                    className="border border-gray-600 rounded px-3 py-2 text-lg w-full sm:w-40 bg-gray-700 text-gray-100"
                    placeholder="e.g. 100"
                    value={budget}
                    onChange={(e) => setBudget(e.target.value)}
                />
            </div>

            {/* Outcomes */}
            <div className="space-y-6">
                {marketsAdj.map((m, idx) => {
                    const { min, max } = getProfitBounds(m.profit);
                    return (
                    <div key={m.id} className="border border-gray-700 rounded-xl p-4 bg-gray-800 shadow-lg space-y-3">
                        <div className="flex flex-col sm:flex-row flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <label htmlFor={`name-${idx}`} className="font-medium">
                                    Name:
                                </label>
                                <input
                                    id={`name-${idx}`}
                                    className="border border-gray-600 rounded px-2 py-1 w-full sm:w-40 bg-gray-700 text-gray-100"
                                    placeholder="Outcome name"
                                    value={m.name}
                                    onChange={(e) => updateMarket(idx, "name", e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2 w-full sm:w-auto">
                                <label htmlFor={`price-${idx}`} className="font-medium">
                                    YES price:
                                </label>
                                <input
                                    id={`price-${idx}`}
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className="border border-gray-600 rounded px-2 py-1 w-full sm:w-24 bg-gray-700 text-gray-100"
                                    placeholder="0.50"
                                    value={m.price}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        updateMarket(
                                            idx,
                                            "price",
                                            val === "" ? "" : clamp(parseFloat(val), 0, 1)
                                        );
                                    }}
                                />
                            </div>
                            <label
                                htmlFor={`auto-${idx}`}
                                className="flex items-center gap-1 cursor-pointer select-none"
                            >
                                <input
                                    id={`auto-${idx}`}
                                    type="radio"
                                    name="auto"
                                    checked={autoIdx === idx}
                                    onChange={() => setAutoIdx(idx)}
                                />
                                Auto-balance
                            </label>
                            {markets.length > 2 && (
                                <button
                                    onClick={() => removeOutcome(idx)}
                                    className="text-red-400 hover:text-red-300 font-semibold ml-auto"
                                >
                                    Remove Outcome
                                </button>
                            )}
                        </div>
                        <label
                            htmlFor={`profit-${idx}`}
                            className="flex justify-between items-center font-semibold mt-2"
                        >
                            <span>Profit if wins:</span>
                            <span className="text-blue-400">${m.profit.toFixed(2)}</span>
                        </label>
                        <div className="flex items-center gap-2">
                            <input
                                id={`profit-${idx}`}
                                type="range"
                                min={min}
                                disabled={autoIdx === idx}
                                className={`w-full bg-gray-700 ${autoIdx === idx ? "opacity-40" : ""}`}
                                value={m.profit}
                                max={max}
                                step={0.01}
                                aria-valuemin={min}
                                aria-valuemax={max}
                                aria-valuenow={m.profit}
                                onChange={(e) => updateMarket(idx, "profit", parseFloat(e.target.value))}
                            />
                            <span className="text-sm text-gray-300 w-16 text-right">
                                ${m.profit.toFixed(2)}
                            </span>
                        </div>
                        <div className="text-sm text-gray-300 grid grid-cols-3 gap-4 mt-1">
                            <div>
                                Stake: <strong>{stakes[idx].toFixed(4)}</strong>
                            </div>
                            <div>
                                Cost: <strong>${(stakes[idx] * (parseFloat(m.price) || 0)).toFixed(2)}</strong>
                            </div>
                            <div>YES price: ${(parseFloat(m.price) || 0).toFixed(2)}</div>
                        </div>
                    </div>
                    );
                })}
            </div>

            <button
                onClick={addOutcome}
                className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl shadow"
            >
                + Add Outcome
            </button>

            <div className="text-right font-medium pt-6 border-t border-gray-700 mt-6">
                Total cost = ${totalCost.toFixed(2)} / {Bnum}
            </div>
            {sumPrices >= 1 && (
                <div className="text-red-400 font-semibold text-center mt-4">
                    Arbitrage impossible: sum of YES prices ≥ 1.
                </div>
            )}
        </div>
    );
}
