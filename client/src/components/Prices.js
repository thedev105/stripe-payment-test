import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import useDebounce from '../hooks/useDebounce';
import Price from './Price';

const Prices = () => {
  const [prices, setPrices] = useState([]);
  const [selected, setSelected] = useState();
  const [coupon, setCoupon] = useState('');
  const [couponDetail, setCouponDetail] = useState();
  const [address, setAddress] = useState({
    country: '',
    state: '',
    city: '',
    line1: '',
    postal_code: ''
  })
  const [subscriptionData, setSubscriptionData] = useState();

  const debouncedCoupon = useDebounce(coupon, 500);

  useEffect(() => {
    const fetchPrices = async () => {
      const { prices } = await fetch('/config').then(r => r.json());
      setPrices(prices);
    };
    fetchPrices();
  }, [])

  useEffect(() => {
    const fetchCoupon = async () => {
      const response = await fetch(`/coupon?coupon=${debouncedCoupon}`).then(r => r.json());
      setCouponDetail(response.coupon)
    }

    if (debouncedCoupon) {
      fetchCoupon();
    } else {
      setCouponDetail(null)
    }
  }, [debouncedCoupon])

  const selectSubscription = async (priceId) => {
    setSelected(priceId)
  }

  const handleAddressUpdate = (e) => {
    setAddress({
      ...address,
      [e.target.name]: e.target.value
    })
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    const response = await fetch('/create-subscription', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        priceId: selected,
        address,
        coupon
      }),
    }).then(r => r.json());

    setSubscriptionData(response);
  }

  return (
    <div>
      <h1>Select a plan</h1>

      <div className="price-list">
        {prices.map((price) => (
          <Price
            key={price.id}
            selected={selected === price.id}
            price={price}
            handleSelect={selectSubscription}
          />
        ))}
      </div>

      <form onSubmit={handleSubmit} id="price-form">
        <label>
          Coupon
          <input type="text" name="coupon" value={coupon} onChange={(e) => setCoupon(e.target.value)} />
          {couponDetail && (
            <small>{couponDetail.percent_off}% off</small>
          )}
        </label>
        <div className="address">
          <label>
            Line 1
            <input type="text" name="line1" value={address.line1} onChange={handleAddressUpdate} />
          </label>
          <label>
            City
            <input type="text" name="city" value={address.city} onChange={handleAddressUpdate} />
          </label>
          <label>
            State
            <input type="text" name="state" value={address.state} onChange={handleAddressUpdate} />
          </label>
        </div>
        <div className="address">
          <label>
            Country
            <input type="text" name="country" value={address.country} onChange={handleAddressUpdate} />
          </label>
          <label>
            Postal Code
            <input type="text" name="postal_code" value={address.postal_code} onChange={handleAddressUpdate} />
          </label>
        </div>

        <button disabled={!selected}>Get Price</button>
      </form>

      {subscriptionData && (
        <div>
          <pre>{JSON.stringify(subscriptionData, null, 2)}</pre>
          <Link to={{
            pathname: '/subscribe',
            state: {
              clientSecret: subscriptionData.paymentIntent?.client_secret,
              amount: subscriptionData.paymentIntent.amount
            }}}
          >
            <button>Next</button>
          </Link>
        </div>
      )}
    </div>
  );
}

export default Prices;
