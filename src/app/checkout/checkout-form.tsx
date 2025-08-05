"use client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  calculateFutureDate,
  formatDateTime,
  timeUntilMidnight,
} from "@/lib/utils";
import { ShippingAddressSchema } from "@/lib/validator";
import { zodResolver } from "@hookform/resolvers/zod";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { SubmitHandler, useForm } from "react-hook-form";
import CheckoutFooter from "./checkout-footer";
import { ShippingAddress } from "@/types";
import useIsMounted from "@/hooks/use-is-mounted";
import Link from "next/link";
import useCartStore from "@/hooks/use-cart-store";
import ProductPrice from "@/components/shared/product/product-price";
import {
  APP_NAME,
  AVAILABLE_DELIVERY_DATES,
  AVAILABLE_PAYMENT_METHODS,
  DEFAULT_PAYMENT_METHOD,
} from "@/lib/constants";
import { toast } from "@/hooks/use-toast";
import { createOrder } from "@/lib/actions/order.actions";

const shippingAddressDefaultValues =
  process.env.NODE_ENV === "development"
    ? {
        fullName: "Basir",
        street: "1911, 65 Sherbrooke Est",
        city: "Montreal",
        province: "Quebec",
        phone: "4181234567",
        postalCode: "H2X 1C4",
        country: "Canada",
      }
    : {
        fullName: "",
        street: "",
        city: "",
        province: "",
        phone: "",
        postalCode: "",
        country: "",
      };

