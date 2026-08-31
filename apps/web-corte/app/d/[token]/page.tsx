import { DeliveryClient } from "./DeliveryClient";

export default function DeliveryPage({ params }: { params: { token: string } }) {
  return <DeliveryClient token={params.token} />;
}
