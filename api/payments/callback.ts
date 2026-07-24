import type {
  VercelRequest,
  VercelResponse,
} from "@vercel/node";

import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  }
);


export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  if (req.method !== "POST") {
    return res.status(405).json({
      ResultCode: 1,
      ResultDesc: "Method not allowed",
    });
  }

  try {
    console.log(
      "M-Pesa callback received:",
      JSON.stringify(req.body)
    );

    /*
     * --------------------------------------------------
     * 1. Extract callback data
     * --------------------------------------------------
     */

    const stkCallback =
      req.body?.Body?.stkCallback;

    if (!stkCallback) {
      console.error(
        "Invalid M-Pesa callback body."
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    const merchantRequestId =
      stkCallback.MerchantRequestID;

    const checkoutRequestId =
      stkCallback.CheckoutRequestID;

    const resultCode =
      Number(stkCallback.ResultCode);

    const resultDesc =
      stkCallback.ResultDesc ||
      "";

    const callbackMetadata =
      stkCallback.CallbackMetadata
        ?.Item ?? [];

    /*
     * --------------------------------------------------
     * 2. Save raw callback
     * --------------------------------------------------
     */

    await supabaseAdmin
      .from("mpesa_callbacks")
      .insert({
        checkout_request_id:
          checkoutRequestId,

        merchant_request_id:
          merchantRequestId,

        result_code:
          resultCode,

        result_desc:
          resultDesc,

        callback_body:
          req.body,

        processed:
          false,
      });

    /*
     * --------------------------------------------------
     * 3. Find payment transaction
     * --------------------------------------------------
     */

    const {
      data: transaction,
      error: transactionError,
    } = await supabaseAdmin
      .from("mpesa_transactions")
      .select("*")
      .eq(
        "checkout_request_id",
        checkoutRequestId
      )
      .maybeSingle();

    if (transactionError) {
      console.error(
        "Transaction lookup error:",
        transactionError
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    if (!transaction) {
      console.error(
        "No transaction found for CheckoutRequestID:",
        checkoutRequestId
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    /*
     * --------------------------------------------------
     * 4. Idempotency check
     * --------------------------------------------------
     *
     * If payment is already completed,
     * do not process it again.
     */

    if (
      transaction.status ===
        "completed"
    ) {
      console.log(
        "Payment already completed:",
        checkoutRequestId
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    /*
     * --------------------------------------------------
     * 5. Payment successful
     * --------------------------------------------------
     */

    if (resultCode === 0) {
      const receipt =
        callbackMetadata.find(
          (item: any) =>
            item.Name ===
            "MpesaReceiptNumber"
        )?.Value;

      const amount =
        callbackMetadata.find(
          (item: any) =>
            item.Name ===
            "Amount"
        )?.Value;

      const transactionDate =
        callbackMetadata.find(
          (item: any) =>
            item.Name ===
            "TransactionDate"
        )?.Value;

      const phoneNumber =
        callbackMetadata.find(
          (item: any) =>
            item.Name ===
            "PhoneNumber"
        )?.Value;

      /*
       * Convert M-Pesa transaction date
       * from YYYYMMDDHHmmss.
       */
      let parsedTransactionDate:
        string | null = null;

      if (
        transactionDate
      ) {
        const dateString =
          String(
            transactionDate
          );

        if (
          dateString.length ===
          14
        ) {
          parsedTransactionDate =
            `${dateString.substring(
              0,
              4
            )}-${dateString.substring(
              4,
              6
            )}-${dateString.substring(
              6,
              8
            )}T${dateString.substring(
              8,
              10
            )}:${dateString.substring(
              10,
              12
            )}:${dateString.substring(
              12,
              14
            )}+03:00`;
        }
      }

      /*
       * ------------------------------------------------
       * Verify amount against order
       * ------------------------------------------------
       */

      const {
        data: order,
        error: orderError,
      } = await supabaseAdmin
        .from("orders")
        .select("*")
        .eq(
          "id",
          transaction.order_id
        )
        .single();

      if (
        orderError ||
        !order
      ) {
        console.error(
          "Order not found:",
          transaction.order_id
        );

        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      /*
       * Never mark an order paid if the
       * callback amount doesn't match.
       */

      if (
        Number(amount) !==
        Number(order.total_amount)
      ) {
        console.error(
          "M-Pesa amount mismatch",
          {
            expected:
              order.total_amount,

            received:
              amount,

            orderId:
              order.id,
          }
        );

        await supabaseAdmin
          .from(
            "mpesa_transactions"
          )
          .update({
            status:
              "failed",

            result_code:
              resultCode,

            result_desc:
              "Payment amount mismatch.",

            callback_response:
              req.body,

            updated_at:
              new Date().toISOString(),
          })
          .eq(
            "id",
            transaction.id
          );

        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      /*
       * ------------------------------------------------
       * Mark M-Pesa transaction completed
       * ------------------------------------------------
       */

      const {
        error:
          transactionUpdateError,
      } = await supabaseAdmin
        .from(
          "mpesa_transactions"
        )
        .update({
          status:
            "completed",

          result_code:
            resultCode,

          result_desc:
            resultDesc,

          mpesa_receipt_number:
            receipt
              ? String(receipt)
              : null,

          transaction_date:
            parsedTransactionDate,

          callback_response:
            req.body,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          transaction.id
        )
        .neq(
          "status",
          "completed"
        );

      if (
        transactionUpdateError
      ) {
        throw transactionUpdateError;
      }

      /*
       * ------------------------------------------------
       * Mark order as paid / processing
       * ------------------------------------------------
       *
       * We use "processing" because payment is now
       * confirmed and the business can fulfil it.
       */

      const {
        error:
          orderUpdateError,
      } = await supabaseAdmin
        .from("orders")
        .update({
          payment_status:
            "paid",

          order_status:
            "processing",

          payment_method:
            "mpesa",

          payment_reference:
            receipt
              ? String(receipt)
              : checkoutRequestId,

          customer_phone:
            phoneNumber
              ? String(phoneNumber)
              : order.customer_phone,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          order.id
        )
        .eq(
          "payment_status",
          "pending"
        );

      if (
        orderUpdateError
      ) {
        throw orderUpdateError;
      }

      /*
       * Mark callback records processed.
       */

      await supabaseAdmin
        .from(
          "mpesa_callbacks"
        )
        .update({
          processed:
            true,
        })
        .eq(
          "checkout_request_id",
          checkoutRequestId
        );

      console.log(
        "Payment confirmed successfully:",
        {
          orderId:
            order.id,

          orderNumber:
            order.order_number,

          receipt,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 6. Payment failed / cancelled
     * --------------------------------------------------
     */

    else {
      await supabaseAdmin
        .from(
          "mpesa_transactions"
        )
        .update({
          status:
            "failed",

          result_code:
            resultCode,

          result_desc:
            resultDesc,

          callback_response:
            req.body,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          transaction.id
        );

      /*
       * The order remains pending so the customer
       * can try payment again.
       *
       * We only mark the order as failed if you
       * explicitly want failed orders to be closed.
       */
      await supabaseAdmin
        .from("orders")
        .update({
          payment_status:
            "failed",

          payment_reference:
            checkoutRequestId,

          updated_at:
            new Date().toISOString(),
        })
        .eq(
          "id",
          transaction.order_id
        )
        .eq(
          "payment_status",
          "pending"
        );

      await supabaseAdmin
        .from(
          "mpesa_callbacks"
        )
        .update({
          processed:
            true,
        })
        .eq(
          "checkout_request_id",
          checkoutRequestId
        );

      console.log(
        "M-Pesa payment failed:",
        {
          checkoutRequestId,
          resultCode,
          resultDesc,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 7. Always acknowledge callback
     * --------------------------------------------------
     */

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  } catch (error: any) {
    console.error(
      "M-Pesa callback processing error:",
      error
    );

    /*
     * Safaricom should receive a successful HTTP
     * response so it does not repeatedly retry
     * the callback indefinitely.
     *
     * The callback is stored for investigation.
     */
    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  }
}
