import AsyncStorage from '@react-native-async-storage/async-storage';
import { createContext, useCallback, useContext, useEffect, useState } from 'react';

// All prices in DB are stored in ZMW (Zambian Kwacha — local default)
const DB_CURRENCY = 'ZMW';
const RATES_CACHE_KEY = '@odini/exchange_rates';
const RATES_TTL_MS = 60 * 60 * 1000; // 1 hour

export const CURRENCIES = [
  { code: 'ZMW', name: 'Zambian Kwacha',    symbol: 'ZK',   flag: '🇿🇲' },
  { code: 'USD', name: 'US Dollar',          symbol: '$',    flag: '🇺🇸' },
  { code: 'GBP', name: 'British Pound',      symbol: '£',    flag: '🇬🇧' },
  { code: 'EUR', name: 'Euro',               symbol: '€',    flag: '🇪🇺' },
  { code: 'ZAR', name: 'South African Rand', symbol: 'R',    flag: '🇿🇦' },
  { code: 'KES', name: 'Kenyan Shilling',    symbol: 'KSh',  flag: '🇰🇪' },
  { code: 'NGN', name: 'Nigerian Naira',     symbol: '₦',    flag: '🇳🇬' },
  { code: 'CAD', name: 'Canadian Dollar',    symbol: 'CA$',  flag: '🇨🇦' },
  { code: 'AUD', name: 'Australian Dollar',  symbol: 'A$',   flag: '🇦🇺' },
  { code: 'CNY', name: 'Chinese Yuan',       symbol: '¥',    flag: '🇨🇳' },
];

// Fallback rates relative to USD (used if API is unreachable)
const FALLBACK_FROM_USD = {
  USD: 1,
  ZMW: 27.4,
  GBP: 0.793,
  EUR: 0.921,
  ZAR: 18.72,
  KES: 129.5,
  NGN: 1580,
  CAD: 1.362,
  AUD: 1.531,
  CNY: 7.243,
};

async function fetchRates() {
  const res = await fetch('https://open.er-api.com/v6/latest/USD');
  if (!res.ok) throw new Error('Rate fetch failed');
  const json = await res.json();
  if (json.result !== 'success') throw new Error('Rate API error');
  return json.rates; // rates[code] = amount of code per 1 USD
}

async function loadCachedRates() {
  try {
    const raw = await AsyncStorage.getItem(RATES_CACHE_KEY);
    if (!raw) return null;
    const { rates, timestamp } = JSON.parse(raw);
    if (Date.now() - timestamp > RATES_TTL_MS) return null;
    return rates;
  } catch {
    return null;
  }
}

async function saveRatesCache(rates) {
  try {
    await AsyncStorage.setItem(RATES_CACHE_KEY, JSON.stringify({ rates, timestamp: Date.now() }));
  } catch {
    // best-effort
  }
}

const CurrencyContext = createContext(null);

export function CurrencyProvider({ children }) {
  const [selectedCode, setSelectedCode] = useState('ZMW');
  const [rates, setRates] = useState(FALLBACK_FROM_USD); // rates from USD

  useEffect(() => {
    // Load saved currency preference
    AsyncStorage.getItem('@odini/currency').then((saved) => {
      if (saved && CURRENCIES.find((c) => c.code === saved)) {
        setSelectedCode(saved);
      }
    }).catch(() => {});

    // Load exchange rates (cache → API → fallback)
    (async () => {
      const cached = await loadCachedRates();
      if (cached) { setRates(cached); return; }
      try {
        const live = await fetchRates();
        setRates(live);
        saveRatesCache(live);
      } catch {
        // keep fallback rates already set
      }
    })();
  }, []);

  const setCurrency = useCallback(async (code) => {
    setSelectedCode(code);
    try { await AsyncStorage.setItem('@odini/currency', code); } catch {}
  }, []);

  /**
   * Convert a price stored in DB_CURRENCY (ZMW) to the selected currency.
   * Returns a formatted string like "ZK 150", "$5.47", "£4.32"
   */
  const formatPrice = useCallback((zmwAmount) => {
    if (zmwAmount == null || isNaN(Number(zmwAmount))) return '—';
    const currency = CURRENCIES.find((c) => c.code === selectedCode) ?? CURRENCIES[0];
    if (selectedCode === DB_CURRENCY) {
      return `${currency.symbol} ${Number(zmwAmount).toLocaleString('en-US', { maximumFractionDigits: 0 })}`;
    }
    // zmw → usd → target
    const zmwPerUsd = rates[DB_CURRENCY] ?? FALLBACK_FROM_USD[DB_CURRENCY];
    const targetPerUsd = rates[selectedCode] ?? FALLBACK_FROM_USD[selectedCode] ?? 1;
    const converted = (Number(zmwAmount) / zmwPerUsd) * targetPerUsd;
    const decimals = ['ZMW', 'NGN', 'KES'].includes(selectedCode) ? 0 : 2;
    return `${currency.symbol}${converted.toLocaleString('en-US', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
  }, [selectedCode, rates]);

  const selectedCurrency = CURRENCIES.find((c) => c.code === selectedCode) ?? CURRENCIES[0];

  return (
    <CurrencyContext.Provider value={{ selectedCurrency, selectedCode, setCurrency, formatPrice, rates }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used inside CurrencyProvider');
  return ctx;
}