const CheckoutForm = () => {
  const router = useRouter();

  const {
    cart: {
      items,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
      shippingAddress,
      deliveryDateIndex,
      paymentMethod = DEFAULT_PAYMENT_METHOD,
    },
    setShippingAddress,
    setPaymentMethod,
    updateItem,
    removeItem,
    setDeliveryDateIndex,
    clearCart,
  } = useCartStore();
  const isMounted = useIsMounted();

  const shippingAddressForm = useForm<ShippingAddress>({
    resolver: zodResolver(ShippingAddressSchema),
    defaultValues: shippingAddress || shippingAddressDefaultValues,
  });
  const onSubmitShippingAddress: SubmitHandler<ShippingAddress> = (values) => {
    setShippingAddress(values);
    setIsAddressSelected(true);
  };

  useEffect(() => {
    if (!isMounted || !shippingAddress) return;
    shippingAddressForm.setValue("fullName", shippingAddress.fullName);
    shippingAddressForm.setValue("street", shippingAddress.street);
    shippingAddressForm.setValue("city", shippingAddress.city);
    shippingAddressForm.setValue("country", shippingAddress.country);
    shippingAddressForm.setValue("postalCode", shippingAddress.postalCode);
    shippingAddressForm.setValue("province", shippingAddress.province);
    shippingAddressForm.setValue("phone", shippingAddress.phone);
  }, [items, isMounted, router, shippingAddress, shippingAddressForm]);

  const [isAddressSelected, setIsAddressSelected] = useState<boolean>(false);
  const [isPaymentMethodSelected, setIsPaymentMethodSelected] =
    useState<boolean>(false);
  const [isDeliveryDateSelected, setIsDeliveryDateSelected] =
    useState<boolean>(false);

  const handlePlaceOrder = async () => {
    // TODO: place order
    const res = await createOrder({
      items,
      shippingAddress,
      expectedDeliveryDate: calculateFutureDate(
        AVAILABLE_DELIVERY_DATES[deliveryDateIndex!].daysToDeliver
      ),
      deliveryDateIndex,
      paymentMethod,
      itemsPrice,
      shippingPrice,
      taxPrice,
      totalPrice,
    });
    if (!res.success) {
      toast({
        description: res.message,
        variant: "destructive",
      });
    } else {
      toast({
        description: res.message,
        variant: "default",
      });
      clearCart();
      router.push(`/checkout/${res.data?.orderId}`);
    }
  };
  const handleSelectPaymentMethod = () => {
    setIsAddressSelected(true);
    setIsPaymentMethodSelected(true);
  };
  const handleSelectShippingAddress = () => {
    shippingAddressForm.handleSubmit(onSubmitShippingAddress)();
  };
  const CheckoutSummary = () => (
    <Card>
      <CardContent className="p-4">
        {!isAddressSelected && (
          <div className="border-b mb-4">
            <Button
              className="rounded-full w-full"
              onClick={handleSelectShippingAddress}
            >
              ارسال به این آدرس
            </Button>
            <p className="text-xs text-center py-2">
              آدرس ارسال و روش پرداخت را انتخاب کنید تا هزینه ارسال، دستمزد و مالیات محاسبه شود.
            </p>
          </div>
        )}
        {isAddressSelected && !isPaymentMethodSelected && (
          <div className=" mb-4">
            <Button
              className="rounded-full w-full"
              onClick={handleSelectPaymentMethod}
            >
              استفاده از این روش پرداخت
            </Button>

            <p className="text-xs text-center py-2">
              روش پرداخت را انتخاب کنید تا ادامه دهید. هنوز فرصت بررسی و ویرایش سفارش خود را قبل از نهایی شدن خواهید داشت.
            </p>
          </div>
        )}
        {isPaymentMethodSelected && isAddressSelected && (
          <div>
            <Button onClick={handlePlaceOrder} className="rounded-full w-full">
              ثبت سفارش
            </Button>
            <p className="text-xs text-center py-2">
              با ثبت سفارش، شما با <Link href="/page/privacy-policy">حریم خصوصی</Link> و
              <Link href="/page/conditions-of-use"> شرایط استفاده</Link> {APP_NAME} موافقت می‌کنید.
            </p>
          </div>
        )}

        <div>
          <div className="text-lg font-bold">خلاصه سفارش</div>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span>محصولات:</span>
              <span>
                <ProductPrice price={itemsPrice} plain />
              </span>
            </div>
            <div className="flex justify-between">
              <span>ارسال و دستمزد:</span>
              <span>
                {shippingPrice === undefined ? (
                  "--"
                ) : shippingPrice === 0 ? (
                  "رایگان"
                ) : (
                  <ProductPrice price={shippingPrice} plain />
                )}
              </span>
            </div>
            <div className="flex justify-between">
              <span> مالیات:</span>
              <span>
                {taxPrice === undefined ? (
                  "--"
                ) : (
                  <ProductPrice price={taxPrice} plain />
                )}
              </span>
            </div>
            <div className="flex justify-between  pt-4 font-bold text-lg">
              <span> جمع کل سفارش:</span>
              <span>
                <ProductPrice price={totalPrice} plain />
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <main className="max-w-6xl mx-auto highlight-link">
      <div className="grid md:grid-cols-4 gap-6">
        <div className="md:col-span-3">
          {/* shipping address */}
          <div>
            {isAddressSelected && shippingAddress ? (
              <div className="grid grid-cols-1 md:grid-cols-12    my-3  pb-3">
                <div className="col-span-5 flex text-lg font-bold ">
                  <span className="w-8">۱ </span>
                  <span>آدرس ارسال</span>
                </div>
                <div className="col-span-5 ">
                  <p>
                    {shippingAddress.fullName} <br />
                    {shippingAddress.street} <br />
                    {`${shippingAddress.city}, ${shippingAddress.province}, ${shippingAddress.postalCode}, ${shippingAddress.country}`}
                  </p>
                </div>
                <div className="col-span-2">
                  <Button
                    variant={"outline"}
                    onClick={() => {
                      setIsAddressSelected(false);
                      setIsPaymentMethodSelected(true);
                      setIsDeliveryDateSelected(true);
                    }}
                  >
                    تغییر
                  </Button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex text-primary text-lg font-bold my-2">
                  <span className="w-8">۱ </span>
                  <span>وارد کردن آدرس ارسال</span>
                </div>
                <Form {...shippingAddressForm}>
                  <form
                    method="post"
                    onSubmit={shippingAddressForm.handleSubmit(
                      onSubmitShippingAddress
                    )}
                    className="space-y-4"
                  >
                    <Card className="md:ml-8 my-4">
                      <CardContent className="p-4 space-y-2">
                        <div className="text-lg font-bold mb-2">
                          آدرس شما
                        </div>

                        <div className="flex flex-col gap-5 md:flex-row">
                          <FormField
                            control={shippingAddressForm.control}
                            name="fullName"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>نام کامل</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="نام کامل را وارد کنید"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div>
                          <FormField
                            control={shippingAddressForm.control}
                            name="street"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>آدرس</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="آدرس را وارد کنید"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex flex-col gap-5 md:flex-row">
                          <FormField
                            control={shippingAddressForm.control}
                            name="city"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>شهر</FormLabel>
                                <FormControl>
                                  <Input placeholder="شهر را وارد کنید" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shippingAddressForm.control}
                            name="province"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>استان</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="استان را وارد کنید"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shippingAddressForm.control}
                            name="country"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>کشور</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="کشور را وارد کنید"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <div className="flex flex-col gap-5 md:flex-row">
                          <FormField
                            control={shippingAddressForm.control}
                            name="postalCode"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>کد پستی</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="کد پستی را وارد کنید"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          <FormField
                            control={shippingAddressForm.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem className="w-full">
                                <FormLabel>شماره تلفن</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="شماره تلفن را وارد کنید"
                                    {...field}
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      </CardContent>
                      <CardFooter className="  p-4">
                        <Button
                          type="submit"
                          className="rounded-full font-bold"
                        >
                          ارسال به این آدرس
                        </Button>
                      </CardFooter>
                    </Card>
                  </form>
                </Form>
              </>
            )}
          </div>
          {/* payment method */}
          <div className="border-y">
            {isPaymentMethodSelected && paymentMethod ? (
              <div className="grid  grid-cols-1 md:grid-cols-12  my-3 pb-3">
                <div className="flex text-lg font-bold  col-span-5">
                  <span className="w-8">۲ </span>
                  <span>روش پرداخت</span>
                </div>
                <div className="col-span-5 ">
                  <p>{paymentMethod}</p>
                </div>
                <div className="col-span-2">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setIsPaymentMethodSelected(false);
                      if (paymentMethod) setIsDeliveryDateSelected(true);
                    }}
                  >
                    تغییر
                  </Button>
                </div>
              </div>
            ) : isAddressSelected ? (
              <>
                <div className="flex text-primary text-lg font-bold my-2">
                  <span className="w-8">۲ </span>
                  <span>انتخاب روش پرداخت</span>
                </div>
                <Card className="md:ml-8 my-4">
                  <CardContent className="p-4">
                    <RadioGroup
                      value={paymentMethod}
                      onValueChange={(value) => setPaymentMethod(value)}
                    >
                      {AVAILABLE_PAYMENT_METHODS.map((pm) => (
                        <div key={pm.name} className="flex items-center py-1 ">
                          <RadioGroupItem
                            value={pm.name}
                            id={`payment-${pm.name}`}
                          />
                          <Label
                            className="font-bold pl-2 cursor-pointer"
                            htmlFor={`payment-${pm.name}`}
                          >
                            {pm.name}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </CardContent>
                  <CardFooter className="p-4">
                    <Button
                      onClick={handleSelectPaymentMethod}
                      className="rounded-full font-bold"
                    >
                      استفاده از این روش پرداخت
                    </Button>
                  </CardFooter>
                </Card>
              </>
            ) : (
              <div className="flex text-muted-foreground text-lg font-bold my-4 py-3">
                <span className="w-8">۲ </span>
                <span>انتخاب روش پرداخت</span>
              </div>
            )}
          </div>
          {/* items and delivery date */}
          <div>
            {isDeliveryDateSelected && deliveryDateIndex != undefined ? (
              <div className="grid  grid-cols-1 md:grid-cols-12  my-3 pb-3">
                <div className="flex text-lg font-bold  col-span-5">
                  <span className="w-8">۳ </span>
                  <span>محصولات و ارسال</span>
                </div>
                <div className="col-span-5">
                  <p>
                    تاریخ تحویل:{" "}
                    {
                      formatDateTime(
                        calculateFutureDate(
                          AVAILABLE_DELIVERY_DATES[deliveryDateIndex]
                            .daysToDeliver
                        )
                      ).dateOnly
                    }
                  </p>
                  <ul>
                    {items.map((item, _index) => (
                      <li key={_index}>
                        {item.name} x {item.quantity} = {item.price}
                      </li>
                    ))}
                  </ul>
                </div>
                <div className="col-span-2">
                  <Button
                    variant={"outline"}
                    onClick={() => {
                      setIsPaymentMethodSelected(true);
                      setIsDeliveryDateSelected(false);
                    }}
                  >
                    تغییر
                  </Button>
                </div>
              </div>
            ) : isPaymentMethodSelected && isAddressSelected ? (
              <>
                <div className="flex text-primary  text-lg font-bold my-2">
                  <span className="w-8">۳ </span>
                  <span>بررسی محصولات و ارسال</span>
                </div>
                <Card className="md:ml-8">
                  <CardContent className="p-4">
                    <p className="mb-2">
                      <span className="text-lg font-bold text-green-700">
                        تحویل در{" "}
                        {
                          formatDateTime(
                            calculateFutureDate(
                              AVAILABLE_DELIVERY_DATES[deliveryDateIndex!]
                                .daysToDeliver
                            )
                          ).dateOnly
                        }
                      </span>{" "}
                      اگر در {timeUntilMidnight().hours} ساعت و {timeUntilMidnight().minutes} دقیقه آینده سفارش دهید.
                    </p>
                    <div className="grid md:grid-cols-2 gap-6">
                      <div>
                        {items.map((item, _index) => (
                          <div key={_index} className="flex gap-4 py-2">
                            <div className="relative w-16 h-16">
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="20vw"
                                style={{
                                  objectFit: "contain",
                                }}
                              />
                            </div>

                            <div className="flex-1">
                              <p className="font-semibold">
                                {item.name}, {item.color}, {item.size}
                              </p>
                              <p className="font-bold">
                                <ProductPrice price={item.price} plain />
                              </p>

                              <Select
                                value={item.quantity.toString()}
                                onValueChange={(value) => {
                                  if (value === "0") removeItem(item);
                                  else updateItem(item, Number(value));
                                }}
                              >
                                <SelectTrigger className="w-24">
                                  <SelectValue>
                                    تعداد: {item.quantity}
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent position="popper">
                                  {Array.from({
                                    length: item.countInStock,
                                  }).map((_, i) => (
                                    <SelectItem key={i + 1} value={`${i + 1}`}>
                                      {i + 1}
                                    </SelectItem>
                                  ))}
                                  <SelectItem key="delete" value="0">
                                    حذف
                                  </SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>
                        ))}
                      </div>
                      <div>
                        <div className=" font-bold">
                          <p className="mb-2"> سرعت ارسال را انتخاب کنید:</p>

                          <ul>
                            <RadioGroup
                              value={
                                AVAILABLE_DELIVERY_DATES[deliveryDateIndex!]
                                  .name
                              }
                              onValueChange={(value) =>
                                setDeliveryDateIndex(
                                  AVAILABLE_DELIVERY_DATES.findIndex(
                                    (address) => address.name === value
                                  )!
                                )
                              }
                            >
                              {AVAILABLE_DELIVERY_DATES.map((dd) => (
                                <div key={dd.name} className="flex">
                                  <RadioGroupItem
                                    value={dd.name}
                                    id={`address-${dd.name}`}
                                  />
                                  <Label
                                    className="pl-2 space-y-2 cursor-pointer"
                                    htmlFor={`address-${dd.name}`}
                                  >
                                    <div className="text-green-700 font-semibold">
                                      {
                                        formatDateTime(
                                          calculateFutureDate(dd.daysToDeliver)
                                        ).dateOnly
                                      }
                                    </div>
                                    <div>
                                      {(dd.freeShippingMinPrice > 0 &&
                                      itemsPrice >= dd.freeShippingMinPrice
                                        ? 0
                                        : dd.shippingPrice) === 0 ? (
                                        "ارسال رایگان"
                                      ) : (
                                        <ProductPrice
                                          price={dd.shippingPrice}
                                          plain
                                        />
                                      )}
                                    </div>
                                  </Label>
                                </div>
                              ))}
                            </RadioGroup>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="flex text-muted-foreground text-lg font-bold my-4 py-3">
                <span className="w-8">۳ </span>
                <span>محصولات و ارسال</span>
              </div>
            )}
          </div>
          {isPaymentMethodSelected && isAddressSelected && (
            <div className="mt-6">
              <div className="block md:hidden">
                <CheckoutSummary />
              </div>

              <Card className="hidden md:block ">
                <CardContent className="p-4 flex flex-col md:flex-row justify-between items-center gap-3">
                  <Button onClick={handlePlaceOrder} className="rounded-full">
                    ثبت سفارش
                  </Button>
                  <div className="flex-1">
                    <p className="font-bold text-lg">
                      جمع کل سفارش: <ProductPrice price={totalPrice} plain />
                    </p>
                    <p className="text-xs">
                      {" "}
                      با ثبت سفارش، شما با {APP_NAME}&apos;s{" "}
                      <Link href="/page/privacy-policy">حریم خصوصی</Link>{" "}
                      و
                      <Link href="/page/conditions-of-use">
                        {" "}
                        شرایط استفاده
                      </Link>
                      موافقت می‌کنید.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <CheckoutFooter />
        </div>
        <div className="hidden md:block">
          <CheckoutSummary />
        </div>
      </div>
    </main>
  );
};
export default CheckoutForm;
