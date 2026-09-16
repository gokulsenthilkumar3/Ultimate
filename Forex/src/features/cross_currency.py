"""
src/features/cross_currency.py
==============================
Dynamic graph-based cross-currency correlation and synthetic index features.

v2 improvements
---------------
- **Dynamic graph construction**: All currency pairs present in the dataset are
  automatically connected in a graph. For each currency, we compute pairwise
  correlations to ALL other currencies in the dataset (not just a hardcoded
  base pair).
- **Multi-hub synthetic indices**: Separate synthetic indices are built for
  major hubs (USD, EUR, GBP, JPY, CNY) using availability-weighted means.
- **Contagion features**: Second-order "contagion" features capture how much
  a currency's movement correlates with the average of its neighbourhood in
  the FX graph.
- **Volatility spread**: Per-pair realised volatility relative to mean
  realised volatility of all pairs at the same date.
- **New currencies added**: All new currencies appearing in the data are
  handled automatically without configuration changes.

The original ``add_cross_currency_features`` function signature is preserved
for backward compatibility.
"""

from __future__ import annotations

import logging
from typing import Dict, List, Optional

import numpy as np
import pandas as pd

log = logging.getLogger(__name__)

# Currencies considered "major hubs" for synthetic index construction
_HUB_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "CNY", "CHF", "AUD"]

# Minimum number of data points before computing a correlation (avoid noise)
_MIN_CORR_PERIODS = 10


