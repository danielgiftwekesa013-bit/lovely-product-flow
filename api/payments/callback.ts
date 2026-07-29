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
   * 0. VERY FIRST LOG
   * --------------------------------------------------
   *
   * If you don't see this in Vercel logs,
   * Safaricom is not reaching this function.
   */

  console.log(
    "=========================================="
  );

  console.log(
    "M-PESA CALLBACK FUNCTION INVOKED"
  );

  console.log(
    "Method:",
    req.method
  );

  console.log(
    "URL:",
    req.url
  );

  console.log(
    "Time:",
    new Date().toISOString()
  );

  console.log(
    "=========================================="
  );

  /*
   * --------------------------------------------------
   * 1. Only accept POST
   * --------------------------------------------------
   */

  if (req.method !== "POST") {
    console.log(
      "Callback rejected because method is not POST."
    );

    return res.status(405).json({
      ResultCode: 1,
      ResultDesc: "Method not allowed",
    });
  }

  try {
    /*
     * --------------------------------------------------
     * 2. Log complete callback body
     * --------------------------------------------------
     */

    console.log(
      "M-PESA CALLBACK BODY:"
    );

    console.log(
      JSON.stringify(
        req.body,
        null,
        2
      )
    );

    /*
     * --------------------------------------------------
     * 3. Extract STK callback
     * --------------------------------------------------
     */

    const stkCallback =
      req.body?.Body?.stkCallback;

    if (!stkCallback) {
      console.error(
        "INVALID CALLBACK BODY:"
      );

      console.error(
        JSON.stringify(
          req.body,
          null,
          2
        )
      );

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

    const resultCode =
      Number(
        stkCallback.ResultCode
      );

    const resultDesc =
      stkCallback.ResultDesc ||
      "";

    console.log(
      "Callback identifiers:",
      {
        merchantRequestId,
        checkoutRequestId,
        resultCode,
        resultDesc,
      }
    );

    /*
     * --------------------------------------------------
     * 4. Save callback immediately
     * --------------------------------------------------
     *
     * This happens BEFORE transaction lookup.
     *
     * Therefore, if Safaricom reaches this function,
     * mpesa_callbacks should contain a row.
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
      .single();

    if (callbackInsertError) {
      console.error(
        "CALLBACK DATABASE INSERT FAILED:"
      );

      console.error(
        JSON.stringify(
          callbackInsertError,
          null,
          2
        )
      );
    } else {
      console.log(
        "CALLBACK SAVED TO DATABASE:"
      );

      console.log(
        callbackRecord
      );
    }

    /*
     * --------------------------------------------------
     * 5. Validate CheckoutRequestID
     * --------------------------------------------------
     */

    if (!checkoutRequestId) {
      console.error(
        "Missing CheckoutRequestID."
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    /*
     * --------------------------------------------------
     * 6. Find transaction
     * --------------------------------------------------
     */

    console.log(
      "Looking for transaction:",
      checkoutRequestId
    );

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
        "TRANSACTION LOOKUP FAILED:"
      );

      console.error(
        JSON.stringify(
          transactionError,
          null,
          2
        )
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    if (!transaction) {
      console.error(
        "NO TRANSACTION FOUND:"
      );

      console.error(
        checkoutRequestId
      );

      return res.status(200).json({
        ResultCode: 0,
        ResultDesc: "Accepted",
      });
    }

    console.log(
      "TRANSACTION FOUND:",
      transaction.id
    );

    /*
     * --------------------------------------------------
     * 7. Extract callback metadata
     * --------------------------------------------------
     */

    const callbackMetadata =
      stkCallback.CallbackMetadata
        ?.Item ?? [];

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

    /*
     * --------------------------------------------------
     * 8. Successful payment
     * --------------------------------------------------
     */

    if (resultCode === 0) {
      console.log(
        "SUCCESSFUL M-PESA PAYMENT"
      );

      console.log({
        checkoutRequestId,
        receipt,
        callbackAmount,
        transactionDate,
        phoneNumber,
      });

      /*
       * Get order
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
          "ORDER LOOKUP FAILED:"
        );

        console.error(
          orderError
        );

        return res.status(200).json({
          ResultCode: 0,
          ResultDesc: "Accepted",
        });
      }

      /*
       * Verify amount
       */

      const expectedAmount =
        Number(
          transaction.amount
        );

      const receivedAmount =
        Number(
          callbackAmount
        );

      console.log(
        "PAYMENT AMOUNT CHECK:",
        {
          expectedAmount,
          receivedAmount,
          orderTotal:
            Number(
              order.total_amount
            ),
        }
      );

      if (
        expectedAmount !==
          receivedAmount ||
        Number(
          order.total_amount
        ) !==
          receivedAmount
      ) {
        console.error(
          "PAYMENT AMOUNT MISMATCH"
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
       * Complete transaction
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
            parseMpesaTransactionDate(
              transactionDate
            ),

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
        transactionUpdateError
      ) {
        console.error(
          "TRANSACTION UPDATE FAILED:"
        );

        throw transactionUpdateError;
      }

      console.log(
        "M-PESA TRANSACTION MARKED COMPLETED"
      );

      /*
       * Update order
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
        console.error(
          "ORDER UPDATE FAILED:"
        );

        throw orderUpdateError;
      }

      console.log(
        "ORDER SUCCESSFULLY MARKED PAID:"
      );

      console.log({
        orderId:
          order.id,

        orderNumber:
          order.order_number,

        receipt,
      });
    }

    /*
     * --------------------------------------------------
     * 9. Failed payment
     * --------------------------------------------------
     */

    else {
      console.log(
        "M-PESA PAYMENT FAILED OR CANCELLED:"
      );

      console.log({
        checkoutRequestId,
        resultCode,
        resultDesc,
      });

      const {
        error:
          failedUpdateError,
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
        failedUpdateError
      ) {
        throw failedUpdateError;
      }

      /*
       * IMPORTANT:
       *
       * We intentionally leave the order as:
       *
       * order_status = pending
       * payment_status = pending
       *
       * This allows another STK Push attempt.
       */
    }

    /*
     * --------------------------------------------------
     * 10. Mark callback processed
     * --------------------------------------------------
     */

    if (callbackRecord?.id) {
      const {
        error:
          processedError,
      } = await supabaseAdmin
        .from(
          "mpesa_callbacks"
        )
        .update({
          processed:
            true,
        })
        .eq(
          "id",
          callbackRecord.id
        );

      if (processedError) {
        console.error(
          "FAILED TO MARK CALLBACK PROCESSED:",
          processedError
        );
      }
    }

    console.log(
      "M-PESA CALLBACK PROCESSING COMPLETE"
    );

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  } catch (error: any) {
    console.error(
      "=========================================="
    );

    console.error(
      "M-PESA CALLBACK PROCESSING ERROR"
    );

    console.error(
      error
    );

    console.error(
      "=========================================="
    );

    /*
     * Always acknowledge Safaricom.
     */

    return res.status(200).json({
      ResultCode: 0,
      ResultDesc: "Accepted",
    });
  }
}