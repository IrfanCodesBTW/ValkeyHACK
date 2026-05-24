import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, formatPrice } from "../api/client";

const CartSection = () => {
  const [cart, setCart] = useState({ items: [], subtotal: 0, discount: 0, total: 0 });
  const [coupon, setCoupon] = useState("VALKEY10");
  const [message, setMessage] = useState("");

  const load = () => api.cart().then(setCart).catch((error) => setMessage(error.message));
  useEffect(() => { load(); }, []);

  const update = async (productId, quantity) => {
    setMessage("");
    await api.updateCartItem(productId, { quantity });
    load();
  };

  const remove = async (productId) => {
    await api.removeCartItem(productId);
    load();
  };

  const applyCoupon = async (event) => {
    event.preventDefault();
    setMessage("");
    try {
      setCart(await api.applyCoupon(coupon));
    } catch (error) {
      setMessage(error.message);
    }
  };

  return (
    <section className="cart py-80">
      <div className="container container-lg">
        {message && <div className="alert alert-warning">{message}</div>}
        <div className="row gy-4">
          <div className="col-xl-9 col-lg-8">
            <div className="cart-table border border-gray-100 rounded-8 px-24 py-32">
              <div className="overflow-x-auto">
                <table className="table style-three">
                  <thead>
                    <tr><th>Product</th><th>Price</th><th>Quantity</th><th>Subtotal</th><th /></tr>
                  </thead>
                  <tbody>
                    {cart.items.map((item) => (
                      <tr key={item.productId}>
                        <td>
                          <div className="table-product d-flex align-items-center gap-16">
                            <Link to={`/product-details/${encodeURIComponent(item.productId)}`} className="table-product__thumb border border-gray-100 rounded-8 flex-center">
                              <img src={item.product.image} alt={item.product.name} />
                            </Link>
                            <div><h6 className="text-md mb-4">{item.product.name}</h6><span className="text-gray-500">{item.product.brand}</span></div>
                          </div>
                        </td>
                        <td>{formatPrice(item.unitPrice)}</td>
                        <td>
                          <div className="d-flex rounded-4 overflow-hidden">
                            <button className="quantity__minus border h-40 w-40" onClick={() => update(item.productId, Math.max(1, item.quantity - 1))}>-</button>
                            <input className="quantity__input border text-center w-48" readOnly value={item.quantity} />
                            <button className="quantity__plus border h-40 w-40" onClick={() => update(item.productId, item.quantity + 1)}>+</button>
                          </div>
                        </td>
                        <td>{formatPrice(item.subtotal)}</td>
                        <td><button className="btn text-danger-600" onClick={() => remove(item.productId)}><i className="ph ph-x-circle" /></button></td>
                      </tr>
                    ))}
                    {!cart.items.length && <tr><td colSpan="5" className="text-center py-40">Your cart is empty.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
          <div className="col-xl-3 col-lg-4">
            <div className="cart-sidebar border border-gray-100 rounded-8 p-24">
              <h6 className="text-xl mb-24">Cart Totals</h6>
              <div className="flex-between mb-16"><span>Subtotal</span><strong>{formatPrice(cart.subtotal)}</strong></div>
              <div className="flex-between mb-16"><span>Discount</span><strong>{formatPrice(cart.discount)}</strong></div>
              {cart.coupon && <div className="mb-16 text-main-600">Coupon {cart.coupon.code} applied</div>}
              <div className="flex-between border-top pt-16 mb-24"><span>Total</span><strong>{formatPrice(cart.total)}</strong></div>
              <form onSubmit={applyCoupon} className="d-flex gap-8 mb-16">
                <input className="common-input" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
                <button className="btn btn-main" type="submit">Apply</button>
              </form>
              <Link to="/checkout" className="btn btn-main w-100">Proceed to checkout</Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default CartSection;