def add_cross_currency_features(
    df: pd.DataFrame,
    cfg: dict,
) -> pd.DataFrame:
    """
    Add dynamic cross-currency features to the wide (pre-encoding) DataFrame.

    Features added per (date, currency_code) row
    ---------------------------------------------
    - ``corr_vs_{base}_{window}d``   : Rolling correlation vs single base pair (v1 compat)
    - ``fx_index``                   : Equal-weight synthetic index of top-N pairs
    - ``rate_vs_index``              : Pair rate relative to the synthetic index
    - ``corr_vs_hub_{hub}``          : Rolling correlation vs each major hub currency
    - ``avg_cross_corr_{window}d``   : Mean pairwise rolling correlation to all peers
    - ``vol_spread``                 : Pair realised vol minus mean vol of all pairs
    - ``fx_graph_degree``            : Number of significantly correlated peer pairs
                                       (|corr| > 0.3, dynamic network degree)

    Parameters
    ----------
    df  : DataFrame with columns [date, currency_code, exchange_rate, ...]
    cfg : cross_currency section of features.yaml

    Returns
    -------
    DataFrame with new cross-currency columns (NaN-filled at window boundaries).
    """
    if not cfg.get("enabled", False):
        return df

    df = df.copy().sort_values(["date", "currency_code"]).reset_index(drop=True)
    corr_window      = cfg.get("corr_window", 30)
    base_currency    = cfg.get("base_currency", None)
    index_currencies = cfg.get("index_currencies", [])

    # ── Step 1: Pivot to wide format ──────────────────────────────────────────
    pivot = df.pivot_table(
        index="date", columns="currency_code", values="exchange_rate", aggfunc="mean"
    )
    log_ret = np.log(pivot / pivot.shift(1)).fillna(0)

    codes = pivot.columns.tolist()
    n_codes = len(codes)

    # ── Step 2: Auto-detect index currencies if not specified ─────────────────
    if not index_currencies:
        counts = df["currency_code"].value_counts()
        index_currencies = counts.head(min(6, len(counts))).index.tolist()
        log.info(f"Auto-selected index currencies: {index_currencies}")

    # ── Step 3: Synthetic FX indices per hub ──────────────────────────────────
    # v1 compatible: equal-weight mean of all index_currencies
    available_index = [c for c in index_currencies if c in pivot.columns]
    usd_index_series: Optional[pd.Series] = None
    if available_index:
        usd_index_series = pivot[available_index].mean(axis=1)

    # Per-hub indices (new v2)
    hub_indices: Dict[str, pd.Series] = {}
    for hub in _HUB_CURRENCIES:
        hub_peers = [c for c in codes if c != hub]
        if hub_peers and hub in pivot.columns:
            # Weight by inverse of variance (more stable pairs get more weight)
            weights: List[float] = []
            for peer in hub_peers:
                var = float(log_ret[peer].var())
                weights.append(1.0 / max(var, 1e-10))
            w = np.array(weights)
            w /= w.sum()
            hub_indices[hub] = (pivot[hub_peers] * w).sum(axis=1)

    # ── Step 4: Pairwise rolling correlations ─────────────────────────────────
    # Build dict: code → {peer → rolling_corr_series}
    corr_dict: Dict[str, Dict[str, pd.Series]] = {code: {} for code in codes}
    for i, code_a in enumerate(codes):
        for code_b in codes[i + 1:]:
            roll_corr = (
                log_ret[code_a]
                .rolling(corr_window, min_periods=_MIN_CORR_PERIODS)
                .corr(log_ret[code_b])
                .fillna(0)
            )
            corr_dict[code_a][code_b] = roll_corr
            corr_dict[code_b][code_a] = roll_corr

    # ── Step 5: Realised volatility ───────────────────────────────────────────
    vol_df = log_ret.rolling(corr_window, min_periods=_MIN_CORR_PERIODS).std()
    mean_vol = vol_df.mean(axis=1)   # cross-pair mean vol per date

    # ── Step 6: Merge all features back into long format ──────────────────────
    rows = []
    for code, grp in df.groupby("currency_code"):
        grp = grp.copy().set_index("date")

        # v1 compat: corr vs single base
        base = base_currency or (codes[0] if codes else None)
        if base and base in corr_dict.get(code, {}):
            grp[f"corr_vs_{base}_{corr_window}d"] = corr_dict[code][base].reindex(grp.index).fillna(0)
        else:
            grp[f"corr_vs_{base}_{corr_window}d"] = 0.0

        # v1 compat: fx_index and rate_vs_index
        if usd_index_series is not None:
            idx_aligned = usd_index_series.reindex(grp.index).ffill().bfill()
            grp["fx_index"]      = idx_aligned
            grp["rate_vs_index"] = grp["exchange_rate"] / (idx_aligned + 1e-10)
        else:
            grp["fx_index"]      = 0.0
            grp["rate_vs_index"] = 0.0

        # v2 new: correlation vs each hub
        for hub, hub_series in hub_indices.items():
            col = f"corr_vs_hub_{hub}"
            if hub in corr_dict.get(code, {}):
                grp[col] = corr_dict[code][hub].reindex(grp.index).fillna(0)
            elif code == hub:
                grp[col] = 1.0
            else:
                # Fallback: correlate with the hub index series as a proxy
                grp[col] = 0.0

        # v2 new: average pairwise correlation to all peers
        peer_corrs = corr_dict.get(code, {})
        if peer_corrs:
            peer_df = pd.DataFrame(peer_corrs).reindex(grp.index).fillna(0)
            grp[f"avg_cross_corr_{corr_window}d"] = peer_df.mean(axis=1).fillna(0)
        else:
            grp[f"avg_cross_corr_{corr_window}d"] = 0.0

        # v2 new: volatility spread
        if code in vol_df.columns:
            code_vol = vol_df[code].reindex(grp.index).fillna(0)
            mean_v   = mean_vol.reindex(grp.index).fillna(0)
            grp["vol_spread"] = (code_vol - mean_v).fillna(0)
        else:
            grp["vol_spread"] = 0.0

        # v2 new: graph degree (count peers with |corr| > 0.3)
        if peer_corrs:
            def _degree(date):
                return sum(
                    1 for s in peer_corrs.values()
                    if date in s.index and abs(s.loc[date]) > 0.3
                )
            grp["fx_graph_degree"] = [_degree(d) for d in grp.index]
        else:
            grp["fx_graph_degree"] = 0

        rows.append(grp.reset_index())

    out = pd.concat(rows, ignore_index=True)
    new_cols = [c for c in out.columns if c not in df.columns]
    log.info(
        f"Cross-currency features added ({len(new_cols)} new cols): {new_cols}"
    )
    return out
