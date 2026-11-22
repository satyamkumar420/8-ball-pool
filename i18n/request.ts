import { getRequestConfig } from "next-intl/server";

export default getRequestConfig(async ({ locale, requestLocale }) => {
  let resolvedLocale = await (requestLocale || locale);
  if (!resolvedLocale) {
    resolvedLocale = "en";
  }
  return {
    locale: resolvedLocale,
    messages: (await import(`../languages/${resolvedLocale}.json`)).default,
  };
});
