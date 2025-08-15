import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { connectToDatabase } from "@/lib/db";
import Cart from "@/lib/db/models/cart.model";
import { Cart as CartType } from "@/types";
import { calcDeliveryDateAndPrice } from "@/lib/actions/order.actions";
import {
  withHeaderValidation,
  createSuccessResponse,
  createErrorResponse,
} from "@/lib/api-wrapper";

export const GET = withHeaderValidation(async () => {
  try {
    await connectToDatabase();
    const session = await auth();
    if (!session?.user?.id) {
      return createSuccessResponse(null);
    }
    const doc = await Cart.findOne({ user: session.user.id });
    return createSuccessResponse(doc);
  } catch (e) {
    return createErrorResponse("Failed to load cart", 500);
  }
});

export const PUT = withHeaderValidation(async (req: NextRequest) => {
  try {
    await connectToDatabase();
    const session = await auth();
    if (!session?.user?.id) {
      return createErrorResponse("Unauthorized", 401);
    }

    const body = (await req.json()) as CartType;
    const recomputed = calcDeliveryDateAndPrice({
      items: body.items,
      shippingAddress: body.shippingAddress,
      deliveryDateIndex: body.deliveryDateIndex,
    });

    const payload = {
      user: session.user.id,
      // include any optional per-item fields like note
      items: body.items,
      itemsPrice: recomputed.itemsPrice,
      taxPrice: recomputed.taxPrice,
      shippingPrice: recomputed.shippingPrice,
      totalPrice: recomputed.totalPrice,
      paymentMethod: body.paymentMethod,
      shippingAddress: body.shippingAddress,
      deliveryDateIndex: recomputed.deliveryDateIndex,
      expectedDeliveryDate: undefined,
    };

    const doc = await Cart.findOneAndUpdate(
      { user: session.user.id },
      payload,
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    return createSuccessResponse(doc);
  } catch (e) {
    return createErrorResponse("Failed to save cart", 500);
  }
});
