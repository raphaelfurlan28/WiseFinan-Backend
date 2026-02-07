#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
fetch_indices_60m.py
Gera CSV com 60 meses (ou janela customizada) de:
- Selic acumulada no mês (SGS 4390)
- CDI acumulado no mês (SGS 4391)
- Poupança (% a.m.)        (SGS 195)
- IPCA (% a.m.)            (SGS 433)

Exemplos:
  python fetch_indices_60m.py                         # CSV padrão (sep=',' decimal='.')
  python fetch_indices_60m.py --locale ptbr           # CSV PT-BR (sep=';' decimal=',')
  python fetch_indices_60m.py --months 120 --end 2025-09 --out indices_ptbr.csv --locale ptbr

Requisitos:
  pip install pandas requests
"""
import argparse
import datetime as dt
import sys
import time
from typing import Dict, Tuple

import pandas as pd
import requests

SERIES: Dict[str, Tuple[str, int]] = {
    "selic_pm": ("Selic (% a.m.)", 4390),
    "cdi_pm":   ("CDI (% a.m.)",   4391),
    "poup_pm":  ("Poupança (% a.m.)", 195),
    "ipca_pm":  ("IPCA (% a.m.)",  433),
}

def month_start(date: dt.date) -> dt.date:
    return date.replace(day=1)

def parse_end_month(s: str | None) -> dt.date:
    if not s:
        return month_start(dt.date.today())
    year, month = map(int, s.split("-"))
    return dt.date(year, month, 1)

def fetch_sgs(code: int, start: dt.date, end: dt.date, timeout: int = 30, retries: int = 3) -> pd.DataFrame:
    """Busca série do SGS (BCB) e devolve DF com data (1º dia do mês) e valor (float)."""
    def fmt(d: dt.date) -> str:
        return d.strftime("%d/%m/%Y")
    url = (
        f"https://api.bcb.gov.br/dados/serie/bcdata.sgs.{code}/dados"
        f"?formato=json&dataInicial={fmt(start)}&dataFinal={fmt(end)}"
    )
    last_err = None
    for attempt in range(1, retries + 1):
        try:
            r = requests.get(url, timeout=timeout)
            r.raise_for_status()
            df = pd.DataFrame(r.json())
            if df.empty:
                return pd.DataFrame(columns=["data", "valor"])
            df["data"] = pd.to_datetime(df["data"], dayfirst=True, errors="coerce")
            df["valor"] = (
                df["valor"].astype(str).str.replace(",", ".", regex=False)
            )
            df["valor"] = pd.to_numeric(df["valor"], errors="coerce")
            df["data"] = df["data"].dt.to_period("M").dt.to_timestamp()
            mask = (df["data"] >= pd.Timestamp(start)) & (df["data"] <= pd.Timestamp(end))
            df = df.loc[mask, ["data", "valor"]].drop_duplicates("data").sort_values("data")
            return df.reset_index(drop=True)
        except Exception as e:
            last_err = e
            if attempt < retries:
                time.sleep(min(2 ** attempt, 5))
            else:
                raise
    if last_err:
        raise last_err
    return pd.DataFrame(columns=["data", "valor"])

def build_date_index(months: int, end_month: dt.date) -> pd.DatetimeIndex:
    if months <= 0:
        raise ValueError("--months deve ser >= 1")
    start_month = (pd.Timestamp(end_month) - pd.DateOffset(months=months - 1)).to_pydatetime().date()
    return pd.date_range(start=start_month, end=end_month, freq="MS")

def main():
    parser = argparse.ArgumentParser(description="Baixa séries do BCB (SGS) e gera CSV consolidado.")
    parser.add_argument("--months", type=int, default=120, help="Quantidade de meses (padrão: 60)")
    parser.add_argument("--end", type=str, default=None, help="Mês final AAAA-MM (padrão: mês atual)")
    parser.add_argument("--out", type=str, default="indices_60m.csv", help="Arquivo CSV de saída")
    parser.add_argument("--timeout", type=int, default=30, help="Timeout por requisição (s)")
    parser.add_argument("--retries", type=int, default=3, help="Repetições em caso de erro")
    parser.add_argument("--locale", type=str, choices=["standard","ptbr"], default="standard",
                        help="Formato do CSV: 'standard' (sep=',' decimal='.') ou 'ptbr' (sep=';' decimal=',')")
    args = parser.parse_args()

    end_month = parse_end_month(args.end)
    dates = build_date_index(args.months, end_month)
    out = pd.DataFrame({"Data": dates})

    for _, (label, code) in SERIES.items():
        print(f"Baixando {label} (SGS {code})...", file=sys.stderr)
        df = fetch_sgs(code, dates[0].date(), dates[-1].date(), timeout=args.timeout, retries=args.retries)
        out = out.merge(df.rename(columns={"valor": label}), left_on="Data", right_on="data", how="left").drop(columns=["data"])

    ordered_cols = ["Data"] + [SERIES[k][0] for k in SERIES]
    out = out[ordered_cols]
    out["Data"] = out["Data"].dt.strftime("%Y-%m-%d")

    # Formatação do CSV conforme locale
    if args.locale == "ptbr":
        sep = ";"
        decimal = ","
        out.to_csv(args.out, index=False, sep=sep, decimal=decimal, encoding="utf-8")
    else:
        sep = ","
        decimal = "."
        out.to_csv(args.out, index=False, sep=sep, decimal=decimal, encoding="utf-8")

    print(f"OK! Arquivo gerado: {args.out} (sep='{sep}', decimal='{decimal}') com {len(out)} linhas.", file=sys.stderr)

if __name__ == "__main__":
    main()
