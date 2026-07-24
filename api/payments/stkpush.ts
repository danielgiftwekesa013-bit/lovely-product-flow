import type { VercelRequest, VercelResponse } from "@vercel/node";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MPESA_CONSUMER_KEY =
  process.env.MPESA_CONSUMER_KEY!;

const MPESA_CONSUMER_SECRET =
  process.env.MPESA_CONSUMER_SECRET!;

const MPESA_PASSKEY =
  process.env.MPESA_PASSKEY!;

const MPESA_SHORTCODE =
  process.env.MPESA_SHORTCODE!;

const MPESA_CALLBACK_URL =
  process.env.MPESA_CALLBACK_URL!;

const MPESA_ENVIRONMENT =
  process.env.MPESA_ENVIRONMENT || "sandbox";

/*
 * Supabase admin client.
 *
 * Uses the service role key only on the Vercel
 * serverless function. Never expose this key
 * to frontend/browser code.
 */
const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_KEY!
);

const supabaseAdmin = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);

function getMpesaBaseUrl() {
  if (MPESA_ENVIRONMENT === "production") {
    return "https://api.safaricom.co.ke";
  }

  return "https://sandbox.safaricom.co.ke";
}

function normalizePhone(
  phone: string
): string {
  const cleaned = phone
    .trim()
    .replace(/\s+/g, "")
    .replace(/^\+/, "");

  if (cleaned.startsWith("254")) {
    return cleaned;
  }

  if (cleaned.startsWith("0")) {
    return `254${cleaned.substring(1)}`;
  }

  throw new Error(
    "Invalid Kenyan phone number."
  );
}

function formatTimestamp(
  date = new Date()
): string {
  const pad = (value: number) =>
    value.toString().padStart(2, "0");

  return (
    date.getFullYear().toString() +
    pad(date.getMonth() + 1) +
    pad(date.getDate()) +
    pad(date.getHours()) +
    pad(date.getMinutes()) +
    pad(date.getSeconds())
  );
}

