import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

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

    // Fetch portal webcasts (live, prelive, and ready streams)
    const portalUrl = `https://channel.royalcast.com/portal/api/1.0/${customer}/portalwebcasts/?currentPage=0&status=live,prelive,ready&ordering=startAsc&pageSize=5`;

    const response = await fetch(portalUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "nl-NL,nl;q=0.9",
        Referer: `https://channel.royalcast.com/${customer}/`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch streams");
    }

    const responseData = await response.json();

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

    // Fetch full webcast details to get the player ID
    const detailUrl = `https://channel.royalcast.com/portal/api/1.0/${customer}/webcasts/${webcastCode}?method=GET`;

    const response = await fetch(detailUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        Accept: "application/json, text/plain, */*",
        "Accept-Language": "nl-NL,nl;q=0.9",
        Referer: `https://channel.royalcast.com/${customer}/`,
      },
    });

    if (!response.ok) {
      throw new Error("Failed to fetch player ID");
    }

    const responseData = await response.json();

    return { playerId: responseData.id };
  });
