import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, EmptyState, Field, SkeletonGrid } from "./demo/DemoUi";

const emptyCart = { items: [], subtotal: 0, discount: 0, total: 0 };

const Checkout = () => {
  const auth = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [address, setAddress] = useState({
    name: "Demo Shopper",
    phone: "9999999999",
    street: "MG Road",
    city: "Hyderabad",
    postalCode: "500001"
  });
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let alive = true;
    api
      .cart()
      .then((data) => {
        if (alive) setCart(data);
      })
      .catch((error) => {
        if (alive) setMessage(error.message);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  const placeOrder = async (event) => {
    event.preventDefault();
    setMessage("");
    setPending(true);
    try {
      const idempotencyKey = window.crypto?.randomUUID ? window.crypto.randomUUID() : `checkout-${Date.now()}`;
      const created = await api.checkout({ shippingAddress: address }, idempotencyKey);
      setOrder(created);
      setCart(emptyCart);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending(false);
    }
  };

  if (!auth.user && !auth.loading && !loading) {
    return (
      <section className="demo-section">
        <div className="demo-shell">
          <EmptyState
            icon="ph-user"
            title="Sign in to checkout"
            action={
              <Link className="demo-button" to="/account">
                Sign in
              </Link>
            }
          >
            Log in to review your cart and complete the order.
          </EmptyState>
        </div>
      </section>
    );
  }

  return (
    <section className="demo-section">
      <div className="demo-shell">
        {message && <Alert type="warning">{message}</Alert>}
        {order && (
          <Alert type="success">
            Order {order.id} confirmed for {formatPrice(order.total)}.
          </Alert>
        )}
        {loading ? (
          <SkeletonGrid count={3} />
        ) : order ? (
          <EmptyState
            icon="ph-check-circle"
            title="Checkout complete"
            action={
              <Link className="demo-button" to="/">
                Continue shopping
              </Link>
            }
          >
            Your order is confirmed and the cart has been cleared.
          </EmptyState>
        ) : cart.items.length ? (
          <div className="demo-checkout-layout">
            <form className="demo-panel" onSubmit={placeOrder}>
              <h2>Shipping details</h2>
              <div className="demo-form-grid">
                <Field id="shipping-name" label="Full name">
                  <input
                    id="shipping-name"
                    autoComplete="name"
                    value={address.name}
                    onChange={(event) => setAddress((value) => ({ ...value, name: event.target.value }))}
                    required
                  />
                </Field>
                <Field id="shipping-phone" label="Phone">
                  <input
                    id="shipping-phone"
                    type="tel"
                    autoComplete="tel"
                    value={address.phone}
                    onChange={(event) => setAddress((value) => ({ ...value, phone: event.target.value }))}
                    required
                  />
                </Field>
                <Field id="shipping-street" label="Street">
                  <input
                    id="shipping-street"
                    autoComplete="street-address"
                    value={address.street}
                    onChange={(event) => setAddress((value) => ({ ...value, street: event.target.value }))}
                    required
                  />
                </Field>
                <Field id="shipping-city" label="City">
                  <input
                    id="shipping-city"
                    autoComplete="address-level2"
                    value={address.city}
                    onChange={(event) => setAddress((value) => ({ ...value, city: event.target.value }))}
                    required
                  />
                </Field>
                <Field id="shipping-postal" label="Postal code">
                  <input
                    id="shipping-postal"
                    autoComplete="postal-code"
                    value={address.postalCode}
                    onChange={(event) => setAddress((value) => ({ ...value, postalCode: event.target.value }))}
                    required
                  />
                </Field>
              </div>
              <button className="demo-button mt-24" type="submit" disabled={pending}>
                <i className="ph ph-lock-key" aria-hidden="true" />
                {pending ? "Placing order" : "Place order"}
              </button>
            </form>

            <aside className="demo-summary" aria-label="Order summary">
              <h2>Order summary</h2>
              {cart.items.map((item) => (
                <div className="demo-summary__row" key={item.productId}>
                  <span>
                    {item.product.name} x {item.quantity}
                  </span>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </div>
              ))}
              <div className="demo-summary__total">
                <span>Total</span>
                <strong>{formatPrice(cart.total)}</strong>
              </div>
              {cart.discount > 0 && <div className="demo-muted">Discount applied: {formatPrice(cart.discount)}</div>}
            </aside>
          </div>
        ) : (
          <EmptyState
            title="No items ready for checkout"
            action={
              <Link className="demo-button" to="/shop">
                Browse products
              </Link>
            }
          >
            Add products to the cart before placing an order.
          </EmptyState>
        )}
      </div>
    </section>
  );
};

export default Checkout;
