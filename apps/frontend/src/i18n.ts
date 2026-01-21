import { getRequestConfig } from 'next-intl/server';
import { cookies, headers } from 'next/headers';

export const locales = ['en', 'de', 'fr'] as const;
export const defaultLocale = 'en' as const;

export type Locale = (typeof locales)[number];

export default getRequestConfig(async () => {
    // Try to get locale from cookie first, then header, then default
    const cookieStore = await cookies();
    const headerStore = await headers();

    let locale: Locale = defaultLocale;

    // Check cookie
    const localeCookie = cookieStore.get('NEXT_LOCALE')?.value;
    if (localeCookie && locales.includes(localeCookie as Locale)) {
        locale = localeCookie as Locale;
    } else {
        // Check Accept-Language header
        const acceptLanguage = headerStore.get('accept-language');
        if (acceptLanguage) {
            const preferredLocale = acceptLanguage
                .split(',')
                .map(lang => lang.split(';')[0].trim().substring(0, 2))
                .find(lang => locales.includes(lang as Locale));
            if (preferredLocale) {
                locale = preferredLocale as Locale;
            }
        }
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
