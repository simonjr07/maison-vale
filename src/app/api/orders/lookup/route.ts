import { NextResponse } from "next/server";

import {
  ORDER_LOOKUP_COOKIE,
  ORDER_LOOKUP_SESSION_SECONDS,
} from "@/order/order-lookup-domain";
import {
  OrderLookupDeniedError,
  OrderLookupRateLimitError,
  OrderLookupValidationError,
} from "@/server/order/order-lookup-service";
import { getOrderLookupService } from "@/server/order/order-lookup";
import {
  RequestBodyTooLargeError,
  getApplicationOrigin,
  getTrustedRequestSource,
  hasExpectedOrigin,
  readBoundedText,
} from "@/server/http/request-security";

const MAX_BODY_LENGTH = 4_096;

export async function POST(request: Request) {
  try {
    const origin = getApplicationOrigin(request.url);
    if (!origin) {
      return NextResponse.json(
        { error: "Order lookup is temporarily unavailable." },
        { status: 503 },
      );
    }
    if (!hasExpectedOrigin(request, origin)) {
      return NextResponse.json(
        { error: "This order lookup request is not allowed." },
        { status: 403 },
      );
    }

    const body = await readBoundedText(request, MAX_BODY_LENGTH);

    const service = getOrderLookupService();
    if (!service) {
      return NextResponse.json(
        { error: "Order lookup is temporarily unavailable." },
        { status: 503 },
      );
    }

    const verified = await service.verifyOrder(
      JSON.parse(body),
      getTrustedRequestSource(request.headers),
    );
    const response = NextResponse.json({
      ok: true,
      orderNumber: verified.orderNumber,
    });
    response.cookies.set({
      name: ORDER_LOOKUP_COOKIE,
      value: verified.token,
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/orders",
      maxAge: ORDER_LOOKUP_SESSION_SECONDS,
      priority: "high",
    });
    response.headers.set("Cache-Control", "no-store");
    return response;
  } catch (error) {
    if (error instanceof RequestBodyTooLargeError) {
      return NextResponse.json({ error: "The lookup request is too large." }, { status: 413 });
    }
    if (error instanceof OrderLookupValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    if (error instanceof OrderLookupDeniedError) {
      return NextResponse.json({ error: error.message }, { status: 401 });
    }
    if (error instanceof OrderLookupRateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    if (error instanceof SyntaxError || error instanceof TypeError) {
      return NextResponse.json(
        { error: "Enter a valid order reference and checkout email." },
        { status: 400 },
      );
    }
    console.error("Public order lookup failed.");
    return NextResponse.json(
      { error: "Order lookup is temporarily unavailable." },
      { status: 500 },
    );
  }
}

