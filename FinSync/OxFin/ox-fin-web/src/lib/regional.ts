export type RegionalPreferences = {
    locale: string;
    currency: string;
    timeZone: string;
};

export const regionalDefaults: RegionalPreferences = {
    locale: 'en-IN',
    currency: 'INR',
    timeZone: 'Asia/Kolkata',
};

export const regionalOptions = [
    { label: 'English (India)', locale: 'en-IN', currency: 'INR', timeZone: 'Asia/Kolkata' },
    { label: 'English (United States)', locale: 'en-US', currency: 'USD', timeZone: 'America/New_York' },
    { label: 'English (United Kingdom)', locale: 'en-GB', currency: 'GBP', timeZone: 'Europe/London' },
    { label: 'தமிழ் (India)', locale: 'ta-IN', currency: 'INR', timeZone: 'Asia/Kolkata' },
    { label: 'हिन्दी (India)', locale: 'hi-IN', currency: 'INR', timeZone: 'Asia/Kolkata' },
];

export function formatMoney(value: number | string, preferences: RegionalPreferences = regionalDefaults) {
    return new Intl.NumberFormat(preferences.locale, {
        style: 'currency',
        currency: preferences.currency,
        maximumFractionDigits: 2,
    }).format(Number(value) || 0);
}

export function formatDate(value: string | Date, preferences: RegionalPreferences = regionalDefaults) {
    return new Intl.DateTimeFormat(preferences.locale, {
        dateStyle: 'medium',
        timeZone: preferences.timeZone,
    }).format(new Date(value));
}
