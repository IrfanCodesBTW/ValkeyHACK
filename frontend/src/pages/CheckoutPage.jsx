import React from "react";
import DemoLayout from "../components/demo/DemoLayout";
import { PageHeader } from "../components/demo/DemoUi";
import Checkout from "../components/Checkout";

const CheckoutPage = () => (
  <DemoLayout>
    <div className="demo-shell">
      <PageHeader eyebrow="Checkout" title="Confirm shipping and place the order">
        Review your order total before completing the purchase.
      </PageHeader>
    </div>
    <Checkout />
  </DemoLayout>
);

export default CheckoutPage;
