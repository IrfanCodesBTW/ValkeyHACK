import React from "react";
import DemoLayout from "../components/demo/DemoLayout";
import { PageHeader } from "../components/demo/DemoUi";
import Account from "../components/Account";

const AccountPage = () => (
  <DemoLayout>
    <div className="demo-shell">
      <PageHeader eyebrow="Account" title="Sign in for cart and checkout">
        Use the demo shopper or create a fresh customer account.
      </PageHeader>
    </div>
    <Account />
  </DemoLayout>
);

export default AccountPage;
