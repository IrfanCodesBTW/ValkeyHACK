import React from "react";
import { Link } from "react-router-dom";
import DemoLayout from "../components/demo/DemoLayout";
import { EmptyState } from "../components/demo/DemoUi";

const NotFoundPage = () => (
  <DemoLayout>
    <section className="demo-section">
      <div className="demo-shell">
        <EmptyState
          icon="ph-compass"
          title="Page not found"
          action={
            <Link className="demo-button" to="/shop">
              Browse catalog
            </Link>
          }
        >
          The page may have moved, or the link may no longer be available.
        </EmptyState>
      </div>
    </section>
  </DemoLayout>
);

export default NotFoundPage;
