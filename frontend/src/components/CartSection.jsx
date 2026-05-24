import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";
import { useAuth } from "../context/AuthContext";
import { Alert, EmptyState, SkeletonGrid } from "./demo/DemoUi";

const emptyCart = { items: [], subtotal: 0, discount: 0, total: 0 };

const CartSection = () => {
  const auth = useAuth();
  const [cart, setCart] = useState(emptyCart);
  const [coupon, setCoupon] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState("");

  const load = async () => {
    setLoading(true);
    setMessage("");
    try {
      setCart(await api.cart());
    } catch (error) {
      setMessage(error.message);
      setCart(emptyCart);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const update = async (productId, quantity) => {
    setPending(productId);
    setMessage("");
    try {
      setCart(await api.updateCartItem(productId, { quantity }));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending("");
    }
  };

  const remove = async (productId) => {
    setPending(productId);
    try {
      setCart(await api.removeCartItem(productId));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending("");
    }
  };

  const applyCoupon = async (event) => {
    event.preventDefault();
    setMessage("");
    setPending("coupon");
    try {
      setCart(await api.applyCoupon(coupon));
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending("");
    }
  };

  const removeCoupon = async () => {
    setPending("coupon");
    try {
      setCart(await api.removeCoupon());
    } catch (error) {
      setMessage(error.message);
    } finally {
      setPending("");
    }
  };

  if (!auth.user && !auth.loading && !loading) {
    return (
      <section className="demo-section">
        <div className="demo-shell">
          <EmptyState
            icon="ph-user"
            title="Sign in to view your cart"
            action={
              <Link className="demo-button" to="/account">
                Sign in
              </Link>
            }
          >
            Log in to keep shopping from the same cart.
          </EmptyState>
        </div>
      </section>
    );
  }

  return (
    <section className="demo-section">
      <div className="demo-shell">
        {message && <Alert type="warning">{message}</Alert>}
        {loading ? (
          <SkeletonGrid count={3} />
        ) : cart.items.length ? (
          <div className="demo-cart-layout">
            <div className="demo-cart-list">
              {cart.items.map((item) => {
                const stock = Number(item.product.availableStock ?? 0);
                return (
                  <article className="demo-cart-card" key={item.productId}>
                    <img src={item.product.image} alt={item.product.name} />
                    <div>
                      <h2>
                        <Link to={`/product-details/${encodeURIComponent(item.productId)}`}>{item.product.name}</Link>
                      </h2>
                      <div className="demo-muted">
                        {item.product.brand} - {formatPrice(item.unitPrice)} - {stock} available
                      </div>
                      <div className="demo-muted">Line total: {formatPrice(item.subtotal)}</div>
                    </div>
                    <div className="demo-cart-card__actions">
                      <div className="demo-qty" aria-label={`Quantity for ${item.product.name}`}>
                        <button
                          type="button"
                          aria-label="Decrease quantity"
                          disabled={pending === item.productId || item.quantity <= 1}
                          onClick={() => update(item.productId, Math.max(1, item.quantity - 1))}
                        >
                          <i className="ph ph-minus" />
                        </button>
                        <input readOnly value={item.quantity} aria-label="Quantity" />
                        <button
                          type="button"
                          aria-label="Increase quantity"
                          disabled={pending === item.productId || item.quantity >= stock}
                          onClick={() => update(item.productId, item.quantity + 1)}
                        >
                          <i className="ph ph-plus" />
                        </button>
                      </div>
                      <button className="demo-icon-button" type="button" aria-label={`Remove ${item.product.name}`} disabled={pending === item.productId} onClick={() => remove(item.productId)}>
                        <i className="ph ph-trash" />
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
            <CartSummary
              cart={cart}
              coupon={coupon}
              setCoupon={setCoupon}
              pending={pending}
              applyCoupon={applyCoupon}
              removeCoupon={removeCoupon}
            />
          </div>
        ) : (
          <EmptyState
            title="Your cart is empty"
            action={
              <Link className="demo-button" to="/shop">
                Browse products
              </Link>
            }
          >
            Add a product from the catalog to start checkout.
          </EmptyState>
        )}
      </div>
    </section>
  );
};

const CartSummary = ({ cart, coupon, setCoupon, pending, applyCoupon, removeCoupon }) => (
  <aside className="demo-summary" aria-label="Cart summary">
    <h2>Cart summary</h2>
    <div className="demo-summary__row">
      <span>Subtotal</span>
      <strong>{formatPrice(cart.subtotal)}</strong>
    </div>
    <div className="demo-summary__row">
      <span>Discount</span>
      <strong>{formatPrice(cart.discount)}</strong>
    </div>
    {cart.coupon && (
      <div className="demo-alert demo-alert--success">
        Coupon {cart.coupon.code} applied.
        <button className="demo-chip ms-8" type="button" onClick={removeCoupon} disabled={pending === "coupon"}>
          Remove
        </button>
      </div>
    )}
    <form className="demo-coupon-form" onSubmit={applyCoupon}>
      <label className="sr-only" htmlFor="coupon-code">
        Coupon code
      </label>
      <input
        id="coupon-code"
        className="demo-input"
        value={coupon}
        placeholder="VALKEY10"
        onChange={(event) => setCoupon(event.target.value)}
      />
      <button className="demo-button" type="submit" disabled={pending === "coupon"}>
        Apply
      </button>
    </form>
    <div className="demo-summary__total">
      <span>Total</span>
      <strong>{formatPrice(cart.total)}</strong>
    </div>
    <Link className={`demo-button w-100 ${cart.items.length ? "" : "disabled"}`} to="/checkout" aria-disabled={!cart.items.length}>
      Proceed to checkout
    </Link>
  </aside>
);

export default CartSection;
