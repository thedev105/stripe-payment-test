import React, { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import {
  CardElement,
  useStripe,
  useElements,
} from '@stripe/react-stripe-js';

const Subscribe = () => {
  const location = useLocation();
  const [messages, _setMessages] = useState('');
  const [paymentIntent, setPaymentIntent] = useState();
  const [refund, setRefund] = useState();

  // helper for displaying status messages.
  const setMessage = (message) => {
    _setMessages(`${messages}\n\n${message}`);
  }

  // Initialize an instance of stripe.
  const stripe = useStripe();
  const elements = useElements();

  if (!stripe || !elements) {
    return '';
  }

  const handleSubmit = async (e) => {
    e.preventDefault();

    const cardElement = elements.getElement(CardElement);
    const { error, paymentIntent } = await stripe.confirmCardPayment(location.state.clientSecret, {
      payment_method: {
        card: cardElement,
      }
    });

    if (error) {
      setMessage(error.message);
      return;
    }
    setPaymentIntent(paymentIntent);
  }

  const handleRefund = async () => {
    const response = await fetch('/refund', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        paymentIntentId: paymentIntent.id
      }),
    }).then(r => r.json());

    setRefund(response.refund);
  }

  const amount = (location.state.amount || 0) / 100;

  return (
    <>
      <h1>{`Pay $${amount}`}</h1>

      <p>
        Try the successful test card: <span>4242424242424242</span>.
      </p>

      <p>
        Try the test card that requires SCA: <span>4000002500003155</span>.
      </p>

      <p>
        Use any <i>future</i> expiry date, CVC,5 digit postal code
      </p>

      <hr />

      <form onSubmit={handleSubmit}>
        <CardElement />

        <button>
          Pay
        </button>

        <div>{messages}</div>
      </form>

      {paymentIntent && (
        <div>
          <pre>{JSON.stringify(paymentIntent, null, 2)}</pre>
          <button onClick={handleRefund}>Refund</button>
          <Link to="/account">
            <button>Account</button>
          </Link>
        </div>
      )}

      {refund && (
        <div>
          <pre>{JSON.stringify(refund, null, 2)}</pre>
          <Link to="/account">
            <button>Account</button>
          </Link>
        </div>
      )}
    </>
  )
}

export default Subscribe
