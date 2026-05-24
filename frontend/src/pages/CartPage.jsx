import React from "react";
import DemoLayout from "../components/demo/DemoLayout";
import { PageHeader } from "../components/demo/DemoUi";
import CartSection from "../components/CartSection";

const CartPage = () => (
  <DemoLayout>
    <div className="demo-shell">
      <PageHeader eyebrow="Cart" title="Review your cart">
        Update quantities, apply a coupon, and continue to checkout.
      </PageHeader>
    </div>
    <CartSection />
  </DemoLayout>
);

export default CartPage;
