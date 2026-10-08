export type CustomerPaymentState = "CONFIRMED" | "PROCESSING" | "REVIEW" | "UNVERIFIED";

export function deriveCustomerPaymentState(input: {
  paymentStatus: string;
  orderStatus: string;
  paymentIssueCode: string | null;
}): CustomerPaymentState {
  if (input.paymentStatus === "PAID" && input.orderStatus === "PROCESSING" && !input.paymentIssueCode) {
    return "CONFIRMED";
  }
  if (input.paymentStatus === "PAID" && input.paymentIssueCode) return "REVIEW";
  if (input.paymentStatus === "PENDING") return "PROCESSING";
  return "UNVERIFIED";
}

export function shouldClearCart(state: CustomerPaymentState) {
  return state === "CONFIRMED";
}

