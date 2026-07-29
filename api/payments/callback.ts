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

/*
 * Safaricom sends transaction dates in:
 *
 * YYYYMMDDHHmmss
 *
 * Example:
 * 20260729150833
 *
 * We convert this into an ISO timestamp with
 * the Kenya timezone (+03:00).
 */
function parseMpesaTransactionDate(
  transactionDate: unknown
): string | null {
  if (!transactionDate) {
    return null;
  }

  const dateString = String(
    transactionDate
  );

  if (dateString.length !== 14) {
    return null;
  }

  return (
    `${dateString.substring(0, 4)}-` +
    `${dateString.substring(4, 6)}-` +
    `${dateString.substring(6, 8)}T` +
    `${dateString.substring(8, 10)}:` +
    `${dateString.substring(10, 12)}:` +
    `${dateString.substring(12, 14)}+03:00`
  );
}

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  /*
   * --------------------------------------------------
   * 1. Only accept POST requests
   * --------------------------------------------------
   */

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
     * 2. Extract STK callback
     * --------------------------------------------------
     */

    const stkCallback =
      req.body?.Body?.stkCallback;

    if (!stkCallback) {
      console.error(
        "Invalid M-Pesa callback body."
      );

      /*
       * Always acknowledge the request.
       * Safaricom expects a successful response.
       */

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    const merchantRequestId =
      stkCallback.MerchantRequestID ||
      null;

    const checkoutRequestId =
      stkCallback.CheckoutRequestID ||
      null;

    const resultCode = Number(
      stkCallback.ResultCode
    );

    const resultDesc =
      stkCallback.ResultDesc || "";

    const callbackMetadata =
      stkCallback.CallbackMetadata?.Item ??
      [];

    /*
     * --------------------------------------------------
     * 3. Validate CheckoutRequestID
     * --------------------------------------------------
     */

    if (!checkoutRequestId) {
      console.error(
        "Callback does not contain CheckoutRequestID."
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    /*
     * --------------------------------------------------
     * 4. Save raw callback
     * --------------------------------------------------
     *
     * This gives you an audit trail of every callback
     * received from Safaricom.
     */

    const {
      data: callbackRecord,
      error: callbackInsertError,
    } = await supabaseAdmin
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
      })
      .select("id")
      .maybeSingle();

    if (callbackInsertError) {
      console.error(
        "Failed to save callback:",
        callbackInsertError
      );
    }

    /*
     * --------------------------------------------------
     * 5. Find the exact M-Pesa transaction
     * --------------------------------------------------
     *
     * The CheckoutRequestID was created by stkpush.ts
     * and stored in mpesa_transactions.
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
        "No M-Pesa transaction found for CheckoutRequestID:",
        checkoutRequestId
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    /*
     * --------------------------------------------------
     * 6. Idempotency
     * --------------------------------------------------
     *
     * If this transaction has already completed,
     * do not process it again.
     */

    if (
      transaction.status ===
      "completed"
    ) {
      console.log(
        "Transaction already completed:",
        checkoutRequestId
      );

      if (callbackRecord?.id) {
        await supabaseAdmin
          .from("mpesa_callbacks")
          .update({
            processed: true,
          })
          .eq(
            "id",
            callbackRecord.id
          );
      }

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    /*
     * --------------------------------------------------
     * 7. Extract successful payment metadata
     * --------------------------------------------------
     */

    const receipt =
      callbackMetadata.find(
        (item: any) =>
          item.Name ===
          "MpesaReceiptNumber"
      )?.Value ?? null;

    const callbackAmount =
      callbackMetadata.find(
        (item: any) =>
          item.Name === "Amount"
      )?.Value ?? null;

    const transactionDate =
      callbackMetadata.find(
        (item: any) =>
          item.Name ===
          "TransactionDate"
      )?.Value ?? null;

    const phoneNumber =
      callbackMetadata.find(
        (item: any) =>
          item.Name ===
          "PhoneNumber"
      )?.Value ?? null;

    const parsedTransactionDate =
      parseMpesaTransactionDate(
        transactionDate
      );

    /*
     * --------------------------------------------------
     * 8. Handle successful payment
     * --------------------------------------------------
     */

    if (resultCode === 0) {
      /*
       * ------------------------------------------------
       * 8A. Fetch order
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

        /*
         * Do not mark transaction as completed
         * if the associated order cannot be found.
         */

        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      /*
       * ------------------------------------------------
       * 8B. Verify callback amount
       * ------------------------------------------------
       *
       * Verify against BOTH:
       *
       * 1. The amount stored in mpesa_transactions
       * 2. The amount stored in orders
       *
       * This prevents an incorrect amount from being
       * treated as a successful payment.
       */

      const expectedTransactionAmount =
        Number(
          transaction.amount
        );

      const expectedOrderAmount =
        Number(
          order.total_amount
        );

      const receivedAmount =
        Number(
          callbackAmount
        );

      const amountMatches =
        Number.isFinite(
          receivedAmount
        ) &&
        receivedAmount ===
          expectedTransactionAmount &&
        receivedAmount ===
          expectedOrderAmount;

      if (!amountMatches) {
        console.error(
          "M-Pesa payment amount mismatch:",
          {
            orderId:
              order.id,

            checkoutRequestId,

            expectedTransactionAmount,

            expectedOrderAmount,

            receivedAmount,
          }
        );

        /*
         * Mark this particular payment attempt
         * as failed.
         *
         * IMPORTANT:
         *
         * We do NOT mark the order as failed.
         *
         * The order remains pending so the customer
         * can retry payment.
         */

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

        if (callbackRecord?.id) {
          await supabaseAdmin
            .from(
              "mpesa_callbacks"
            )
            .update({
              processed: true,
            })
            .eq(
              "id",
              callbackRecord.id
            );
        }

        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      /*
       * ------------------------------------------------
       * 8C. Complete M-Pesa transaction
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
       * 8D. Mark order as paid
       * ------------------------------------------------
       *
       * We only update an order that is still pending.
       *
       * This prevents an older/duplicate callback from
       * overwriting a newer order state.
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
       * ------------------------------------------------
       * 8E. Mark callback processed
       * ------------------------------------------------
       */

      if (callbackRecord?.id) {
        await supabaseAdmin
          .from(
            "mpesa_callbacks"
          )
          .update({
            processed: true,
          })
          .eq(
            "id",
            callbackRecord.id
          );
      }

      console.log(
        "M-Pesa payment successfully confirmed:",
        {
          orderId:
            order.id,

          orderNumber:
            order.order_number,

          checkoutRequestId,

          receipt,

          amount:
            receivedAmount,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 9. Handle failed / cancelled STK Push
     * --------------------------------------------------
     *
     * IMPORTANT:
     *
     * We mark ONLY the transaction attempt as failed.
     *
     * We intentionally DO NOT set:
     *
     * orders.payment_status = "failed"
     *
     * because your stkpush.ts requires:
     *
     * order_status = "pending"
     * payment_status = "pending"
     *
     * This allows the customer to retry the same order.
     */

    else {
      const {
        error:
          failedTransactionError,
      } = await supabaseAdmin
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

      if (
        failedTransactionError
      ) {
        throw failedTransactionError;
      }

      /*
       * Do NOT update orders.payment_status.
       *
       * The order remains:
       *
       * payment_status = pending
       *
       * order_status = pending
       *
       * This means the customer can initiate
       * another STK Push for the same order.
       */

      if (callbackRecord?.id) {
        await supabaseAdmin
          .from(
            "mpesa_callbacks"
          )
          .update({
            processed: true,
          })
          .eq(
            "id",
            callbackRecord.id
          );
      }

      console.log(
        "M-Pesa payment attempt failed or was cancelled:",
        {
          orderId:
            transaction.order_id,

          checkoutRequestId,

          resultCode,

          resultDesc,
        }
      );
    }

    /*
     * --------------------------------------------------
     * 10. Always acknowledge Safaricom callback
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
     * Always acknowledge Safaricom.
     *
     * The raw callback was already stored before
     * processing, allowing you to investigate
     * failures later.
     */

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  }
}