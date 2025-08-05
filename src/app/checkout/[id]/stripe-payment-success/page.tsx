import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import Stripe from "stripe";

import { Button } from "@/components/ui/button";
import { getOrderById } from "@/lib/actions/order.actions";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY as string);

export default async function SuccessPage(props: {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{ payment_intent?: string }>;
}) {
  const params = await props.params;
  const { id } = params;
  const searchParams = await props.searchParams;

  // Get the order
  const order = await getOrderById(id);
  if (!order) {
    console.log("Order not found:", id);
    notFound();
  }

  // If payment_intent is not provided, check if order is already paid
  if (!searchParams.payment_intent) {
    console.log("No payment_intent provided, checking if order is paid");
    if (order.isPaid) {
      return (
        <div className="max-w-4xl w-full mx-auto space-y-8">
          <div className="flex flex-col gap-6 items-center ">
            <h1 className="font-bold text-2xl lg:text-3xl">
              Thanks for your purchase
            </h1>
            <div>We are now processing your order.</div>
            <Button asChild>
              <Link href={`/account/orders/${id}`}>View order</Link>
            </Button>
          </div>
        </div>
      );
    } else {
      console.log(
        "Order not paid and no payment_intent, redirecting to checkout"
      );
      return redirect(`/checkout/${id}`);
    }
  }

  try {
    // Verify the payment intent
    const paymentIntent = await stripe.paymentIntents.retrieve(
      searchParams.payment_intent
    );

    console.log("Payment intent status:", paymentIntent.status);
    console.log("Payment intent metadata:", paymentIntent.metadata);
    console.log("Order ID:", order._id.toString());

    if (
      paymentIntent.metadata.orderId == null ||
      paymentIntent.metadata.orderId !== order._id.toString()
    ) {
      console.log("Payment intent orderId mismatch");
      return notFound();
    }

    const isSuccess = paymentIntent.status === "succeeded";
    if (!isSuccess) {
      console.log("Payment not succeeded, redirecting to checkout");
      return redirect(`/checkout/${id}`);
    }

    return (
      <div className="max-w-4xl w-full mx-auto space-y-8">
        <div className="flex flex-col gap-6 items-center ">
          <h1 className="font-bold text-2xl lg:text-3xl">
            Thanks for your purchase
          </h1>
          <div>We are now processing your order.</div>
          <Button asChild>
            <Link href={`/account/orders/${id}`}>View order</Link>
          </Button>
        </div>
      </div>
    );
  } catch (error) {
    console.error("Error retrieving payment intent:", error);
    // If there's an error with the payment intent, check if order is paid
    if (order.isPaid) {
      return (
        <div className="max-w-4xl w-full mx-auto space-y-8">
          <div className="flex flex-col gap-6 items-center ">
            <h1 className="font-bold text-2xl lg:text-3xl">
              Thanks for your purchase
            </h1>
            <div>We are now processing your order.</div>
            <Button asChild>
              <Link href={`/account/orders/${id}`}>View order</Link>
            </Button>
          </div>
        </div>
      );
    } else {
      return redirect(`/checkout/${id}`);
    }
  }
}
