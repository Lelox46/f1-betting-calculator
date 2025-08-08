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
    const [budget, setBudget] = useState(100);
    const [autoIdx, setAutoIdx] = useState(0);
    const [markets, setMarkets] = useState([
        { name: "Driver A", price: 0.4, profit: 20 },
        { name: "Driver B", price: 0.37, profit: 3 },
        { name: "Driver C", price: 0.13, profit: 0 },
    ]);
    const [, setLastChanged] = useState(1);

    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));

    /** Rebalance */
    const rebalance = useCallback(
        (arr, changedIdx = null) => {
            const B = budget;
            const p = arr.map((m) => m.price);
            const costExceptAuto = arr.reduce(
                (acc, m, i) => (i === autoIdx ? acc : acc + p[i] * (B + m.profit)),
                0
            );
            let kAuto = p[autoIdx] ? (B - costExceptAuto) / p[autoIdx] - B : 0;

            if (kAuto < 0 && changedIdx !== null && changedIdx !== autoIdx) {
                const i = changedIdx;
                const delta = (-kAuto * p[autoIdx]) / p[i];
                arr = arr.map((m, idx) =>
                    idx === i ? { ...m, profit: clamp(m.profit - delta, 0, Infinity) } : m
                );
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
    const shares = marketsAdj.map((m) => budget + m.profit);
    const totalCost = marketsAdj.reduce((s, m, i) => s + m.price * shares[i], 0);
    const sumPrices = marketsAdj.reduce((s, m) => s + m.price, 0);

    /** Event handlers */
    const updateMarket = (idx, key, value) => {
        setMarkets((prev) => {
            const arr = [...prev];
            arr[idx] = { ...arr[idx], [key]: value };
            return key === "profit" ? rebalance(arr, idx) : arr;
        });
        if (key === "profit") setLastChanged(idx);
    };

    const addOutcome = () =>
        setMarkets((prev) => [...prev, { name: "New Driver", price: 0.2, profit: 0 }]);
    const removeOutcome = (idx) => {
        if (markets.length <= 2) return;
        setMarkets((prev) => prev.filter((_, i) => i !== idx));
        if (autoIdx === idx) setAutoIdx(0);
    };

    /** Render */
    return (
        <div className="p-6 mx-auto max-w-4xl space-y-8">
            <h1 className="text-3xl font-bold mb-4">Polymarket Hedge Calculator</h1>

            {/* Budget card */}
            <div className="border rounded-xl bg-yellow-50 shadow-inner p-6 flex flex-wrap items-center gap-4">
                <label className="font-semibold text-lg">Available money to bet ($):</label>
                <input
                    type="number"
                    min={0}
                    step={1}
                    className="border rounded px-3 py-2 text-lg w-40"
                    placeholder="e.g. 100"
                    value={budget}
                    onChange={(e) => setBudget(parseFloat(e.target.value) || 0)}
                />
            </div>

            {/* Outcomes */}
            <div className="space-y-6">
                {marketsAdj.map((m, idx) => (
                    <div key={idx} className="border rounded-xl p-4 bg-white/80 shadow-lg space-y-3">
                        <div className="flex flex-wrap gap-4 items-center">
                            <div className="flex items-center gap-2">
                                <label className="font-medium">Name:</label>
                                <input
                                    className="border rounded px-2 py-1"
                                    value={m.name}
                                    onChange={(e) => updateMarket(idx, "name", e.target.value)}
                                />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="font-medium">YES price:</label>
                                <input
                                    type="number"
                                    min={0}
                                    max={1}
                                    step={0.01}
                                    className="border rounded px-2 py-1 w-24"
                                    value={m.price}
                                    onChange={(e) =>
                                        updateMarket(idx, "price", clamp(parseFloat(e.target.value) || 0, 0, 1))
                                    }
                                />
                            </div>
                            <label className="flex items-center gap-1 cursor-pointer select-none">
                                <input type="radio" checked={autoIdx === idx} onChange={() => setAutoIdx(idx)} /> Auto-balance
                            </label>
                            {markets.length > 2 && (
                                <button
                                    onClick={() => removeOutcome(idx)}
                                    className="text-red-600 hover:text-red-800 font-semibold ml-auto"
                                >
                                    Remove Outcome
                                </button>
                            )}
                        </div>
                        <div className="flex justify-between items-center font-semibold mt-2">
                            <span>
                                Profit if wins: <span className="text-blue-700">${m.profit.toFixed(2)}</span>
                            </span>
                        </div>
                        <input
                            type="range"
                            min={0}
                            disabled={autoIdx === idx}
                            className={`w-full ${autoIdx === idx ? "opacity-40" : ""}`}
                            value={m.profit}
                            max={budget * 10}
                            step={0.01}
                            onChange={(e) => updateMarket(idx, "profit", parseFloat(e.target.value))}
                        />
                        <div className="text-sm text-gray-700 grid grid-cols-3 gap-4 mt-1">
                            <div>
                                Shares: <strong>{shares[idx].toFixed(4)}</strong>
                            </div>
                            <div>
                                Cost: <strong>${(shares[idx] * m.price).toFixed(2)}</strong>
                            </div>
                            <div>YES price: ${m.price.toFixed(2)}</div>
                        </div>
                    </div>
                ))}
            </div>

            <button
                onClick={addOutcome}
                className="mt-4 inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl shadow"
            >
                + Add Outcome
            </button>

            <div className="text-right font-medium pt-6 border-t mt-6">
                Total cost = ${totalCost.toFixed(2)} / {budget}
            </div>
            {sumPrices >= 1 && (
                <div className="text-red-600 font-semibold text-center mt-4">
                    Arbitrage impossible: sum of YES prices ≥ 1.
                </div>
            )}
        </div>
    );
}
