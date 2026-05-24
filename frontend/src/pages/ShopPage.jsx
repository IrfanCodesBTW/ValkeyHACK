import React from "react";
import DemoLayout from "../components/demo/DemoLayout";
import { PageHeader } from "../components/demo/DemoUi";
import ShopSection from "../components/ShopSection";

const ShopPage = () => (
  <DemoLayout>
    <div className="demo-shell">
      <PageHeader eyebrow="Catalog" title="Shop the live Valkey catalog">
        Compare products by category, budget, rating, and shopper intent.
      </PageHeader>
    </div>
    <ShopSection />
  </DemoLayout>
);

export default ShopPage;
