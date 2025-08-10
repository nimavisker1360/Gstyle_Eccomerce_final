import {
  Body,
  Column,
  Container,
  Head,
  Heading,
  Html,
  Img,
  Preview,
  Row,
  Section,
  Tailwind,
  Text,
} from "@react-email/components";
import { convertTRYToRial, formatRial, formatDateTime } from "@/lib/utils";

type SupportCheckoutEmailProps = {
  payload: {
    items: Array<{
      name: string;
      image: string;
      quantity: number;
      price: number;
      color?: string;
      size?: string;
    }>;
    itemsPrice: number;
    shippingPrice?: number;
    taxPrice?: number;
    totalPrice: number;
    paymentMethod?: string;
    shippingAddress?: {
      fullName?: string;
      phone?: string;
    };
    expectedDeliveryDate?: string | Date | null;
  };
};

const safeRial = (tryAmount?: number | null) => {
  if (
    tryAmount === undefined ||
    tryAmount === null ||
    Number.isNaN(tryAmount)
  ) {
    return formatRial(0);
  }
  return formatRial(convertTRYToRial(tryAmount));
};

export default function SupportCheckoutEmail({
  payload,
}: SupportCheckoutEmailProps) {
  const {
    items = [],
    itemsPrice = 0,
    shippingPrice,
    taxPrice,
    totalPrice = 0,
    paymentMethod,
    shippingAddress,
    expectedDeliveryDate,
  } = payload || ({} as any);

  return (
    <Html>
      <Preview>Checkout details sent by customer</Preview>
      <Tailwind>
        <Head />
        <Body className="font-sans bg-white">
          <Container className="max-w-xl">
            <Heading>Checkout Support Request</Heading>

            <Section className="mb-4">
              <Text className="m-0">
                Payment method: {paymentMethod || "-"}
              </Text>
              {expectedDeliveryDate ? (
                <Text className="m-0">
                  Expected delivery:{" "}
                  {
                    formatDateTime(new Date(expectedDeliveryDate as any))
                      .dateOnly
                  }
                </Text>
              ) : null}
            </Section>

            {shippingAddress ? (
              <Section className="border border-solid border-gray-300 rounded-md p-3 mb-4">
                <Text className="font-semibold">Shipping address</Text>
                <Text className="m-0">
                  Name: {shippingAddress.fullName || "-"}
                </Text>
                <Text className="m-0">
                  Phone: {shippingAddress.phone || "-"}
                </Text>
              </Section>
            ) : null}

            <Section className="border border-solid border-gray-300 rounded-md p-3 mb-4">
              {items.map((item, i) => (
                <Row key={`${item.name}-${i}`} className="py-2">
                  <Column className="w-16">
                    {item?.image ? (
                      <Img
                        width="48"
                        height="48"
                        alt={item.name}
                        className="rounded"
                        src={item.image}
                      />
                    ) : null}
                  </Column>
                  <Column>
                    <Text className="m-0">
                      {item.name}
                      {item.color ? `, ${item.color}` : ""}
                      {item.size ? `, ${item.size}` : ""} x {item.quantity}
                    </Text>
                  </Column>
                  <Column align="right">
                    <Text className="m-0">{safeRial(item.price)}</Text>
                  </Column>
                </Row>
              ))}

              {[
                { name: "Items", price: itemsPrice },
                { name: "Tax", price: taxPrice },
                { name: "Shipping", price: shippingPrice },
                { name: "Total", price: totalPrice },
              ].map(({ name, price }) => (
                <Row key={name} className="py-1">
                  <Column align="right">{name}:</Column>
                  <Column align="right" width={140} className="align-top">
                    <Text className="m-0">{safeRial(price ?? 0)}</Text>
                  </Column>
                </Row>
              ))}
            </Section>
          </Container>
        </Body>
      </Tailwind>
    </Html>
  );
}
