import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";

const Checkout = () => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, discount: 0, total: 0 });
  const [address, setAddress] = useState({ name: "Demo Shopper", phone: "9999999999", street: "MG Road", city: "Hyderabad", postalCode: "500001" });
  const [message, setMessage] = useState("");
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.cart().then(setCart).catch((error) => setMessage(error.message));
  }, []);

  const placeOrder = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      const idempotencyKey = window.crypto?.randomUUID ? window.crypto.randomUUID() : String(Date.now());
      const created = await api.checkout({ shippingAddress: address }, idempotencyKey);
      setOrder(created);
      setCart({ items: [], subtotal: 0, discount: 0, total: 0 });
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="checkout py-80">
      <div className="container container-lg">
        {message && <div className="alert alert-warning">{message}</div>}
        {order && (
          <div className="alert alert-success">
            Order {order.id} confirmed for {formatPrice(order.total)}.
          </div>
        )}
        <div className="row">
          <div className="col-xl-8 col-lg-7">
            <form onSubmit={placeOrder} className="pe-xl-5">
              <div className="row gy-3">
                {Object.entries(address).map(([key, value]) => (
                  <div className="col-sm-6" key={key}>
                    <input className="common-input border-gray-100" value={value} placeholder={key} onChange={(e) => setAddress({ ...address, [key]: e.target.value })} />
                  </div>
                ))}
              </div>
              <button className="btn btn-main mt-32" disabled={!cart.items.length} type="submit">Place Order</button>
            </form>
          </div>
          <div className="col-xl-4 col-lg-5">
            <div className="border border-gray-100 rounded-8 px-24 py-32">
              <h6 className="text-xl mb-24">Your Order</h6>
              {cart.items.map((item) => (
                <div className="flex-between gap-16 mb-16" key={item.productId}>
                  <span>{item.product.name} x {item.quantity}</span>
                  <strong>{formatPrice(item.subtotal)}</strong>
                </div>
              ))}
              {!cart.items.length && <p><Link to="/shop">Add products</Link> to start checkout.</p>}
              <div className="border-top pt-24 mt-24">
                <div className="flex-between mb-12"><span>Subtotal</span><strong>{formatPrice(cart.subtotal)}</strong></div>
                <div className="flex-between mb-12"><span>Discount</span><strong>{formatPrice(cart.discount)}</strong></div>
                <div className="flex-between"><span>Total</span><strong>{formatPrice(cart.total)}</strong></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Checkout;
