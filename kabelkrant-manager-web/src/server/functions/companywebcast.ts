import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import * as Sentry from "@sentry/tanstackstart-react";

const streamSchema = z.object({
  id: z.string(),
  webcastCode: z.string(),
  title: z.string(),
  description: z.string(),
  scheduledStart: z.string(),
  status: z.number(),
  tags: z.array(z.string()),
});

/**
 * Fetch available CompanyWebcast streams
 */
export const getCompanyWebcastStreams = createServerFn({ method: "GET" })
  .inputValidator(z.object({ customer: z.string().optional() }))
  .handler(async ({ data }) => {
    const customer = data.customer || "gemeentekrimpenerwaard";
    const portalUrl = `https://channel.royalcast.com/portal/api/1.0/${customer}/portalwebcasts/?currentPage=0&status=live,prelive,ready&ordering=startAsc&pageSize=5`;

    console.log("[CompanyWebcast] Fetching streams from:", portalUrl);

    let response: Response;
    try {
      response = await fetch(portalUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "nl-NL,nl;q=0.9",
          Referer: `https://channel.royalcast.com/${customer}/`,
        },
        signal: AbortSignal.timeout(10000), // 10 seconden timeout
      });
    } catch (error) {
      // Network error (DNS, connection refused, timeout, SSL, etc)
      console.error("[CompanyWebcast] Network error:", error);
      Sentry.captureException(error, {
        tags: { component: "companywebcast", operation: "fetch_streams" },
        extra: { url: portalUrl, customer },
      });
      throw new Error(
        `Network error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error(
        "[CompanyWebcast] HTTP error:",
        response.status,
        response.statusText,
        text.slice(0, 500)
      );
      Sentry.captureMessage(errorMessage, {
        level: "error",
        tags: { component: "companywebcast", operation: "fetch_streams" },
        extra: {
          url: portalUrl,
          customer,
          status: response.status,
          responseBody: text.slice(0, 1000),
        },
      });
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log(
      "[CompanyWebcast] Received",
      responseData.List?.length || 0,
      "streams"
    );

    // Transform the data to a simpler format
    // Note: We use the code as identifier, will fetch real ID when selected
    const streams = (responseData.List || []).map((item: any) => ({
      id: item.code, // Use code as temporary ID
      webcastCode: item.code,
      title: item.title,
      description: item.Description || "",
      scheduledStart: item.scheduledStart,
      status: item.status,
      tags: item.tags || [],
    }));

    return streams;
  });

/**
 * Fetch player ID for a specific webcast code
 */
export const getCompanyWebcastPlayerId = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      customer: z.string().optional(),
      code: z.string(),
    })
  )
  .handler(async ({ data }) => {
    const customer = data.customer || "gemeentekrimpenerwaard";
    const webcastCode = data.code;
    const detailUrl = `https://channel.royalcast.com/portal/api/1.0/${customer}/webcasts/${webcastCode}?method=GET`;

    console.log("[CompanyWebcast] Fetching player ID from:", detailUrl);

    let response: Response;
    try {
      response = await fetch(detailUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
          "Accept-Language": "nl-NL,nl;q=0.9",
          Referer: `https://channel.royalcast.com/${customer}/`,
        },
        signal: AbortSignal.timeout(10000),
      });
    } catch (error) {
      console.error("[CompanyWebcast] Network error:", error);
      Sentry.captureException(error, {
        tags: { component: "companywebcast", operation: "fetch_player_id" },
        extra: { url: detailUrl, customer, webcastCode },
      });
      throw new Error(
        `Network error: ${error instanceof Error ? error.message : String(error)}`
      );
    }

    if (!response.ok) {
      const text = await response.text().catch(() => "");
      const errorMessage = `HTTP ${response.status}: ${response.statusText}`;
      console.error(
        "[CompanyWebcast] HTTP error:",
        response.status,
        response.statusText,
        text.slice(0, 500)
      );
      Sentry.captureMessage(errorMessage, {
        level: "error",
        tags: { component: "companywebcast", operation: "fetch_player_id" },
        extra: {
          url: detailUrl,
          customer,
          webcastCode,
          status: response.status,
          responseBody: text.slice(0, 1000),
        },
      });
      throw new Error(errorMessage);
    }

    const responseData = await response.json();
    console.log("[CompanyWebcast] Got player ID:", responseData.id);

    return { playerId: responseData.id };
  });