async function getAccessToken() {
  const baseUrl = getMpesaBaseUrl();

  const credentials = Buffer.from(
    `${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`
  ).toString("base64");

  const response = await fetch(
    `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`,
    {
      method: "GET",
      headers: {
        Authorization: `Basic ${credentials}`,
      },
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error(
      "M-Pesa access token error:",
      data
    );

    throw new Error(
      "Unable to authenticate with M-Pesa."
    );
  }

  return data.access_token;
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      error: "Method not allowed.",
    });
  }

  try {
    /*
     * --------------------------------------------------
     * 1. Validate Supabase authentication
     * --------------------------------------------------
     */

    const authHeader =
      req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({
        error: "Authentication required.",
      });
    }

    const accessToken =
      authHeader.substring(7);

    const {
      data: {
        user,
      },
      error: authError,
    } = await supabaseAdmin.auth.getUser(
      accessToken
    );

    if (authError || !user) {
      return res.status(401).json({
        error: "Invalid authentication session.",
      });
    }

    /*
     * --------------------------------------------------
     * 2. Read request body
     * --------------------------------------------------
     */

    const {
      orderId,
      phoneNumber,
    } = req.body ?? {};

    if (!orderId) {
      return res.status(400).json({
        error: "orderId is required.",
      });
    }

    if (!phoneNumber) {
      return res.status(400).json({
        error: "phoneNumber is required.",
      });
    }

    const normalizedPhone =
      normalizePhone(phoneNumber);

    /*
     * --------------------------------------------------
     * 3. Fetch the existing order
     * --------------------------------------------------
     *
     * NEVER trust the amount sent by the frontend.
     */

    const {
      data: order,
      error: orderError,
    } = await supabaseAdmin
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .eq("user_id", user.id)
      .single();

    if (orderError || !order) {
      return res.status(404).json({
        error: "Order not found.",
      });
    }

    /*
     * --------------------------------------------------
     * 4. Verify order can be paid
     * --------------------------------------------------
     */

    if (
      order.order_status !== "pending" ||
      order.payment_status !== "pending"
    ) {
      return res.status(400).json({
        error:
          "This order is no longer available for payment.",
      });
    }

    const amount = Math.round(
      Number(order.total_amount)
    );

    if (!amount || amount <= 0) {
      return res.status(400).json({
        error:
          "Invalid order payment amount.",
      });
    }

    /*
     * --------------------------------------------------
     * 5. Check for an existing active attempt
     * --------------------------------------------------
     */

    const {
      data: activeTransaction,
    } = await supabaseAdmin
      .from("mpesa_transactions")
      .select("*")
      .eq("order_id", order.id)
      .in("status", [
        "initiated",
        "pending",
      ])
      .maybeSingle();

    if (activeTransaction) {
      return res.status(409).json({
        error:
          "An M-Pesa payment is already being processed for this order.",
        checkoutRequestId:
          activeTransaction.checkout_request_id,
      });
    }

    /*
     * --------------------------------------------------
     * 6. Save phone number to order
     * --------------------------------------------------
     */

    const {
      error: phoneUpdateError,
    } = await supabaseAdmin
      .from("orders")
      .update({
        customer_phone: normalizedPhone,
        payment_method: "mpesa",
        updated_at: new Date().toISOString(),
      })
      .eq("id", order.id);

    if (phoneUpdateError) {
      throw phoneUpdateError;
    }

    /*
     * --------------------------------------------------
     * 7. Get M-Pesa access token
     * --------------------------------------------------
     */

    const accessTokenMpesa =
      await getAccessToken();

    /*
     * --------------------------------------------------
     * 8. Create STK password
     * --------------------------------------------------
     */

    const timestamp =
      formatTimestamp();

    const password = Buffer.from(
      `${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`
    ).toString("base64");

    /*
     * --------------------------------------------------
     * 9. Initiate STK Push
     * --------------------------------------------------
     */

    const baseUrl =
      getMpesaBaseUrl();

    const stkResponse = await fetch(
      `${baseUrl}/mpesa/stkpush/v1/processrequest`,
      {
        method: "POST",
        headers: {
          Authorization:
            `Bearer ${accessTokenMpesa}`,

          "Content-Type":
            "application/json",
        },

        body: JSON.stringify({
          BusinessShortCode:
            MPESA_SHORTCODE,

          Password:
            password,

          Timestamp:
            timestamp,

          TransactionType:
            "CustomerPayBillOnline",

          Amount:
            amount,

          PartyA:
            normalizedPhone,

          PartyB:
            MPESA_SHORTCODE,

          PhoneNumber:
            normalizedPhone,

          CallBackURL:
            MPESA_CALLBACK_URL,

          AccountReference:
            order.order_number,

          TransactionDesc:
            `Payment for order ${order.order_number}`,
        }),
      }
    );

    const stkData =
      await stkResponse.json();

    console.log(
      "M-Pesa STK response:",
      stkData
    );

    if (
      !stkResponse.ok ||
      !stkData.CheckoutRequestID
    ) {
      console.error(
        "STK Push failed:",
        stkData
      );

      return res.status(502).json({
        error:
          stkData.errorMessage ||
          stkData.ResponseDescription ||
          "Unable to initiate M-Pesa STK Push.",
      });
    }

    /*
     * --------------------------------------------------
     * 10. Save payment attempt
     * --------------------------------------------------
     */

    const {
      error: transactionError,
    } = await supabaseAdmin
      .from("mpesa_transactions")
      .insert({
        order_id:
          order.id,

        user_id:
          user.id,

        merchant_request_id:
          stkData.MerchantRequestID,

        checkout_request_id:
          stkData.CheckoutRequestID,

        phone_number:
          normalizedPhone,

        amount:
          amount,

        currency:
          order.currency || "KES",

        status:
          "pending",

        stk_push_response:
          stkData,
      });

    if (transactionError) {
      console.error(
        "Failed to save M-Pesa transaction:",
        transactionError
      );

      /*
       * The STK Push was already sent.
       * We should still return success to the
       * customer rather than pretending the push failed.
       */
    }

    /*
     * --------------------------------------------------
     * 11. Update order
     * --------------------------------------------------
     */

    await supabaseAdmin
      .from("orders")
      .update({
        payment_method:
          "mpesa",

        payment_reference:
          stkData.CheckoutRequestID,

        customer_phone:
          normalizedPhone,

        updated_at:
          new Date().toISOString(),
      })
      .eq("id", order.id);

    /*
     * --------------------------------------------------
     * 12. Return response to checkout
     * --------------------------------------------------
     */

    return res.status(200).json({
      success: true,

      message:
        stkData.CustomerMessage ||
        "STK Push sent successfully.",

      merchantRequestId:
        stkData.MerchantRequestID,

      checkoutRequestId:
        stkData.CheckoutRequestID,

      orderId:
        order.id,
    });
  } catch (error: any) {
    console.error(
      "STK Push server error:",
      error
    );

    return res.status(500).json({
      error:
        error?.message ||
        "Internal server error.",
    });
  }
}

